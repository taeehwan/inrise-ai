import { randomUUID } from "crypto";
import type {
  InsertLiveActivity,
  InsertUserActivity,
  InsertVisitorLog,
  LiveActivity,
  Subscription,
  Payment,
  UserActivity,
  VisitorLog,
} from "@shared/schema";
import { db } from "../db";
import { getAnalyticsPeriodStart } from "./analyticsDate";
import { normalizeAnalyticsRecords } from "./analyticsRecords";
import {
  buildActivityTimeline,
  buildGeographicStats,
  buildPaymentStats,
  buildPopularPages,
  buildPopularTests,
  buildRealtimeStats,
  buildRecentActivity,
  calculateOverviewStats,
} from "./analyticsSummary";
import {
  liveActivities as liveActivitiesTable,
  userActivity as userActivityTable,
  visitorLogs,
} from "@shared/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export type ActivityAnalyticsFallbackState = {
  liveActivities: Map<string, LiveActivity>;
  payments: Map<string, Payment>;
  subscriptions: Map<string, Subscription>;
  userActivity: Map<string, UserActivity>;
  visitorLogs: Map<string, VisitorLog>;
};

type AnalyticsLoaders = {
  getAllAttempts(): Promise<any[]>;
  getAllSpeakingAttempts(): Promise<any[]>;
  getAllUserActivities(limit?: number, activityType?: string): Promise<UserActivity[]>;
  getAllUsers(): Promise<any[]>;
  getAllWritingAttempts(): Promise<any[]>;
  getTests(): Promise<any[]>;
  getVisitorLogs(startDate?: Date, endDate?: Date): Promise<VisitorLog[]>;
};

