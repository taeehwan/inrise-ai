import test from "node:test";
import assert from "node:assert/strict";

test("summarizeActivityStats aggregates counts, duration, and dates", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  const { summarizeActivityStats } = await import("../../server/lib/activityAnalyticsStorage");
  const stats = summarizeActivityStats([
    {
      id: "a1",
      userId: "u1",
      activityType: "practice",
      details: null,
      duration: 300,
      score: 25,
      createdAt: new Date("2026-04-20T10:00:00Z"),
    },
    {
      id: "a2",
      userId: "u1",
      activityType: "practice",
      details: null,
      duration: 120,
      score: 28,
      createdAt: new Date("2026-04-20T12:00:00Z"),
    },
    {
      id: "a3",
      userId: "u2",
      activityType: "review",
      details: null,
      duration: 60,
      score: null,
      createdAt: new Date("2026-04-21T09:30:00Z"),
    },
  ] as any);

  assert.equal(stats.totalActivities, 3);
  assert.equal(stats.totalDuration, 480);
  assert.equal(stats.averageDurationPerActivity, 160);
  assert.deepEqual(stats.activityTypes, { practice: 2, review: 1 });
  assert.deepEqual(stats.userActivities, { u1: 2, u2: 1 });
  assert.deepEqual(stats.dailyActivities, {
    "2026-04-20": 2,
    "2026-04-21": 1,
  });
});
