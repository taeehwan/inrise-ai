import type { Express } from "express";
import passport from "passport";
import bcryptjs from "bcryptjs";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { AUTH_ERROR_CODES, createAuthError, createAuthSuccess } from "../auth-errors";
import { checkLoginAttempts, recordFailedLogin, recordSuccessfulLogin } from "../rate-limiter";
import { validateLogin, validateRegister } from "../auth-validation";

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req, res, next) => {
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/auth/error",
    })(req, res, next);
  });

  app.get("/api/auth/kakao", (req, res, next) => {
    passport.authenticate("kakao")(req, res, next);
  });

  app.get("/api/auth/kakao/callback", (req, res, next) => {
    passport.authenticate("kakao", {
      successRedirect: "/",
      failureRedirect: "/auth/error",
    })(req, res, next);
  });

  app.get("/api/auth/me", async (req: any, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    if (req.isAuthenticated() && req.user) {
      req.session.touch();
      const userId = req.user.id;
      const freshUser = await storage.getUser(userId);
      if (freshUser) {
        res.json(freshUser);
      } else {
        res.json(req.user);
      }
      return;
    }

    res.status(401).json(createAuthError(AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED, "로그인이 필요합니다."));
  });

  app.get("/api/auth/session-status", async (req: any, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    if (req.isAuthenticated() && req.user) {
      const maxAge = req.session.cookie.maxAge;
      const expiresIn = maxAge ? Math.floor(maxAge / 1000) : 86400;
      req.session.touch();
      res.json(
        createAuthSuccess({
          isAuthenticated: true,
          userId: req.user.id,
          expiresIn,
          sessionRefreshed: true,
        }),
      );
      return;
    }

    res.json(
      createAuthSuccess({
        isAuthenticated: false,
        userId: null,
        expiresIn: 0,
        sessionRefreshed: false,
      }),
    );
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.logout((err: Error | null) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((destroyErr: Error | null) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully", redirect: "/" });
      });
    });
  });

  app.post("/api/auth/register", async (req: any, res) => {
    try {
      console.log("📝 Registration attempt:", { email: req.body?.email, hasPassword: !!req.body?.password });

      const validation = validateRegister(req.body);
      if (!validation.success) {
        console.log("⚠️  Registration validation failed:", validation.errors, "code:", validation.errorCode);
        const errorCodeMap: Record<string, (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]> = {
          INVALID_EMAIL_FORMAT: AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT,
          INVALID_PASSWORD_FORMAT: AUTH_ERROR_CODES.INVALID_PASSWORD_FORMAT,
          PRIVACY_CONSENT_REQUIRED: AUTH_ERROR_CODES.PRIVACY_CONSENT_REQUIRED,
          VALIDATION_ERROR: AUTH_ERROR_CODES.REGISTRATION_FAILED,
        };
        return res.status(400).json(
          createAuthError(
            errorCodeMap[validation.errorCode] || AUTH_ERROR_CODES.REGISTRATION_FAILED,
            validation.errors[0],
          ),
        );
      }

      const { email, password, firstName, lastName, username, phone, privacyConsent, marketingConsent } =
        validation.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("⚠️  Registration failed - email already exists:", email);
        return res
          .status(400)
          .json(createAuthError(AUTH_ERROR_CODES.USER_ALREADY_EXISTS, "이미 등록된 이메일입니다."));
      }

      const passwordHash = await hashPassword(password);
      console.log("🔐 Password hashed successfully");

      const user = await storage.createUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        username: username || null,
        phone: phone || null,
        privacyConsent: privacyConsent || false,
        marketingConsent: marketingConsent || false,
        provider: "local" as const,
        providerId: null,
      });
      console.log("✅ User created:", { id: user.id, email: user.email });

      req.login(user, (err: Error | null) => {
        if (err) {
          console.error("❌ Auto-login after registration failed:", err);
          return res.status(500).json(
            createAuthError(
              AUTH_ERROR_CODES.SESSION_ERROR,
              "회원가입은 완료되었지만 자동 로그인에 실패했습니다. 다시 로그인해주세요.",
            ),
          );
        }

        req.session.save((saveErr: Error | null) => {
          if (saveErr) {
            console.error("❌ Session save error after registration:", saveErr);
          }
          console.log("✅ User registered and logged in successfully");
          res.status(201).json(createAuthSuccess(user, "회원가입이 완료되었습니다."));
        });
      });
    } catch (error: any) {
      console.error("❌ Registration error:", error);
      res.status(500).json(createAuthError(AUTH_ERROR_CODES.REGISTRATION_FAILED, "회원가입에 실패했습니다. 다시 시도해주세요."));
    }
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const validation = validateLogin(req.body);
      if (!validation.success) {
        console.log("⚠️  Login validation failed:", validation.errors);
        return res
          .status(400)
          .json(createAuthError(AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT, validation.errors[0]));
      }

      const { email, password } = validation.data;
      console.log("🔐 Login attempt:", { email, timestamp: new Date().toISOString() });

      const attemptCheck = checkLoginAttempts(email);
      if (!attemptCheck.allowed) {
        console.log("🔒 Login blocked - too many attempts:", { email, retryAfter: attemptCheck.retryAfter });
        return res.status(429).json(
          createAuthError(
            AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS,
            `로그인 시도 횟수가 초과되었습니다. ${Math.ceil((attemptCheck.retryAfter || 900) / 60)}분 후에 다시 시도해주세요.`,
            { retryAfter: attemptCheck.retryAfter },
          ),
        );
      }

      const user = await storage.getUserByEmail(email);
      if (!user || user.provider !== "local" || !user.passwordHash) {
        console.log("❌ User not found or invalid provider:", { email, found: !!user });
        const failResult = recordFailedLogin(email);
        return res.status(401).json(
          createAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, "이메일 또는 비밀번호가 올바르지 않습니다.", {
            remainingAttempts: failResult.remainingAttempts,
          }),
        );
      }

      if (!user.isActive) {
        console.log("❌ User account is inactive:", email);
        return res
          .status(401)
          .json(createAuthError(AUTH_ERROR_CODES.USER_INACTIVE, "비활성화된 계정입니다. 관리자에게 문의하세요."));
      }

      console.log("👤 User found, verifying password...");
      let isValid = false;
      try {
        isValid = await bcryptjs.compare(password, user.passwordHash);
        console.log("🔬 Password verification result:", isValid);
      } catch (bcryptError) {
        console.error("❌ Bcrypt error:", bcryptError);
      }

      if (!isValid) {
        console.log("❌ Password verification failed");
        const failResult = recordFailedLogin(email);
        if (failResult.locked) {
          return res.status(429).json(
            createAuthError(
              AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS,
              `로그인 시도 횟수가 초과되었습니다. ${Math.ceil((failResult.retryAfter || 900) / 60)}분 후에 다시 시도해주세요.`,
              { retryAfter: failResult.retryAfter },
            ),
          );
        }

        return res.status(401).json(
          createAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, "이메일 또는 비밀번호가 올바르지 않습니다.", {
            remainingAttempts: failResult.remainingAttempts,
          }),
        );
      }

      console.log("✅ Password verified");
      recordSuccessfulLogin(email);
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      try {
        await storage.createUserActivity({
          userId: user.id,
          activityType: "login",
          details: { provider: "local", userAgent: req.headers["user-agent"] },
        });
      } catch (activityError) {
        console.error("Activity tracking error (non-blocking):", activityError);
      }

      req.login(user, (err: Error | null) => {
        if (err) {
          console.error("❌ Session login failed:", err);
          return res.status(500).json(createAuthError(AUTH_ERROR_CODES.SESSION_ERROR, "로그인에 실패했습니다. 다시 시도해주세요."));
        }

        req.session.save((saveErr: Error | null) => {
          if (saveErr) {
            console.error("❌ Session save error:", saveErr);
          }
          console.log("✅ Login successful:", { id: user.id, email: user.email });
          res.json(createAuthSuccess(user, "로그인되었습니다."));
        });
      });
    } catch (error: any) {
      console.error("❌ Login error:", error);
      res.status(500).json(createAuthError(AUTH_ERROR_CODES.LOGIN_FAILED, "로그인에 실패했습니다. 다시 시도해주세요."));
    }
  });
}
