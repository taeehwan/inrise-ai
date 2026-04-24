import {
  addCreditsRecord,
  createSavedExplanationRecord,
  createTestAuditLogRecord,
  deductCreditsRecord,
  getCreditTransactionsRecord,
  getLearningFeedbackRecord,
  getTestAuditLogsByActionRecord,
  getTestAuditLogsByTestIdRecord,
  getTestAuditLogsRecord,
  getUserCreditsRecord,
  getUserSavedExplanationsRecord,
  hasEnoughCreditsRecord,
  initializeUserCreditsRecord,
  saveLearningFeedbackRecord,
} from "./lib/accountActivityStorage";
import {
  createAnalyticsEventRecord,
  createSurveyResponseRecord,
  getActiveSurveyRecord,
  getAnalyticsEventsDailyTrendRecord,
  getAnalyticsEventsSummaryRecord,
  getSurveyStatsRecord,
  hasUserRespondedToSurveyRecord,
} from "./lib/progressSurveyStorage";
import {
  createLiveActivityRecord,
  getLiveActivitiesRecords,
  getRecentLiveActivitiesRecords,
  type ActivityAnalyticsFallbackState,
} from "./lib/activityAnalyticsStorage";
import { deleteExpiredLiveActivitiesRecord } from "./lib/liveActivityMaintenance";
import type {
  InsertAnalyticsEvent,
  InsertCreditTransaction,
  InsertLearningFeedback,
  InsertLiveActivity,
  InsertSavedExplanation,
  InsertSurveyResponse,
  InsertTestAuditLog,
} from "@shared/schema";
import { DelegatedStorageSecurityFeatureBase } from "./delegatedStorageSecurityFeatureBase";

export abstract class DelegatedStorageEngagementFeatureBase extends DelegatedStorageSecurityFeatureBase {
  protected abstract getActivityAnalyticsStores(): ActivityAnalyticsFallbackState;

  async getUserCredits(userId: string) {
    return getUserCreditsRecord(userId);
  }

  async initializeUserCredits(userId: string, initialBalance?: number) {
    return initializeUserCreditsRecord(userId, initialBalance);
  }

  async addCredits(
    userId: string,
    amount: number,
    type: "purchase" | "bonus" | "refund" | "admin_adjustment",
    description: string,
    featureType?: string,
    referenceId?: string,
  ) {
    return addCreditsRecord(
      userId,
      amount,
      type,
      description,
      featureType as InsertCreditTransaction["featureType"] ?? undefined,
      referenceId,
    );
  }

  async deductCredits(
    userId: string,
    amount: number,
    description: string,
    featureType: NonNullable<InsertCreditTransaction["featureType"]>,
    referenceId?: string,
  ) {
    return deductCreditsRecord(userId, amount, description, featureType, referenceId);
  }

  async getCreditTransactions(userId: string, limit = 20) {
    return getCreditTransactionsRecord(userId, limit);
  }

  async hasEnoughCredits(userId: string, requiredAmount: number) {
    return hasEnoughCreditsRecord(userId, requiredAmount);
  }

  async getLiveActivities(limit = 50) {
    return getLiveActivitiesRecords(this.getActivityAnalyticsStores(), limit);
  }

  async createLiveActivity(activity: InsertLiveActivity) {
    return createLiveActivityRecord(this.getActivityAnalyticsStores(), activity);
  }

  async getRecentLiveActivities(since?: Date) {
    return getRecentLiveActivitiesRecords(this.getActivityAnalyticsStores(), since);
  }

  async deleteExpiredLiveActivities() {
    return deleteExpiredLiveActivitiesRecord();
  }

  async createTestAuditLog(log: InsertTestAuditLog) {
    return createTestAuditLogRecord(log);
  }

  async getTestAuditLogs(limit = 100) {
    return getTestAuditLogsRecord(limit);
  }

  async getTestAuditLogsByTestId(testId: string) {
    return getTestAuditLogsByTestIdRecord(testId);
  }

  async getTestAuditLogsByAction(action: string) {
    return getTestAuditLogsByActionRecord(action);
  }

  async getLearningFeedback(userId: string) {
    return getLearningFeedbackRecord(userId);
  }

  async saveLearningFeedback(userId: string, feedbackData: InsertLearningFeedback["feedbackData"]) {
    return saveLearningFeedbackRecord(userId, feedbackData);
  }

  async createSavedExplanation(data: InsertSavedExplanation) {
    return createSavedExplanationRecord(data);
  }

  async getUserSavedExplanations(userId: string, options?: { section?: string; type?: string; limit?: number }) {
    return getUserSavedExplanationsRecord(userId, options);
  }

  async getActiveSurvey() {
    return getActiveSurveyRecord();
  }

  async hasUserRespondedToSurvey(surveyId: string, userId: string) {
    return hasUserRespondedToSurveyRecord(surveyId, userId);
  }

  async createSurveyResponse(data: InsertSurveyResponse) {
    return createSurveyResponseRecord(data);
  }

  async getSurveyStats(surveyId: string) {
    return getSurveyStatsRecord(surveyId);
  }

  async createAnalyticsEvent(event: InsertAnalyticsEvent) {
    return createAnalyticsEventRecord(event);
  }

  async getAnalyticsEventsSummary(days = 30) {
    return getAnalyticsEventsSummaryRecord(days);
  }

  async getAnalyticsEventsDailyTrend(days = 30) {
    return getAnalyticsEventsDailyTrendRecord(days);
  }
}
