import type { PasswordResetToken } from "@shared/schema";
import { passwordResetTokens as passwordResetTokensTable } from "@shared/schema";
import { eq, lt, or } from "drizzle-orm";
import { db } from "../db";

export async function createPasswordResetTokenRecord(
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<PasswordResetToken> {
  const [resetToken] = await db
    .insert(passwordResetTokensTable)
    .values({ userId, token, expiresAt, isUsed: false })
    .returning();
  console.log("🔑 Password reset token created in database:", { userId, tokenId: resetToken.id });
  return resetToken;
}

export async function getPasswordResetTokenRecord(token: string): Promise<PasswordResetToken | undefined> {
  const [resetToken] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.token, token))
    .limit(1);
  return resetToken;
}

export async function markPasswordResetTokenAsUsedRecord(token: string): Promise<void> {
  await db.update(passwordResetTokensTable).set({ isUsed: true }).where(eq(passwordResetTokensTable.token, token));
  console.log("🔑 Password reset token marked as used:", token.substring(0, 8) + "...");
}

export async function deletePasswordResetTokenRecord(token: string): Promise<void> {
  await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.token, token));
}

export async function cleanupExpiredPasswordResetTokensRecord(): Promise<void> {
  const now = new Date();
  await db
    .delete(passwordResetTokensTable)
    .where(or(lt(passwordResetTokensTable.expiresAt, now), eq(passwordResetTokensTable.isUsed, true)));
  console.log("🧹 Cleaned up expired/used password reset tokens");
}
