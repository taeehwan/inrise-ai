import type { Express } from "express";
import { randomBytes } from "crypto";
import { hashPassword } from "../auth";
import { storage } from "../storage";

export function registerPasswordResetRoutes(app: Express) {
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || user.provider !== "local") {
        return res.json({ message: "If the email exists, a password reset link will be sent" });
      }

      await storage.cleanupExpiredTokens();

      const resetToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      console.log("🔑 Password reset token generated:", {
        email: user.email,
        token: resetToken,
        expiresAt: expiresAt.toISOString(),
      });

      res.json({
        message: "If the email exists, a password reset link will be sent",
        ...(process.env.NODE_ENV === "development" && { token: resetToken }),
      });
    } catch (error: any) {
      console.error("❌ Forgot password error:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (resetToken.expiresAt < new Date()) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ message: "Reset token has expired" });
      }

      if (resetToken.isUsed) {
        return res.status(400).json({ message: "Reset token has already been used" });
      }

      const user = await storage.getUserById(resetToken.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, { passwordHash });
      await storage.markTokenAsUsed(token);

      console.log("✅ Password reset successful:", { userId: user.id, email: user.email });
      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      console.error("❌ Reset password error:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });
}
