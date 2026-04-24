import { randomUUID } from "crypto";
import { db } from "../db";
import {
  testSets as testSetsTable,
  testSetAttempts,
  type InsertPerformanceAnalytics,
  type InsertTestSet,
  type InsertTestSetAttempt,
  type InsertTestSetComponent,
  type PerformanceAnalytics,
  type Test,
  type TestSet,
  type TestSetAttempt,
  type TestSetComponent,
} from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";
import { asExamType } from "@shared/constants";

export type TestSetPerformanceCaches = {
  performanceAnalytics: Map<string, PerformanceAnalytics>;
  testSets: Map<string, TestSet>;
  testSetComponents: Map<string, TestSetComponent>;
  testSetAttempts: Map<string, TestSetAttempt>;
  tests: Map<string, Test>;
};

type SaveAIGeneratedTest = (testId: string, testData: any) => Promise<void>;
type TestSetInsert = typeof testSetsTable.$inferInsert;
type TestSetAttemptInsert = typeof testSetAttempts.$inferInsert;
type ExtendedTest = Test & { totalScore?: number; passingScore?: number };
type ExtendedTestSet = TestSet & { _sectionData?: unknown };

function asTestSetExamType(value: string | null | undefined): "toefl" | "gre" | "sat" {
  if (value === "gre" || value === "sat") return value;
  return "toefl";
}

function asStoredTestType(value: string | null | undefined): "toefl" | "sat" | "newToefl" | null {
  if (value === "sat" || value === "newToefl" || value === "toefl") return value;
  return null;
}

