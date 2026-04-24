import { toDate } from "./analyticsDate";

export function normalizeAnalyticsRecords(params: {
  rawVisitorLogs: any[];
  rawUsers: any[];
  rawAttempts: any[];
  rawSpeakingAttempts: any[];
  rawWritingAttempts: any[];
  rawUserActivities: any[];
}) {
  const { rawVisitorLogs, rawUsers, rawAttempts, rawSpeakingAttempts, rawWritingAttempts, rawUserActivities } = params;

  const visitorLogs = rawVisitorLogs.map((log) => ({
    ...log,
    parsedCreatedAt: toDate(log.createdAt),
  }));

  const users = rawUsers.map((user) => ({
    ...user,
    parsedCreatedAt: toDate(user.createdAt),
  }));

  const attempts = rawAttempts.map((attempt) => ({
    ...attempt,
    parsedCompletedAt: toDate(attempt.completedAt),
    parsedStartedAt: toDate(attempt.startedAt),
  }));

  const speakingAttempts = rawSpeakingAttempts.map((attempt) => ({
    ...attempt,
    parsedCreatedAt: toDate(attempt.createdAt),
    attemptType: "speaking" as const,
  }));

  const writingAttempts = rawWritingAttempts.map((attempt) => ({
    ...attempt,
    parsedCreatedAt: toDate(attempt.createdAt),
    attemptType: "writing" as const,
  }));

  const userActivities = rawUserActivities.map((activity) => ({
    ...activity,
    parsedCreatedAt: toDate(activity.createdAt),
  }));

  return {
    visitorLogs,
    users,
    attempts,
    speakingAttempts,
    writingAttempts,
    userActivities,
  };
}
