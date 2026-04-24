import type {
  InsertPerformanceAnalytics,
  InsertTestSet,
  InsertTestSetAttempt,
  InsertTestSetComponent,
  PerformanceAnalytics,
  TestSet,
  TestSetAttempt,
  TestSetComponent,
} from "@shared/schema";
import type { TestSetPerformanceCaches } from "./lib/testSetPerformanceStorage";
import { MemStorageWritingGreBase } from "./memStorageWritingGreBase";
import {
  createPerformanceAnalyticsRecord,
  createTestSetAttemptRecord,
  createTestSetComponentRecord,
  createTestSetRecord,
  deleteTestSetComponentRecord,
  deleteTestSetRecord,
  generateAIInsightsRecord,
  getInProgressTestSetAttemptRecord,
  getLatestPerformanceAnalyticsRecord,
  getPerformanceAnalyticsRecord,
  getTestSetAttemptRecord as getTestSetAttemptDbRecord,
  getTestSetAttemptsRecord,
  getTestSetComponentsRecord,
  getTestSetRecord as getTestSetDbRecord,
  getTestSetsRecord,
  getUserScoreHistoryRecord,
  updatePerformanceAnalyticsRecord,
  updateTestSetAttemptRecord as updateTestSetAttemptDbRecord,
  updateTestSetRecord,
  updateUserPerformanceRecord,
} from "./lib/testSetPerformanceStorage";

export abstract class MemStoragePerformanceBase extends MemStorageWritingGreBase {
  protected abstract getTestSetPerformanceCaches(): TestSetPerformanceCaches;

  async getPerformanceAnalytics(userId: string): Promise<PerformanceAnalytics[]> {
    return getPerformanceAnalyticsRecord(this.getTestSetPerformanceCaches(), userId);
  }

  async createPerformanceAnalytics(analytics: InsertPerformanceAnalytics): Promise<PerformanceAnalytics> {
    return createPerformanceAnalyticsRecord(this.getTestSetPerformanceCaches(), analytics);
  }

  async updatePerformanceAnalytics(id: string, updates: Partial<PerformanceAnalytics>): Promise<PerformanceAnalytics | undefined> {
    return updatePerformanceAnalyticsRecord(this.getTestSetPerformanceCaches(), id, updates);
  }

  async getLatestPerformanceAnalytics(userId: string, examType: "toefl" | "gre"): Promise<PerformanceAnalytics | undefined> {
    return getLatestPerformanceAnalyticsRecord(this.getTestSetPerformanceCaches(), userId, examType);
  }

  async getTestSet(id: string): Promise<TestSet | undefined> {
    return getTestSetDbRecord(this.getTestSetPerformanceCaches(), id);
  }

  async getTestSets(examType?: "toefl" | "gre"): Promise<TestSet[]> {
    return getTestSetsRecord(this.getTestSetPerformanceCaches(), examType);
  }

  async createTestSet(testSet: any): Promise<TestSet> {
    return createTestSetRecord(
      this.getTestSetPerformanceCaches(),
      testSet,
      async (testId, testData) => this.saveAIGeneratedTest(testId, testData),
    );
  }

  async updateTestSet(id: string, testSet: Partial<InsertTestSet>): Promise<TestSet> {
    return updateTestSetRecord(this.getTestSetPerformanceCaches(), id, testSet);
  }

  async deleteTestSet(id: string): Promise<void> {
    return deleteTestSetRecord(this.getTestSetPerformanceCaches(), id);
  }

  async getTestSetComponents(testSetId: string): Promise<TestSetComponent[]> {
    return getTestSetComponentsRecord(this.getTestSetPerformanceCaches(), testSetId);
  }

  async createTestSetComponent(component: InsertTestSetComponent): Promise<TestSetComponent> {
    return createTestSetComponentRecord(this.getTestSetPerformanceCaches(), component);
  }

  async deleteTestSetComponent(id: string): Promise<void> {
    return deleteTestSetComponentRecord(this.getTestSetPerformanceCaches(), id);
  }

  async getTestSetAttempts(userId: string): Promise<TestSetAttempt[]> {
    return getTestSetAttemptsRecord(userId);
  }

  async getTestSetAttempt(id: string): Promise<TestSetAttempt | undefined> {
    return getTestSetAttemptDbRecord(id);
  }

  async createTestSetAttempt(attempt: InsertTestSetAttempt): Promise<TestSetAttempt> {
    return createTestSetAttemptRecord(attempt);
  }

  async updateTestSetAttempt(id: string, attempt: Partial<TestSetAttempt>): Promise<TestSetAttempt> {
    return updateTestSetAttemptDbRecord(id, attempt);
  }

  async updateUserPerformance(userId: string, performanceData: any): Promise<void> {
    return updateUserPerformanceRecord(this.getTestSetPerformanceCaches(), userId, performanceData);
  }

  async getInProgressTestSetAttempt(userId: string, testSetId: string): Promise<TestSetAttempt | undefined> {
    return getInProgressTestSetAttemptRecord(userId, testSetId);
  }

  async getUserScoreHistory(userId: string, period: "week" | "month" | "year", examType: "toefl" | "gre"): Promise<any[]> {
    return getUserScoreHistoryRecord(this.getTestSetPerformanceCaches(), userId, period, examType);
  }

  async generateAIInsights(userId: string, scoreHistory: any[], examType: "toefl" | "gre"): Promise<any> {
    return generateAIInsightsRecord(scoreHistory, examType);
  }
}
