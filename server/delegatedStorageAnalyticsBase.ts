import type { InsertDailyStats, InsertUserActivity, InsertVisitorLog } from "@shared/schema";
import {
  createUserActivityRecord,
  createVisitorLogRecord,
  getActivityStatsRecord,
  getAllUserActivityRecords,
  getUserActivityRecords,
  getVisitorLogRecords,
  type ActivityAnalyticsFallbackState,
} from "./lib/activityAnalyticsStorage";
import {
  createOrUpdateDailyStatsRecord,
  getAnalyticsDataBridge,
  getDailyStatsRecord as getDailyStatsCacheRecord,
  loadAIGeneratedTestsIntoCache,
  type RuntimeAnalyticsCaches,
} from "./lib/runtimeAnalyticsStorage";
import { DelegatedStorageNewToeflBase } from "./delegatedStorageNewToeflBase";

export abstract class DelegatedStorageAnalyticsBase extends DelegatedStorageNewToeflBase {
  protected abstract getActivityAnalyticsStores(): ActivityAnalyticsFallbackState;
  protected abstract getRuntimeAnalyticsCaches(): RuntimeAnalyticsCaches;

  protected abstract getAllUsers(): Promise<unknown[]>;
  protected abstract getAllAttempts(): Promise<unknown[]>;
  protected abstract getTests(): Promise<unknown[]>;
  protected abstract getAllSpeakingAttempts(): Promise<unknown[]>;
  protected abstract getAllWritingAttempts(): Promise<unknown[]>;
  protected abstract getAllAIGeneratedTests(): Promise<unknown[]>;

  async createUserActivity(activity: InsertUserActivity) {
    const newActivity = await createUserActivityRecord(this.getActivityAnalyticsStores(), activity);
    const activityType = typeof activity.activityType === "string" ? activity.activityType : "unknown";
    const activityUserId = typeof activity.userId === "string" ? activity.userId : "unknown";
    console.log(`User activity logged to DB: ${activityType} for user ${activityUserId}`);
    return newActivity;
  }

  async getUserActivity(userId: string, startDate?: Date, endDate?: Date) {
    return getUserActivityRecords(this.getActivityAnalyticsStores(), userId, startDate, endDate);
  }

  async getAllUserActivities(limit = 100, activityType?: string) {
    return getAllUserActivityRecords(this.getActivityAnalyticsStores(), limit, activityType);
  }

  async getActivityStats() {
    const stats = await getActivityStatsRecord(this.getActivityAnalyticsStores());
    console.log(`Activity stats from DB: ${stats.totalActivities} total activities`);
    return stats;
  }

  async createVisitorLog(log: InsertVisitorLog) {
    return createVisitorLogRecord(this.getActivityAnalyticsStores(), log);
  }

  async getVisitorLogs(startDate?: Date, endDate?: Date) {
    return getVisitorLogRecords(this.getActivityAnalyticsStores(), startDate, endDate);
  }

  async getDailyStats(date: string) {
    return getDailyStatsCacheRecord(this.getRuntimeAnalyticsCaches(), date);
  }

  async createOrUpdateDailyStats(stats: InsertDailyStats) {
    return createOrUpdateDailyStatsRecord(this.getRuntimeAnalyticsCaches(), stats);
  }

  async getAnalyticsData(period: "today" | "weekly" | "monthly" = "today") {
    return getAnalyticsDataBridge(
      this.getRuntimeAnalyticsCaches(),
      {
        getVisitorLogs: this.getVisitorLogs.bind(this),
        getAllUsers: this.getAllUsers.bind(this),
        getAllAttempts: this.getAllAttempts.bind(this),
        getTests: this.getTests.bind(this),
        getAllSpeakingAttempts: this.getAllSpeakingAttempts.bind(this),
        getAllWritingAttempts: this.getAllWritingAttempts.bind(this),
        getAllUserActivities: this.getAllUserActivities.bind(this),
      },
      period,
    );
  }

  async loadAIGeneratedTestsFromDatabase() {
    return loadAIGeneratedTestsIntoCache(
      this.getRuntimeAnalyticsCaches(),
      this.getAllAIGeneratedTests.bind(this),
    );
  }
}
