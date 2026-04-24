import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnalyticsRecords } from "../../server/lib/analyticsRecords";

test("normalizeAnalyticsRecords parses timestamps and preserves payloads", () => {
  const result = normalizeAnalyticsRecords({
    rawVisitorLogs: [{ id: "v1", createdAt: "2026-04-01T10:00:00.000Z", sessionId: "s1", action: "visit", page: "/" }],
    rawUsers: [{ id: "u1", createdAt: "2026-04-02T10:00:00.000Z", email: "a@example.com" }],
    rawAttempts: [{ id: "a1", startedAt: "2026-04-03T10:00:00.000Z", completedAt: "2026-04-03T11:00:00.000Z" }],
    rawSpeakingAttempts: [{ id: "sp1", createdAt: "2026-04-04T10:00:00.000Z" }],
    rawWritingAttempts: [{ id: "wr1", createdAt: "2026-04-05T10:00:00.000Z" }],
    rawUserActivities: [{ id: "ua1", createdAt: "2026-04-06T10:00:00.000Z", activityType: "login" }],
  });

  assert.equal(result.visitorLogs[0].parsedCreatedAt?.toISOString(), "2026-04-01T10:00:00.000Z");
  assert.equal(result.users[0].parsedCreatedAt?.toISOString(), "2026-04-02T10:00:00.000Z");
  assert.equal(result.attempts[0].parsedStartedAt?.toISOString(), "2026-04-03T10:00:00.000Z");
  assert.equal(result.attempts[0].parsedCompletedAt?.toISOString(), "2026-04-03T11:00:00.000Z");
  assert.equal(result.speakingAttempts[0].attemptType, "speaking");
  assert.equal(result.writingAttempts[0].attemptType, "writing");
  assert.equal(result.userActivities[0].parsedCreatedAt?.toISOString(), "2026-04-06T10:00:00.000Z");
});
