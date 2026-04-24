import { randomUUID } from "crypto";
import {
  type DailyStats,
  type InsertDailyStats,
  type LiveActivity,
  type Payment,
  type Subscription,
  type Test,
  type UserActivity,
  type VisitorLog,
} from "@shared/schema";
import { getAnalyticsDataRecord } from "./activityAnalyticsStorage";

export type RuntimeAnalyticsCaches = {
  dailyStats: Map<string, DailyStats>;
  tests: Map<string, Test>;
  userActivity: Map<string, UserActivity>;
  visitorLogs: Map<string, VisitorLog>;
  liveActivities: Map<string, LiveActivity>;
  subscriptions: Map<string, Subscription>;
  payments: Map<string, Payment>;
};

export function getDailyStatsRecord(
  caches: RuntimeAnalyticsCaches,
  date: string,
): DailyStats | null {
  return Array.from(caches.dailyStats.values()).find((stat) => stat.date === date) || null;
}

export function createOrUpdateDailyStatsRecord(
  caches: RuntimeAnalyticsCaches,
  stats: InsertDailyStats,
): DailyStats {
  const existing = Array.from(caches.dailyStats.values()).find((stat) => stat.date === stats.date);
  if (existing) {
    const updated: DailyStats = {
      ...existing,
      ...stats,
      createdAt: existing.createdAt,
    };
    caches.dailyStats.set(existing.id, updated);
    return updated;
  }

  const id = randomUUID();
  const newStats: DailyStats = {
    id,
    date: stats.date,
    totalVisitors: stats.totalVisitors ?? null,
    uniqueVisitors: stats.uniqueVisitors ?? null,
    newSignups: stats.newSignups ?? null,
    testsCompleted: stats.testsCompleted ?? null,
    averageScore: stats.averageScore ?? null,
    createdAt: new Date(),
  };
  caches.dailyStats.set(id, newStats);
  return newStats;
}

export function getAnalyticsDataBridge(
  caches: RuntimeAnalyticsCaches,
  loaders: {
    getVisitorLogs: (startDate?: Date, endDate?: Date) => Promise<VisitorLog[]>;
    getAllUsers: () => Promise<any[]>;
    getAllAttempts: () => Promise<any[]>;
    getTests: () => Promise<any[]>;
    getAllSpeakingAttempts: () => Promise<any[]>;
    getAllWritingAttempts: () => Promise<any[]>;
    getAllUserActivities: (limit?: number, activityType?: string) => Promise<any[]>;
  },
  period: "today" | "weekly" | "monthly" = "today",
) {
  return getAnalyticsDataRecord(
    {
      userActivity: caches.userActivity,
      visitorLogs: caches.visitorLogs,
      liveActivities: caches.liveActivities,
      subscriptions: caches.subscriptions,
      payments: caches.payments,
    },
    loaders,
    period,
  );
}

function getQuestionCount(section: any): number {
  if (section.questions && Array.isArray(section.questions)) {
    return section.questions.length;
  }
  if (section.tasks && Array.isArray(section.tasks)) {
    return section.tasks.length;
  }
  if (section.passages && Array.isArray(section.passages)) {
    return section.passages.reduce(
      (count: number, passage: any) => count + (passage.questions ? passage.questions.length : 0),
      0,
    );
  }
  return 10;
}

export async function loadAIGeneratedTestsIntoCache(
  caches: RuntimeAnalyticsCaches,
  getAllAIGeneratedTests: () => Promise<any[]>,
): Promise<void> {
  try {
    console.log("🔄 Loading AI generated tests from database...");
    const aiTests = await getAllAIGeneratedTests();

    let loadedCount = 0;
    for (const testData of aiTests) {
      try {
        const testId = testData.testId || `ai-${testData.examType}-${testData.section}-${Date.now()}`;
        const compatibilityTest: Test = {
          id: testId,
          title: testData.title || `AI Generated ${testData.examType?.toUpperCase()} ${testData.section} Test`,
          description:
            testData.description ||
            `AI-generated test for ${testData.examType?.toUpperCase()} ${testData.section} practice`,
          examType: testData.examType || "toefl",
          section: testData.section || "reading",
          difficulty: testData.difficulty || "medium",
          duration: testData.timeLimit || 18,
          questionCount: getQuestionCount(testData),
          isActive: true,
          createdAt: new Date(),
        };
        caches.tests.set(testId, compatibilityTest);
        loadedCount++;
      } catch (error) {
        console.error("Error loading AI test from database:", error);
      }
    }

    console.log(`✅ Successfully loaded ${loadedCount} AI generated tests from database`);
  } catch (error) {
    console.error("❌ Failed to load AI tests from database:", error);
  }
}
