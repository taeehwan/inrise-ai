import {
  createAchievementRecord,
  deleteAchievementRecord,
  getAchievementRecord,
  getActiveAchievementsRecord,
  getAllAchievementsRecord,
  updateAchievementRecord,
} from "./lib/achievementStorage";
import {
  cleanupExpiredPasswordResetTokensRecord,
  createPasswordResetTokenRecord,
  deletePasswordResetTokenRecord,
  getPasswordResetTokenRecord,
  markPasswordResetTokenAsUsedRecord,
} from "./lib/passwordResetStorage";
import {
  createTestProgressRecord,
  deleteTestProgressRecord,
  getTestProgressRecord,
  getUserTestProgressListRecord,
  pauseTestProgressRecord,
  resumeTestProgressRecord,
  updateTestProgressRecord,
} from "./lib/progressSurveyStorage";
import {
  clearChooseResponseTtsCacheRecord,
  getTtsAssetByHashRecord,
  saveTtsAssetRecord,
} from "./lib/ttsAssetStorage";
import type {
  InsertAchievement,
  InsertListeningTtsAsset,
  InsertTestProgress,
} from "@shared/schema";
import { DelegatedStorageSuccessBase } from "./delegatedStorageSuccessBase";

export abstract class DelegatedStorageSecurityFeatureBase extends DelegatedStorageSuccessBase {
  async getAllAchievements() {
    return getAllAchievementsRecord();
  }

  async getActiveAchievements() {
    return getActiveAchievementsRecord();
  }

  async getAchievement(id: string) {
    return getAchievementRecord(id);
  }

  async createAchievement(achievement: InsertAchievement) {
    return createAchievementRecord(achievement);
  }

  async updateAchievement(id: string, achievement: Partial<InsertAchievement>) {
    return updateAchievementRecord(id, achievement);
  }

  async deleteAchievement(id: string) {
    return deleteAchievementRecord(id);
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    return createPasswordResetTokenRecord(userId, token, expiresAt);
  }

  async getPasswordResetToken(token: string) {
    return getPasswordResetTokenRecord(token);
  }

  async markTokenAsUsed(token: string) {
    return markPasswordResetTokenAsUsedRecord(token);
  }

  async deletePasswordResetToken(token: string) {
    return deletePasswordResetTokenRecord(token);
  }

  async cleanupExpiredTokens() {
    return cleanupExpiredPasswordResetTokensRecord();
  }

  async getTestProgress(userId: string, testSetAttemptId?: string, testAttemptId?: string) {
    return getTestProgressRecord(userId, testSetAttemptId, testAttemptId);
  }

  async getUserTestProgressList(userId: string) {
    return getUserTestProgressListRecord(userId);
  }

  async createTestProgress(progress: InsertTestProgress) {
    return createTestProgressRecord(progress);
  }

  async updateTestProgress(id: string, progress: Partial<InsertTestProgress>) {
    return updateTestProgressRecord(id, progress);
  }

  async pauseTestProgress(id: string) {
    return pauseTestProgressRecord(id);
  }

  async resumeTestProgress(id: string) {
    return resumeTestProgressRecord(id);
  }

  async deleteTestProgress(id: string) {
    return deleteTestProgressRecord(id);
  }

  async getTtsAssetByHash(scriptHash: string) {
    return getTtsAssetByHashRecord(scriptHash);
  }

  async saveTtsAsset(asset: InsertListeningTtsAsset) {
    return saveTtsAssetRecord(asset);
  }

  async clearChooseResponseTtsCache() {
    return clearChooseResponseTtsCacheRecord();
  }
}
