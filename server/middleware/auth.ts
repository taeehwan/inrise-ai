import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { User } from "@shared/schema";

// Extend Express Session to include userId
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// 인증 확인 미들웨어 (Passport.js 호환)
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Passport.js 인증 확인 (우선)
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      // Passport.js가 이미 user를 설정함
      return next();
    }
    
    // 세션에서 사용자 ID 확인 (대체 방법)
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        message: "인증이 필요합니다. 로그인 후 다시 시도해주세요.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    // 사용자 정보 조회
    const user = await storage.getUser(userId);
    
    if (!user || !user.isActive) {
      // 세션 초기화
      req.session.destroy((err) => {
        if (err) console.error("Session destruction error:", err);
      });
      
      return res.status(401).json({ 
        message: "유효하지 않은 사용자입니다. 다시 로그인해주세요.",
        code: "INVALID_USER"
      });
    }

    // 사용자 정보를 요청 객체에 추가
    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ 
      message: "인증 처리 중 오류가 발생했습니다.",
      code: "AUTHENTICATION_ERROR"
    });
  }
}

// 관리자 권한 확인 미들웨어
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // 먼저 인증 확인
    if (!req.user) {
      return res.status(401).json({ 
        message: "인증이 필요합니다.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    // 관리자 권한 확인
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        message: "관리자 권한이 필요합니다. 접근이 거부되었습니다.",
        code: "ADMIN_ACCESS_REQUIRED",
        userRole: req.user.role
      });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({ 
      message: "권한 확인 중 오류가 발생했습니다.",
      code: "AUTHORIZATION_ERROR"
    });
  }
}

// 사용자 자신의 데이터에만 접근 가능하도록 하는 미들웨어
export function requireOwnershipOrAdmin(userIdParam: string = "userId") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: "인증이 필요합니다.",
          code: "AUTHENTICATION_REQUIRED"
        });
      }

      const targetUserId = req.params[userIdParam] || req.body[userIdParam];
      
      // 관리자는 모든 데이터에 접근 가능
      if (req.user.role === "admin") {
        return next();
      }

      // 일반 사용자는 자신의 데이터에만 접근 가능
      if (req.user.id !== targetUserId) {
        return res.status(403).json({ 
          message: "자신의 데이터에만 접근할 수 있습니다.",
          code: "OWNERSHIP_REQUIRED"
        });
      }

      next();
    } catch (error) {
      console.error("Ownership authorization error:", error);
      return res.status(500).json({ 
        message: "권한 확인 중 오류가 발생했습니다.",
        code: "AUTHORIZATION_ERROR"
      });
    }
  };
}

// 선택적 인증 미들웨어 (로그인하지 않아도 되지만, 로그인한 경우 사용자 정보 추가)
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.userId;
    
    if (userId) {
      const user = await storage.getUser(userId);
      
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    // 선택적 인증에서는 에러가 발생해도 계속 진행
    next();
  }
}

// 등급 레벨 맵
const TIER_LEVELS: Record<string, number> = {
  guest: 0, light: 1, pro: 2, max: 3, master: 4
};

// 최소 등급 요구 미들웨어 (admin/master는 항상 통과)
export function requireTier(minTier: "light" | "pro" | "max") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "인증이 필요합니다.",
          code: "AUTHENTICATION_REQUIRED"
        });
      }

      const user = req.user as any;
      const userTier = user.membershipTier || "guest";
      const userLevel = TIER_LEVELS[userTier] ?? 0;
      const requiredLevel = TIER_LEVELS[minTier] ?? 1;

      // admin 역할 또는 master 등급은 항상 통과
      if (user.role === "admin" || userTier === "master") {
        return next();
      }

      // 구독 상태 확인
      if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trial") {
        return res.status(403).json({
          message: "활성 구독이 필요합니다.",
          code: "SUBSCRIPTION_REQUIRED",
          userTier,
          requiredTier: minTier
        });
      }

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          message: `이 기능은 ${minTier} 이상 등급에서 이용 가능합니다.`,
          code: "INSUFFICIENT_TIER",
          userTier,
          requiredTier: minTier
        });
      }

      next();
    } catch (error) {
      console.error("Tier authorization error:", error);
      return res.status(500).json({
        message: "권한 확인 중 오류가 발생했습니다.",
        code: "AUTHORIZATION_ERROR"
      });
    }
  };
}

// 역할 기반 접근 제어
export function requireRole(allowedRoles: ("user" | "admin")[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: "인증이 필요합니다.",
          code: "AUTHENTICATION_REQUIRED"
        });
      }

      if (!req.user.role || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: `이 기능을 사용하려면 다음 권한이 필요합니다: ${allowedRoles.join(", ")}`,
          code: "INSUFFICIENT_ROLE",
          userRole: req.user.role || "unknown",
          requiredRoles: allowedRoles
        });
      }

      next();
    } catch (error) {
      console.error("Role authorization error:", error);
      return res.status(500).json({ 
        message: "권한 확인 중 오류가 발생했습니다.",
        code: "AUTHORIZATION_ERROR"
      });
    }
  };
}