export function getPerformanceAnalyticsRecord(
  caches: TestSetPerformanceCaches,
  userId: string,
): PerformanceAnalytics[] {
  return Array.from(caches.performanceAnalytics.values())
    .filter((analytics) => analytics.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function createPerformanceAnalyticsRecord(
  caches: TestSetPerformanceCaches,
  analytics: InsertPerformanceAnalytics,
): PerformanceAnalytics {
  const id = randomUUID();
  const newAnalytics: PerformanceAnalytics = {
    ...analytics,
    id,
    examType: analytics.examType === "gre" ? "gre" : "toefl",
    targetScore: analytics.targetScore ?? null,
    totalScore: analytics.totalScore ?? null,
    sectionScores: analytics.sectionScores ?? null,
    percentile: analytics.percentile ?? null,
    strengthAreas: analytics.strengthAreas ?? null,
    improvementAreas: analytics.improvementAreas ?? null,
    studyRecommendations: analytics.studyRecommendations ?? null,
    weeklyStudyTime: analytics.weeklyStudyTime ?? null,
    studyStreak: analytics.studyStreak ?? null,
    testDate: analytics.testDate ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAnalysisDate: new Date(),
  };
  caches.performanceAnalytics.set(id, newAnalytics);
  return newAnalytics;
}

export function updatePerformanceAnalyticsRecord(
  caches: TestSetPerformanceCaches,
  id: string,
  updates: Partial<PerformanceAnalytics>,
): PerformanceAnalytics | undefined {
  const existing = caches.performanceAnalytics.get(id);
  if (!existing) return undefined;
  const updated: PerformanceAnalytics = { ...existing, ...updates, updatedAt: new Date() };
  caches.performanceAnalytics.set(id, updated);
  return updated;
}

export function getLatestPerformanceAnalyticsRecord(
  caches: TestSetPerformanceCaches,
  userId: string,
  examType: "toefl" | "gre",
): PerformanceAnalytics | undefined {
  return Array.from(caches.performanceAnalytics.values())
    .filter((analytics) => analytics.userId === userId && analytics.examType === examType)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export async function updateUserPerformanceRecord(
  caches: TestSetPerformanceCaches,
  userId: string,
  performanceData: any,
): Promise<void> {
  const existingAnalytics = getLatestPerformanceAnalyticsRecord(caches, userId, performanceData.examType);

  if (existingAnalytics) {
    updatePerformanceAnalyticsRecord(caches, existingAnalytics.id, {
      totalScore: performanceData.totalScore,
      sectionScores: performanceData.sectionScores,
      percentile: performanceData.percentile || existingAnalytics.percentile,
      studyRecommendations: performanceData.studyRecommendations || existingAnalytics.studyRecommendations,
      strengthAreas: performanceData.strengths || existingAnalytics.strengthAreas,
      improvementAreas: performanceData.weaknesses || existingAnalytics.improvementAreas,
      lastAnalysisDate: new Date(),
    });
    return;
  }

  createPerformanceAnalyticsRecord(caches, {
    userId,
    examType: performanceData.examType,
    totalScore: performanceData.totalScore,
    sectionScores: performanceData.sectionScores,
    percentile: performanceData.percentile || 50,
    strengthAreas: performanceData.strengths || [],
    improvementAreas: performanceData.weaknesses || [],
    studyRecommendations: performanceData.studyRecommendations || "",
    weeklyStudyTime: performanceData.weeklyStudyTime || 10,
    studyStreak: performanceData.studyStreak || 0,
    targetScore: performanceData.targetScore || (performanceData.examType === "toefl" ? 100 : 320),
    testDate: performanceData.testDate || new Date(),
  });
}

export async function getTestSetRecord(
  caches: TestSetPerformanceCaches,
  id: string,
): Promise<TestSet | undefined> {
  const dbResults = await db.select().from(testSetsTable).where(eq(testSetsTable.id, id));
  if (dbResults.length > 0) {
    return dbResults[0];
  }
  return caches.testSets.get(id);
}

export async function getTestSetsRecord(
  caches: TestSetPerformanceCaches,
  examType?: "toefl" | "gre",
): Promise<TestSet[]> {
  const dbResults = await db.select().from(testSetsTable).where(eq(testSetsTable.isActive, true));
  const filtered = examType ? dbResults.filter((set) => set.examType === examType) : dbResults;
  const memSets = Array.from(caches.testSets.values()).filter((set) => set.isActive);
  const memFiltered = examType ? memSets.filter((set) => set.examType === examType) : memSets;
  const combined = [...filtered];
  for (const memSet of memFiltered) {
    if (!combined.find((set) => set.id === memSet.id)) {
      combined.push(memSet);
    }
  }
  return combined;
}

function getQuestionCount(section: any): number {
  if (section.questions && Array.isArray(section.questions)) {
    return section.questions.length;
  }
  if (section.tasks && Array.isArray(section.tasks)) {
    return section.tasks.length;
  }
  if (section.passages && Array.isArray(section.passages)) {
    return section.passages.reduce((count: number, passage: any) => count + (passage.questions ? passage.questions.length : 0), 0);
  }
  return 10;
}

export async function createTestSetRecord(
  caches: TestSetPerformanceCaches,
  testSet: any,
  saveAIGeneratedTest: SaveAIGeneratedTest,
): Promise<TestSet> {
  const id = randomUUID();
  const sectionData = testSet._sectionData;
  const newTestSet: ExtendedTestSet = {
    ...testSet,
    id,
    examType: asTestSetExamType(testSet.examType),
    testType: asStoredTestType(testSet.testType),
    createdAt: new Date(),
    _sectionData: sectionData || null,
  };
  caches.testSets.set(id, newTestSet);

  if (sectionData) {
    const testId = `ai-${testSet.examType}-${sectionData.type}-${id}`;
    const compatibilityTest: ExtendedTest = {
      id: testId,
      title: testSet.title,
      description: testSet.description,
      examType: asTestSetExamType(testSet.examType),
      section: sectionData.type,
      difficulty: "medium",
      duration: sectionData.timeLimit || 18,
      questionCount: getQuestionCount(sectionData),
      totalScore: 30,
      passingScore: 20,
      isActive: true,
      createdAt: new Date(),
    };
    caches.tests.set(testId, compatibilityTest);

    try {
      await saveAIGeneratedTest(testId, {
        examType: testSet.examType,
        section: sectionData.type,
        title: testSet.title,
        description: testSet.description,
        difficulty: "medium",
        ...sectionData,
        testId,
      });
      console.log(`✓ AI test permanently saved to database: ${testId}`);
    } catch (error) {
      console.error(`✗ Failed to save AI test to database: ${testId}`, error);
    }
  }

  return newTestSet;
}

export function updateTestSetRecord(
  caches: TestSetPerformanceCaches,
  id: string,
  testSet: Partial<InsertTestSet>,
): TestSet {
  const existing = caches.testSets.get(id);
  if (!existing) throw new Error(`Test set with id ${id} not found`);
  const updated: TestSet = {
    ...existing,
    ...testSet,
    examType: testSet.examType ? asTestSetExamType(testSet.examType) : existing.examType,
    testType: "testType" in testSet ? asStoredTestType(testSet.testType ?? null) : existing.testType,
  };
  caches.testSets.set(id, updated);
  return updated;
}

export function deleteTestSetRecord(caches: TestSetPerformanceCaches, id: string): void {
  caches.testSets.delete(id);
  Array.from(caches.testSetComponents.entries()).forEach(([componentId, component]) => {
    if (component.testSetId === id) {
      caches.testSetComponents.delete(componentId);
    }
  });
}

export function getTestSetComponentsRecord(
  caches: TestSetPerformanceCaches,
  testSetId: string,
): TestSetComponent[] {
  return Array.from(caches.testSetComponents.values())
    .filter((component) => component.testSetId === testSetId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function createTestSetComponentRecord(
  caches: TestSetPerformanceCaches,
  component: InsertTestSetComponent,
): TestSetComponent {
  const id = randomUUID();
  const newComponent: TestSetComponent = { ...component, id, isRequired: component.isRequired ?? true };
  caches.testSetComponents.set(id, newComponent);
  return newComponent;
}

export function deleteTestSetComponentRecord(caches: TestSetPerformanceCaches, id: string): void {
  caches.testSetComponents.delete(id);
}

export async function getTestSetAttemptsRecord(userId: string): Promise<TestSetAttempt[]> {
  try {
    return await db.select().from(testSetAttempts).where(eq(testSetAttempts.userId, userId)).orderBy(desc(testSetAttempts.startedAt));
  } catch (error) {
    console.error("Error fetching test set attempts:", error);
    return [];
  }
}

export async function getTestSetAttemptRecord(id: string): Promise<TestSetAttempt | undefined> {
  try {
    const [attempt] = await db.select().from(testSetAttempts).where(eq(testSetAttempts.id, id)).limit(1);
    return attempt || undefined;
  } catch (error) {
    console.error("Error fetching test set attempt:", error);
    return undefined;
  }
}

export async function createTestSetAttemptRecord(attempt: InsertTestSetAttempt): Promise<TestSetAttempt> {
  try {
    const payload: TestSetAttemptInsert = {
      ...attempt,
      status: attempt.status as TestSetAttemptInsert["status"],
      startedAt: new Date(),
      answers: attempt.answers ?? {},
      currentQuestionIndex: attempt.currentQuestionIndex ?? 0,
    };
    const [newAttempt] = await db
      .insert(testSetAttempts)
      .values(payload)
      .returning();
    return newAttempt;
  } catch (error) {
    console.error("Error creating test set attempt:", error);
    throw error;
  }
}

export async function updateTestSetAttemptRecord(
  id: string,
  attempt: Partial<TestSetAttempt>,
): Promise<TestSetAttempt> {
  try {
    const [updated] = await db
      .update(testSetAttempts)
      .set({ ...attempt, updatedAt: new Date() })
      .where(eq(testSetAttempts.id, id))
      .returning();
    if (!updated) throw new Error(`Test set attempt with id ${id} not found`);
    return updated;
  } catch (error) {
    console.error("Error updating test set attempt:", error);
    throw error;
  }
}

export async function getInProgressTestSetAttemptRecord(
  userId: string,
  testSetId: string,
): Promise<TestSetAttempt | undefined> {
  try {
    const [attempt] = await db
      .select()
      .from(testSetAttempts)
      .where(and(eq(testSetAttempts.userId, userId), eq(testSetAttempts.testSetId, testSetId), eq(testSetAttempts.status, "in_progress")))
      .limit(1);
    return attempt || undefined;
  } catch (error) {
    console.error("Error fetching in-progress test set attempt:", error);
    return undefined;
  }
}

export function getUserScoreHistoryRecord(
  caches: TestSetPerformanceCaches,
  userId: string,
  period: "week" | "month" | "year",
  examType: "toefl" | "gre",
): any[] {
  const attempts = Array.from(caches.testSetAttempts.values()).filter(
    (attempt) => attempt.userId === userId && attempt.status === "completed" && attempt.totalScore !== null,
  );
  const now = new Date();
  const cutoffDate = new Date();
  switch (period) {
    case "week":
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case "month":
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  return attempts
    .filter((attempt) => attempt.completedAt && attempt.completedAt >= cutoffDate)
    .map((attempt) => ({
      id: attempt.id,
      testSetId: attempt.testSetId,
      totalScore: attempt.totalScore,
      sectionScores: attempt.sectionScores || {},
      completedAt: attempt.completedAt,
      examType,
    }));
}

export function generateAIInsightsRecord(scoreHistory: any[], examType: "toefl" | "gre"): any {
  if (scoreHistory.length === 0) {
    return {
      overallTrend: "insufficient_data",
      recommendations: ["지속적인 연습이 필요합니다.", "더 많은 모의고사를 풀어보세요."],
      strengths: [],
      weaknesses: [],
      studyPlan: "기본 실력 향상을 위한 체계적인 학습이 필요합니다.",
    };
  }
  const latestScore = scoreHistory[scoreHistory.length - 1]?.totalScore || 0;
  const isImproving = scoreHistory.length >= 2 ? latestScore > scoreHistory[scoreHistory.length - 2].totalScore : null;
  return {
    overallTrend: isImproving === true ? "improving" : isImproving === false ? "declining" : "stable",
    currentLevel:
      examType === "toefl" ? (latestScore >= 100 ? "high" : latestScore >= 80 ? "intermediate" : "beginner") : latestScore >= 320 ? "high" : latestScore >= 300 ? "intermediate" : "beginner",
    recommendations: [
      latestScore < (examType === "toefl" ? 90 : 310) ? "기본기 강화에 집중하세요" : "고득점 전략을 활용하세요",
      "약점 영역의 집중 훈련이 필요합니다",
    ],
    targetScore: examType === "toefl" ? 100 : 320,
    studyPlan: `현재 점수 ${latestScore}점에서 목표 점수 달성을 위한 맞춤형 학습계획이 제공됩니다.`,
  };
}
