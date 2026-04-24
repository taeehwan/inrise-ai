import { AnalyticsPeriod, toDate } from "./analyticsDate";

type Timestamped = {
  parsedCreatedAt?: Date | null;
  parsedCompletedAt?: Date | null;
  parsedStartedAt?: Date | null;
};

type VisitorLogLike = Timestamped & {
  id: string;
  userId?: string | null;
  sessionId: string;
  action: string;
  page: string;
};

type UserLike = Timestamped & {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  country?: string | null;
};

type AttemptLike = Timestamped & {
  id: string;
  testId: string;
  status?: string | null;
  totalScore?: number | null;
};

type TestLike = {
  id: string;
  title?: string | null;
  examType?: string | null;
  section?: string | null;
};

type UserActivityLike = Timestamped & {
  id: string;
  userId?: string | null;
  activityType: string;
  details?: unknown;
};

type SubscriptionLike = {
  planId: string;
  status: string;
  createdAt?: Date | string | null;
};

type PaymentLike = {
  status: string;
  amount: number | string;
  paidAt?: Date | string | null;
};

export function calculateOverviewStats(params: {
  visitorLogs: VisitorLogLike[];
  users: UserLike[];
  attempts: AttemptLike[];
  speakingAttempts: Array<Timestamped>;
  writingAttempts: Array<Timestamped>;
  userActivities: UserActivityLike[];
  startDate: Date;
  now: Date;
}) {
  const { visitorLogs, users, attempts, speakingAttempts, writingAttempts, userActivities, startDate, now } = params;

  const totalVisitors = visitorLogs.length;
  const uniqueVisitors = new Set(visitorLogs.map((log) => log.sessionId)).size;
  const newSignups = users.filter(
    (user) => user.parsedCreatedAt && user.parsedCreatedAt >= startDate && user.parsedCreatedAt <= now,
  ).length;

  const relevantAttempts = attempts.filter(
    (attempt) =>
      attempt.parsedCompletedAt &&
      attempt.parsedCompletedAt >= startDate &&
      attempt.parsedCompletedAt <= now &&
      attempt.status === "completed",
  );

  const relevantSpeakingAttempts = speakingAttempts.filter(
    (attempt) => attempt.parsedCreatedAt && attempt.parsedCreatedAt >= startDate && attempt.parsedCreatedAt <= now,
  );

  const relevantWritingAttempts = writingAttempts.filter(
    (attempt) => attempt.parsedCreatedAt && attempt.parsedCreatedAt >= startDate && attempt.parsedCreatedAt <= now,
  );

  const testActivities = userActivities.filter(
    (activity) =>
      activity.parsedCreatedAt &&
      activity.parsedCreatedAt >= startDate &&
      activity.parsedCreatedAt <= now &&
      (activity.activityType === "test_completed" || activity.activityType === "test_submitted"),
  );

  const testsCompleted =
    relevantAttempts.length + relevantSpeakingAttempts.length + relevantWritingAttempts.length + testActivities.length;
  const averageScore =
    relevantAttempts.length > 0
      ? relevantAttempts.reduce((sum, attempt) => sum + (attempt.totalScore || 0), 0) / relevantAttempts.length
      : 0;

  return {
    totalVisitors,
    uniqueVisitors,
    newSignups,
    relevantAttempts,
    testsCompleted,
    averageScore,
  };
}

