import {
  cancelSubscriptionRecord,
  createAiUsageRecord,
  createProgramRecord,
  createSuccessStoryRecord,
  deleteProgramRecord,
  deleteSuccessStoryRecord,
  getAiUsageRecord,
  getAiUsageStatsRecord,
  getProgramRecord,
  getProgramsRecord,
  getSuccessStatsRecord,
  getSuccessStoriesRecord,
  getSuccessStoryRecord,
  getUserAiUsageDetailRecord,
  getUserAiUsageStatsRecord,
  getUserProgramAccessRecord,
  grantProgramAccessRecord,
  initializeSuccessAndProgramData,
  revokeProgramAccessRecord,
  updateProgramRecord,
  updateSuccessStatsRecord,
  updateSuccessStoryRecord,
  type SuccessProgramCaches,
  type SuccessProgramMutableState,
} from "./lib/successProgramStorage";
import type { InsertAiUsage, InsertProgram, InsertSuccessStats, InsertSuccessStory, InsertUserProgramAccess, SuccessStats } from "@shared/schema";

export abstract class DelegatedStorageSuccessBase {
  protected abstract successStats: SuccessStats | null;
  protected abstract getSuccessProgramCaches(): SuccessProgramCaches;
  protected abstract getSuccessProgramState(): SuccessProgramMutableState;

  async getSuccessStories() {
    return getSuccessStoriesRecord(this.getSuccessProgramCaches());
  }

  async getSuccessStory(id: string) {
    return getSuccessStoryRecord(this.getSuccessProgramCaches(), id);
  }

  async createSuccessStory(story: InsertSuccessStory) {
    return createSuccessStoryRecord(this.getSuccessProgramCaches(), story);
  }

  async updateSuccessStory(id: string, story: Partial<InsertSuccessStory>) {
    return updateSuccessStoryRecord(this.getSuccessProgramCaches(), id, story);
  }

  async deleteSuccessStory(id: string) {
    return deleteSuccessStoryRecord(this.getSuccessProgramCaches(), id);
  }

  async getSuccessStats() {
    this.successStats = getSuccessStatsRecord(this.successStats);
    return this.successStats;
  }

  async updateSuccessStats(stats: Partial<InsertSuccessStats>) {
    this.successStats = updateSuccessStatsRecord(this.successStats, stats);
    return this.successStats;
  }

  initializeSuccessProgramData() {
    this.successStats = initializeSuccessAndProgramData(
      this.getSuccessProgramCaches(),
      this.getSuccessProgramState(),
    );
  }

  async createAiUsage(usage: InsertAiUsage) {
    return createAiUsageRecord(this.getSuccessProgramCaches(), usage);
  }

  async getAiUsage(userId: string, startDate?: Date, endDate?: Date) {
    return getAiUsageRecord(this.getSuccessProgramCaches(), userId, startDate, endDate);
  }

  async getAiUsageStats() {
    return getAiUsageStatsRecord(this.getSuccessProgramCaches());
  }

  async getUserAiUsageStats(userId: string) {
    return getUserAiUsageStatsRecord(this.getSuccessProgramCaches(), userId);
  }

  async getPrograms() {
    return getProgramsRecord(this.getSuccessProgramCaches());
  }

  async getProgram(id: string) {
    return getProgramRecord(this.getSuccessProgramCaches(), id);
  }

  async createProgram(program: InsertProgram) {
    return createProgramRecord(this.getSuccessProgramCaches(), program);
  }

  async updateProgram(id: string, program: Partial<InsertProgram>) {
    return updateProgramRecord(this.getSuccessProgramCaches(), id, program);
  }

  async deleteProgram(id: string) {
    return deleteProgramRecord(this.getSuccessProgramCaches(), id);
  }

  async revokeProgramAccess(userId: string, programId: string) {
    return revokeProgramAccessRecord(this.getSuccessProgramCaches(), userId, programId);
  }

  async grantProgramAccess(accessData: InsertUserProgramAccess) {
    return grantProgramAccessRecord(this.getSuccessProgramCaches(), accessData);
  }

  async getUserProgramAccess(userId: string) {
    return getUserProgramAccessRecord(this.getSuccessProgramCaches(), userId);
  }

  async cancelSubscription(subscriptionId: string) {
    return cancelSubscriptionRecord(this.getSuccessProgramCaches(), subscriptionId);
  }

  async getUserAiUsage(userId: string) {
    return getUserAiUsageDetailRecord(this.getSuccessProgramCaches(), userId);
  }
}
