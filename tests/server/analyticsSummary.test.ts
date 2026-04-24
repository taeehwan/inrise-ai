import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActivityTimeline,
  buildGeographicStats,
  buildPaymentStats,
  buildPopularPages,
  buildPopularTests,
  buildRealtimeStats,
  buildRecentActivity,
  calculateOverviewStats,
} from "../../server/lib/analyticsSummary";

test("calculateOverviewStats counts visitors, signups, attempts, and average score", () => {
  const now = new Date("2026-04-21T12:00:00.000Z");
  const startDate = new Date("2026-04-21T00:00:00.000Z");
  const stats = calculateOverviewStats({
    visitorLogs: [{ id: "v1", sessionId: "s1", action: "visit", page: "/", parsedCreatedAt: now }],
    users: [{ id: "u1", parsedCreatedAt: now }],
    attempts: [
      { id: "a1", testId: "t1", status: "completed", totalScore: 20, parsedCompletedAt: now },
      { id: "a2", testId: "t1", status: "in_progress", totalScore: 10, parsedCompletedAt: now },
    ],
    speakingAttempts: [{ parsedCreatedAt: now }],
    writingAttempts: [{ parsedCreatedAt: now }],
    userActivities: [{ id: "ua1", activityType: "test_completed", parsedCreatedAt: now }],
    startDate,
    now,
  });

  assert.equal(stats.totalVisitors, 1);
  assert.equal(stats.uniqueVisitors, 1);
  assert.equal(stats.newSignups, 1);
  assert.equal(stats.testsCompleted, 4);
  assert.equal(stats.averageScore, 20);
  assert.equal(stats.relevantAttempts.length, 1);
});

test("analytics summary helpers build page, test, and recent activity views", () => {
  const now = new Date("2026-04-21T12:00:00.000Z");
  const pages = buildPopularPages([
    { id: "v1", sessionId: "s1", action: "visit", page: "/a" },
    { id: "v2", sessionId: "s2", action: "visit", page: "/a" },
    { id: "v3", sessionId: "s3", action: "visit", page: "/b" },
  ]);
  assert.deepEqual(pages[0], { page: "/a", visits: 2 });

  const tests = buildPopularTests(
    [{ id: "a1", testId: "t1", totalScore: 25 }, { id: "a2", testId: "t1", totalScore: 15 }],
    [{ id: "t1", title: "Reading 1", examType: "toefl", section: "reading" }],
  );
  assert.equal(tests[0].averageScore, 20);

  const recent = buildRecentActivity({
    userActivities: [
      { id: "ua1", userId: "u1", activityType: "test_completed", details: { page: "/tests" }, parsedCreatedAt: now },
    ],
    visitorLogs: [{ id: "v1", sessionId: "s1", action: "visit", page: "/", parsedCreatedAt: now }],
    users: [{ id: "u1", firstName: "In", lastName: "Rise", email: "x@example.com" }],
  });
  assert.equal(recent[0].userName, "In Rise");
  assert.equal(recent[0].page, "/tests");
});

test("buildActivityTimeline returns expected day buckets", () => {
  const now = new Date("2026-04-21T12:00:00.000Z");
  const timeline = buildActivityTimeline(
    "weekly",
    now,
    [{ id: "v1", sessionId: "s1", action: "visit", page: "/", parsedCreatedAt: now }],
    [{ id: "a1", testId: "t1", parsedCompletedAt: now }],
  );
  assert.equal(timeline.length, 7);
  assert.equal(timeline[timeline.length - 1].visitors, 1);
  assert.equal(timeline[timeline.length - 1].testsCompleted, 1);
});

test("payment, realtime, and geography summaries aggregate correctly", () => {
  const now = new Date("2026-04-21T12:00:00.000Z");
  const startDate = new Date("2026-04-20T00:00:00.000Z");

  const paymentSummary = buildPaymentStats({
    subscriptions: [
      { planId: "pro", status: "active", createdAt: now },
      { planId: "basic", status: "cancelled", createdAt: "2026-03-01T00:00:00.000Z" },
    ],
    payments: [
      { status: "done", amount: 19.99, paidAt: now },
      { status: "cancelled", amount: 9.99, paidAt: now },
    ],
    startDate,
    now,
  });
  assert.equal(paymentSummary.totalRevenue, 19.99);
  assert.equal(paymentSummary.paymentStats.successfulPayments, 1);
  assert.equal(paymentSummary.subscriptionStats.byPlan.pro, 1);

  const realtime = buildRealtimeStats({
    now,
    visitorLogs: [{ id: "v1", sessionId: "s1", action: "visit", page: "/", parsedCreatedAt: now }],
    userActivities: [{ id: "ua1", userId: "u1", activityType: "test_started", parsedCreatedAt: now }],
    attempts: [{ id: "a1", testId: "t1", status: "in_progress", parsedStartedAt: now }],
  });
  assert.equal(realtime.currentlyOnline, 1);
  assert.equal(realtime.currentlyTesting, 1);

  const geo = buildGeographicStats([
    { id: "u1", country: "KR" },
    { id: "u2", country: "US" },
    { id: "u3", country: "KR" },
  ]);
  assert.equal(geo.topCountries[0].country, "KR");
  assert.equal(geo.topCountries[0].count, 2);
  assert.equal(geo.totalCountries, 2);
});