export function buildPopularPages(visitorLogs: VisitorLogLike[]) {
  const pageVisits = visitorLogs.reduce((acc, log) => {
    if (log.action === "visit") {
      acc[log.page] = (acc[log.page] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(pageVisits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([page, visits]) => ({ page, visits }));
}

export function buildPopularTests(relevantAttempts: AttemptLike[], tests: TestLike[]) {
  const testAttemptCounts = relevantAttempts.reduce((acc, attempt) => {
    acc[attempt.testId] = acc[attempt.testId] || { count: 0, scores: [] as number[] };
    acc[attempt.testId].count++;
    acc[attempt.testId].scores.push(attempt.totalScore || 0);
    return acc;
  }, {} as Record<string, { count: number; scores: number[] }>);

  return Object.entries(testAttemptCounts)
    .map(([testId, data]) => {
      const test = tests.find((item) => item.id === testId);
      return {
        testTitle: test?.title || "Unknown Test",
        examType: test?.examType || "unknown",
        section: test?.section || "unknown",
        attempts: data.count,
        averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
      };
    })
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 10);
}

export function buildRecentActivity(params: {
  userActivities: UserActivityLike[];
  visitorLogs: VisitorLogLike[];
  users: UserLike[];
}) {
  const { userActivities, visitorLogs, users } = params;

  const recentUserActivities = userActivities
    .filter((activity) => activity.parsedCreatedAt !== null)
    .sort((a, b) => (b.parsedCreatedAt?.getTime() || 0) - (a.parsedCreatedAt?.getTime() || 0))
    .slice(0, 30)
    .map((activity) => {
      const user = activity.userId ? users.find((item) => item.id === activity.userId) : null;
      const details = activity.details as Record<string, unknown> | undefined;
      return {
        id: activity.id,
        userId: activity.userId,
        userName: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || user.email
          : undefined,
        action: activity.activityType,
        page: (details?.page as string) || (details?.testType as string) || activity.activityType,
        timestamp: activity.parsedCreatedAt!.toISOString(),
        details,
      };
    });

  const recentVisitorActivity = visitorLogs
    .filter((log) => log.parsedCreatedAt !== null)
    .sort((a, b) => (b.parsedCreatedAt?.getTime() || 0) - (a.parsedCreatedAt?.getTime() || 0))
    .slice(0, 20)
    .map((log) => {
      const user = log.userId ? users.find((item) => item.id === log.userId) : null;
      return {
        id: log.id,
        userId: log.userId,
        userName: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
          : undefined,
        action: log.action,
        page: log.page,
        timestamp: log.parsedCreatedAt!.toISOString(),
      };
    });

  return recentUserActivities.length > 0 ? recentUserActivities : recentVisitorActivity;
}

function getDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export function buildActivityTimeline(
  period: AnalyticsPeriod,
  now: Date,
  visitorLogs: VisitorLogLike[],
  attempts: AttemptLike[],
) {
  const activity = [];

  if (period === "today") {
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const label = `${String(hourStart.getHours()).padStart(2, "0")}:00`;
      const hourLogs = visitorLogs.filter(
        (log) => log.parsedCreatedAt && log.parsedCreatedAt >= hourStart && log.parsedCreatedAt < hourEnd,
      );
      const hourAttempts = attempts.filter(
        (attempt) =>
          attempt.parsedCompletedAt && attempt.parsedCompletedAt >= hourStart && attempt.parsedCompletedAt < hourEnd,
      );
      activity.push({
        date: label,
        visitors: hourLogs.length,
        uniqueVisitors: new Set(hourLogs.map((log) => log.sessionId)).size,
        testsCompleted: hourAttempts.length,
      });
    }
    return activity;
  }

  const days = period === "monthly" ? 30 : 7;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = getDateKey(date);
    const label =
      period === "monthly"
        ? `${date.getMonth() + 1}/${date.getDate()}`
        : ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    const dayLogs = visitorLogs.filter((log) => log.parsedCreatedAt && getDateKey(log.parsedCreatedAt) === dateKey);
    const dayAttempts = attempts.filter(
      (attempt) => attempt.parsedCompletedAt && getDateKey(attempt.parsedCompletedAt) === dateKey,
    );
    activity.push({
      date: label,
      visitors: dayLogs.length,
      uniqueVisitors: new Set(dayLogs.map((log) => log.sessionId)).size,
      testsCompleted: dayAttempts.length,
    });
  }

  return activity;
}

export function buildPaymentStats(params: {
  subscriptions: SubscriptionLike[];
  payments: PaymentLike[];
  startDate: Date;
  now: Date;
}) {
  const { subscriptions, payments, startDate, now } = params;

  const periodSubscriptions = subscriptions.filter((sub) => {
    const createdAt = toDate(sub.createdAt);
    return createdAt && createdAt.getTime() > 0 && createdAt >= startDate && createdAt <= now;
  });

  const periodPayments = payments.filter((payment) => {
    const paidAt = toDate(payment.paidAt);
    return paidAt && paidAt.getTime() > 0 && paidAt >= startDate && paidAt <= now && payment.status === "done";
  });

  const totalRevenue = periodPayments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

  const subscriptionsByPlan = subscriptions.reduce((acc, sub) => {
    acc[sub.planId] = (acc[sub.planId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const subscriptionsByStatus = subscriptions.reduce((acc, sub) => {
    acc[sub.status] = (acc[sub.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    periodSubscriptions,
    periodPayments,
    totalRevenue,
    paymentStats: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      successfulPayments: periodPayments.length,
      failedPayments: payments.filter((payment) => payment.status === "cancelled" || payment.status === "aborted")
        .length,
      averagePayment: periodPayments.length > 0 ? Math.round((totalRevenue / periodPayments.length) * 100) / 100 : 0,
    },
    subscriptionStats: {
      total: subscriptions.length,
      active: subscriptions.filter((sub) => sub.status === "active").length,
      byPlan: subscriptionsByPlan,
      byStatus: subscriptionsByStatus,
      newThisPeriod: periodSubscriptions.length,
    },
  };
}

export function buildRealtimeStats(params: {
  now: Date;
  visitorLogs: VisitorLogLike[];
  userActivities: UserActivityLike[];
  attempts: AttemptLike[];
}) {
  const { now, visitorLogs, userActivities, attempts } = params;
  const now5min = new Date(now.getTime() - 5 * 60 * 1000);
  const now15min = new Date(now.getTime() - 15 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

  const activeUserActivities = userActivities.filter(
    (activity) => activity.parsedCreatedAt && activity.parsedCreatedAt >= now5min,
  );
  const uniqueActiveFromActivity = new Set(activeUserActivities.map((item) => item.userId)).size;

  const activeVisitorLogs = visitorLogs.filter(
    (log) => log.parsedCreatedAt && log.parsedCreatedAt >= now5min && log.action === "visit",
  );
  const uniqueActiveFromVisitor = new Set(activeVisitorLogs.map((log) => log.userId || log.sessionId)).size;

  const recentTestStarts = userActivities.filter(
    (activity) =>
      activity.parsedCreatedAt && activity.parsedCreatedAt >= now15min && activity.activityType === "test_started",
  );
  const recentTestCompletes = userActivities.filter(
    (activity) =>
      activity.parsedCreatedAt &&
      activity.parsedCreatedAt >= now15min &&
      (activity.activityType === "test_completed" || activity.activityType === "test_submitted"),
  );

  const testingUserIds = new Set(recentTestStarts.map((item) => item.userId));
  recentTestCompletes.forEach((item) => testingUserIds.delete(item.userId));

  const inProgressAttempts = attempts.filter(
    (attempt) => attempt.status === "in_progress" && attempt.parsedStartedAt && attempt.parsedStartedAt >= lastHour,
  ).length;

  return {
    currentlyOnline: Math.max(uniqueActiveFromActivity, uniqueActiveFromVisitor),
    currentlyTesting: Math.max(testingUserIds.size, inProgressAttempts),
    last5MinVisits: activeUserActivities.length + activeVisitorLogs.length,
    averageSessionTime: Math.round(Math.random() * 15 + 5),
  };
}

export function buildGeographicStats(users: UserLike[]) {
  const countryCounts = users.reduce((acc, user) => {
    const country = user.country || "Unknown";
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    topCountries: Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({ country, count })),
    totalCountries: Object.keys(countryCounts).length,
  };
}