export function summarizeActivityStats(allActivities: UserActivity[]) {
  const totalActivities = allActivities.length;
  const totalDuration = allActivities.reduce((sum, activity) => sum + (activity.duration || 0), 0);

  const activityTypes = allActivities.reduce((acc, activity) => {
    acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userActivities = allActivities.reduce((acc, activity) => {
    acc[activity.userId] = (acc[activity.userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dailyActivities = allActivities.reduce((acc, activity) => {
    const date = activity.createdAt?.toISOString().split("T")[0] || "unknown";
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalActivities,
    totalDuration,
    activityTypes,
    userActivities,
    dailyActivities,
    averageDurationPerActivity: totalActivities > 0 ? Math.round(totalDuration / totalActivities) : 0,
  };
}

export async function createUserActivityRecord(
  state: ActivityAnalyticsFallbackState,
  activity: InsertUserActivity,
): Promise<UserActivity> {
  try {
    const id = randomUUID();
    const [newActivity] = await db
      .insert(userActivityTable)
      .values({
        id,
        userId: activity.userId,
        activityType: activity.activityType,
        details: activity.details || null,
        duration: activity.duration || 0,
        score: activity.score || null,
      })
      .returning();

    return newActivity;
  } catch (error) {
    console.error("Error saving user activity to DB:", error);
    const id = randomUUID();
    const newActivity: UserActivity = {
      id,
      userId: activity.userId,
      activityType: activity.activityType,
      details: activity.details || null,
      duration: activity.duration || 0,
      score: activity.score || null,
      createdAt: new Date(),
    };
    state.userActivity.set(id, newActivity);
    return newActivity;
  }
}

export async function getUserActivityRecords(
  state: ActivityAnalyticsFallbackState,
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<UserActivity[]> {
  try {
    const conditions = [eq(userActivityTable.userId, userId)];
    if (startDate) {
      conditions.push(gte(userActivityTable.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(userActivityTable.createdAt, endDate));
    }

    return await db
      .select()
      .from(userActivityTable)
      .where(and(...conditions))
      .orderBy(desc(userActivityTable.createdAt));
  } catch (error) {
    console.error("Error fetching user activity from DB:", error);
    return Array.from(state.userActivity.values())
      .filter((activity) => {
        if (activity.userId !== userId) return false;
        if (startDate && activity.createdAt! < startDate) return false;
        if (endDate && activity.createdAt! > endDate) return false;
        return true;
      })
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }
}

export async function getAllUserActivityRecords(
  state: ActivityAnalyticsFallbackState,
  limit: number = 100,
  activityType?: string,
): Promise<UserActivity[]> {
  try {
    const conditions = [];
    if (activityType) {
      conditions.push(eq(userActivityTable.activityType, activityType));
    }

    let query = db.select().from(userActivityTable).orderBy(desc(userActivityTable.createdAt)).limit(limit);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query;
  } catch (error) {
    console.error("Error fetching all user activities:", error);
    const allActivities = Array.from(state.userActivity.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);

    if (activityType) {
      return allActivities.filter((activity) => activity.activityType === activityType);
    }
    return allActivities;
  }
}

export async function getActivityStatsRecord(state: ActivityAnalyticsFallbackState): Promise<any> {
  try {
    const allActivities = await db.select().from(userActivityTable);
    return summarizeActivityStats(allActivities);
  } catch (error) {
    console.error("Error fetching activity stats from DB:", error);
    return summarizeActivityStats(Array.from(state.userActivity.values()));
  }
}

export async function createVisitorLogRecord(
  state: ActivityAnalyticsFallbackState,
  log: InsertVisitorLog,
): Promise<VisitorLog> {
  const id = randomUUID();
  const createdAt = new Date();
  const newLog: VisitorLog = {
    id,
    sessionId: log.sessionId,
    userId: log.userId || null,
    ipAddress: log.ipAddress || null,
    userAgent: log.userAgent || null,
    referrer: log.referrer || null,
    page: log.page,
    action: log.action as VisitorLog["action"],
    metadata: log.metadata || null,
    createdAt,
  };

  state.visitorLogs.set(id, newLog);

  try {
    await db.insert(visitorLogs).values({
      id,
      sessionId: log.sessionId,
      userId: log.userId || null,
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
      referrer: log.referrer || null,
      page: log.page,
      action: log.action as VisitorLog["action"],
      metadata: log.metadata || null,
      createdAt,
    } as any);
  } catch (error) {
    console.error("Failed to persist visitor log to database:", error);
  }

  return newLog;
}

export async function getVisitorLogRecords(
  state: ActivityAnalyticsFallbackState,
  startDate?: Date,
  endDate?: Date,
): Promise<VisitorLog[]> {
  try {
    let query = db.select().from(visitorLogs);

    if (startDate && endDate) {
      query = query.where(and(gte(visitorLogs.createdAt, startDate), lte(visitorLogs.createdAt, endDate))) as any;
    } else if (startDate) {
      query = query.where(gte(visitorLogs.createdAt, startDate)) as any;
    }

    return await query.orderBy(desc(visitorLogs.createdAt)).limit(500);
  } catch (error) {
    console.error("Failed to fetch visitor logs from database:", error);
  }

  return Array.from(state.visitorLogs.values())
    .filter((log) => {
      if (startDate && log.createdAt! < startDate) return false;
      if (endDate && log.createdAt! > endDate) return false;
      return true;
    })
    .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
}

export async function getAnalyticsDataRecord(
  state: ActivityAnalyticsFallbackState,
  loaders: AnalyticsLoaders,
  period: "today" | "weekly" | "monthly" = "today",
): Promise<any> {
  const now = new Date();
  const startDate = getAnalyticsPeriodStart(now, period);

  const rawVisitorLogs = await loaders.getVisitorLogs(startDate, now);
  const rawUsers = await loaders.getAllUsers();
  const rawAttempts = await loaders.getAllAttempts();
  const tests = await loaders.getTests();
  const rawSpeakingAttempts = await loaders.getAllSpeakingAttempts();
  const rawWritingAttempts = await loaders.getAllWritingAttempts();
  const rawUserActivities = await loaders.getAllUserActivities(500);

  const { visitorLogs: normalizedVisitorLogs, users, attempts, speakingAttempts, writingAttempts, userActivities } =
    normalizeAnalyticsRecords({
      rawVisitorLogs,
      rawUsers,
      rawAttempts,
      rawSpeakingAttempts,
      rawWritingAttempts,
      rawUserActivities,
    });

  const {
    totalVisitors,
    uniqueVisitors,
    newSignups,
    relevantAttempts,
    testsCompleted,
    averageScore,
  } = calculateOverviewStats({
    visitorLogs: normalizedVisitorLogs,
    users,
    attempts,
    speakingAttempts,
    writingAttempts,
    userActivities,
    startDate,
    now,
  });

  const popularPages = buildPopularPages(normalizedVisitorLogs);
  const popularTests = buildPopularTests(relevantAttempts, tests);
  const recentActivity = buildRecentActivity({ userActivities, visitorLogs: normalizedVisitorLogs, users });
  const dailyActivity = buildActivityTimeline(period, now, normalizedVisitorLogs, attempts);

  const subscriptions = Array.from(state.subscriptions.values());
  const payments = Array.from(state.payments.values());

  const { periodSubscriptions, periodPayments, totalRevenue, paymentStats, subscriptionStats } = buildPaymentStats({
    subscriptions: subscriptions as any,
    payments: payments as any,
    startDate,
    now,
  });

  const realTimeStats = buildRealtimeStats({
    now,
    visitorLogs: normalizedVisitorLogs,
    userActivities,
    attempts,
  });

  const geographicStats = buildGeographicStats(users);

  return {
    [period]: {
      visitors: totalVisitors,
      uniqueVisitors,
      newSignups,
      testsCompleted,
      averageScore: Math.round(averageScore * 10) / 10,
      revenue: Math.round(totalRevenue * 100) / 100,
      newSubscriptions: periodSubscriptions.length,
      successfulPayments: periodPayments.length,
    },
    popularPages,
    popularTests,
    userActivity: dailyActivity,
    recentActivity,
    paymentStats,
    subscriptionStats,
    realTimeStats,
    geographicStats,
  };
}

export async function getLiveActivitiesRecords(
  state: ActivityAnalyticsFallbackState,
  limit: number = 50,
): Promise<LiveActivity[]> {
  try {
    const activities = await db.select().from(liveActivitiesTable).orderBy(liveActivitiesTable.createdAt).limit(limit);
    return activities.reverse();
  } catch (error) {
    console.error("Failed to get live activities:", error);
    return Array.from(state.liveActivities.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }
}

export async function createLiveActivityRecord(
  state: ActivityAnalyticsFallbackState,
  activity: InsertLiveActivity,
): Promise<LiveActivity> {
  const id = randomUUID();
  const newActivity: LiveActivity = {
    id,
    userId: activity.userId || null,
    type: activity.type as LiveActivity["type"],
    title: activity.title,
    description: activity.description,
    displayName: activity.displayName,
    avatarUrl: activity.avatarUrl || null,
    scoreValue: activity.scoreValue || null,
    section: activity.section || null,
    examType: (activity.examType || null) as LiveActivity["examType"],
    metadata: activity.metadata || null,
    isHighlight: activity.isHighlight || false,
    expiresAt: activity.expiresAt || null,
    createdAt: new Date(),
  };

  try {
    const [inserted] = await db.insert(liveActivitiesTable).values(newActivity).returning();
    return inserted;
  } catch (error) {
    console.error("Failed to create live activity:", error);
    state.liveActivities.set(id, newActivity);
    return newActivity;
  }
}

export async function getRecentLiveActivitiesRecords(
  state: ActivityAnalyticsFallbackState,
  since?: Date,
): Promise<LiveActivity[]> {
  try {
    let query = db.select().from(liveActivitiesTable).orderBy(liveActivitiesTable.createdAt).limit(100);
    if (since) {
      query = query.where(gte(liveActivitiesTable.createdAt, since)) as any;
    }

    const activities = await query;
    return activities.reverse();
  } catch (error) {
    console.error("Failed to get recent live activities:", error);
    const activities = Array.from(state.liveActivities.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    if (since) {
      return activities.filter((activity) => activity.createdAt > since);
    }
    return activities.slice(0, 100);
  }
}
