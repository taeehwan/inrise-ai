import test from "node:test";
import assert from "node:assert/strict";

import { getAnalyticsPeriodStart, toDate, toISODateStr } from "../../server/lib/analyticsDate";

test("toDate normalizes valid values and rejects invalid ones", () => {
  assert.equal(toDate("invalid-date"), null);
  assert.equal(toDate(null), null);
  assert.match(toDate("2026-04-21T00:00:00.000Z")?.toISOString() || "", /^2026-04-21T00:00:00.000Z$/);
});

test("toISODateStr returns empty string for invalid dates", () => {
  assert.equal(toISODateStr("invalid-date"), "");
  assert.equal(toISODateStr("2026-04-21T10:20:30.000Z"), "2026-04-21");
});

test("getAnalyticsPeriodStart returns stable period boundaries", () => {
  const now = new Date("2026-04-21T15:20:30.000Z");
  const todayStart = getAnalyticsPeriodStart(now, "today");
  const monthStart = getAnalyticsPeriodStart(now, "monthly");
  assert.equal(getAnalyticsPeriodStart(now, "weekly").toISOString(), "2026-04-14T15:20:30.000Z");
  assert.equal(todayStart.getFullYear(), now.getFullYear());
  assert.equal(todayStart.getMonth(), now.getMonth());
  assert.equal(todayStart.getDate(), now.getDate());
  assert.equal(todayStart.getHours(), 0);
  assert.equal(todayStart.getMinutes(), 0);
  assert.equal(monthStart.getFullYear(), now.getFullYear());
  assert.equal(monthStart.getMonth(), now.getMonth());
  assert.equal(monthStart.getDate(), 1);
  assert.equal(monthStart.getHours(), 0);
  assert.equal(monthStart.getMinutes(), 0);
});
