import type {
  AnalyticsEvent,
  InsertAnalyticsEvent,
  InsertSurveyResponse,
  InsertTestProgress,
  Survey,
  SurveyResponse,
  TestProgress,
} from "@shared/schema";
import {
  analyticsEvents as analyticsEventsTable,
  surveyResponses as surveyResponsesTable,
  surveys as surveysTable,
  testProgress as testProgressTable,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db";

type TestProgressInsert = typeof testProgressTable.$inferInsert;

export async function getTestProgressRecord(
  userId: string,
  testSetAttemptId?: string,
  testAttemptId?: string,
): Promise<TestProgress | undefined> {
  const conditions = [eq(testProgressTable.userId, userId)];
  if (testSetAttemptId) conditions.push(eq(testProgressTable.testSetAttemptId, testSetAttemptId));
  if (testAttemptId) conditions.push(eq(testProgressTable.testAttemptId, testAttemptId));
  const [progress] = await db.select().from(testProgressTable).where(and(...conditions));
  return progress;
}

export async function getUserTestProgressListRecord(userId: string): Promise<TestProgress[]> {
  return db.select().from(testProgressTable).where(eq(testProgressTable.userId, userId));
}

export async function createTestProgressRecord(progress: InsertTestProgress): Promise<TestProgress> {
  const payload: TestProgressInsert = {
    ...progress,
    examType: progress.examType as TestProgressInsert["examType"],
    testType: progress.testType as TestProgressInsert["testType"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const [created] = await db
    .insert(testProgressTable)
    .values(payload)
    .returning();
  return created;
}

export async function updateTestProgressRecord(id: string, progress: Partial<InsertTestProgress>): Promise<TestProgress> {
  const payload: Partial<TestProgressInsert> = {
    ...progress,
    examType: progress.examType as TestProgressInsert["examType"] | undefined,
    testType: progress.testType as TestProgressInsert["testType"] | undefined,
    updatedAt: new Date(),
  };
  const [updated] = await db
    .update(testProgressTable)
    .set(payload)
    .where(eq(testProgressTable.id, id))
    .returning();
  return updated;
}

export async function pauseTestProgressRecord(id: string): Promise<TestProgress> {
  const [updated] = await db
    .update(testProgressTable)
    .set({ isPaused: true, pausedAt: new Date(), updatedAt: new Date() })
    .where(eq(testProgressTable.id, id))
    .returning();
  return updated;
}

export async function resumeTestProgressRecord(id: string): Promise<TestProgress> {
  const [updated] = await db
    .update(testProgressTable)
    .set({ isPaused: false, resumedAt: new Date(), updatedAt: new Date() })
    .where(eq(testProgressTable.id, id))
    .returning();
  return updated;
}

export async function deleteTestProgressRecord(id: string): Promise<void> {
  await db.delete(testProgressTable).where(eq(testProgressTable.id, id));
}

export async function getActiveSurveyRecord(): Promise<Survey | undefined> {
  try {
    const [survey] = await db
      .select()
      .from(surveysTable)
      .where(eq(surveysTable.isActive, true))
      .orderBy(desc(surveysTable.createdAt))
      .limit(1);
    return survey;
  } catch (error) {
    console.error("Error fetching active survey:", error);
    return undefined;
  }
}

export async function hasUserRespondedToSurveyRecord(surveyId: string, userId: string): Promise<boolean> {
  try {
    const [existing] = await db
      .select({ id: surveyResponsesTable.id })
      .from(surveyResponsesTable)
      .where(and(eq(surveyResponsesTable.surveyId, surveyId), eq(surveyResponsesTable.userId, userId)))
      .limit(1);
    return !!existing;
  } catch (_error) {
    return false;
  }
}

export async function createSurveyResponseRecord(data: InsertSurveyResponse): Promise<SurveyResponse> {
  const [created] = await db.insert(surveyResponsesTable).values(data).returning();
  return created;
}

export async function getSurveyStatsRecord(surveyId: string): Promise<any> {
  try {
    const responses = await db
      .select()
      .from(surveyResponsesTable)
      .where(eq(surveyResponsesTable.surveyId, surveyId))
      .orderBy(desc(surveyResponsesTable.submittedAt));

    const total = responses.length;
    if (total === 0) {
      return { total: 0, nps: null, aiFeedbackRating: null, similarityRating: null, mainFeature: {}, improvements: {}, comments: [] };
    }

    let npsSum = 0, npsCount = 0;
    let aiSum = 0, aiCount = 0;
    let simSum = 0, simCount = 0;
    const mainFeatureMap: Record<string, number> = {};
    const improvementsMap: Record<string, number> = {};
    const comments: string[] = [];
    const npsDistribution = { promoters: 0, passives: 0, detractors: 0 };

    for (const response of responses) {
      const answers = response.answers as any;
      if (answers.nps != null) {
        npsSum += Number(answers.nps);
        npsCount++;
        if (answers.nps >= 9) npsDistribution.promoters++;
        else if (answers.nps >= 7) npsDistribution.passives++;
        else npsDistribution.detractors++;
      }
      if (answers.aiFeedbackRating != null) {
        aiSum += Number(answers.aiFeedbackRating);
        aiCount++;
      }
      if (answers.similarityRating != null) {
        simSum += Number(answers.similarityRating);
        simCount++;
      }
      if (answers.mainFeature) {
        mainFeatureMap[answers.mainFeature] = (mainFeatureMap[answers.mainFeature] || 0) + 1;
      }
      if (Array.isArray(answers.improvements)) {
        for (const improvement of answers.improvements) {
          improvementsMap[improvement] = (improvementsMap[improvement] || 0) + 1;
        }
      }
      if (answers.comment && answers.comment.trim()) {
        comments.push(answers.comment.trim());
      }
    }

    const npsScore = npsCount > 0
      ? Math.round(((npsDistribution.promoters - npsDistribution.detractors) / npsCount) * 100)
      : null;

    return {
      total,
      nps: npsScore,
      npsDistribution,
      aiFeedbackRating: aiCount > 0 ? Math.round((aiSum / aiCount) * 10) / 10 : null,
      similarityRating: simCount > 0 ? Math.round((simSum / simCount) * 10) / 10 : null,
      mainFeature: mainFeatureMap,
      improvements: improvementsMap,
      comments: comments.slice(-10).reverse(),
    };
  } catch (error) {
    console.error("Error fetching survey stats:", error);
    return { total: 0 };
  }
}

export async function createAnalyticsEventRecord(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
  try {
    const [created] = await db.insert(analyticsEventsTable).values({ ...event, id: randomUUID() }).returning();
    return created;
  } catch (error) {
    console.error("Error creating analytics event:", error);
    return { id: randomUUID(), createdAt: new Date(), ...event } as AnalyticsEvent;
  }
}

export async function getAnalyticsEventsSummaryRecord(days = 30): Promise<any> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db.select().from(analyticsEventsTable).where(gte(analyticsEventsTable.createdAt, since));
    const byType: Record<string, number> = {};
    for (const row of rows) {
      byType[row.eventType] = (byType[row.eventType] || 0) + 1;
    }
    return {
      total: rows.length,
      byType,
      uniqueSessions: new Set(rows.map((row) => row.sessionId).filter(Boolean)).size,
      uniqueUsers: new Set(rows.map((row) => row.userId).filter(Boolean)).size,
    };
  } catch (error) {
    console.error("Error getting analytics events summary:", error);
    return { total: 0, byType: {}, uniqueSessions: 0, uniqueUsers: 0 };
  }
}

export async function getAnalyticsEventsDailyTrendRecord(days = 30): Promise<any[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(analyticsEventsTable)
      .where(gte(analyticsEventsTable.createdAt, since))
      .orderBy(analyticsEventsTable.createdAt);

    const dailyMap: Record<string, { date: string; total: number; page_view: number; session_start: number; signup: number }> = {};
    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { date, total: 0, page_view: 0, session_start: 0, signup: 0 };
      dailyMap[date].total++;
      if (row.eventType === "page_view") dailyMap[date].page_view++;
      if (row.eventType === "session_start") dailyMap[date].session_start++;
      if (row.eventType === "signup") dailyMap[date].signup++;
    }

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error getting analytics events trend:", error);
    return [];
  }
}
