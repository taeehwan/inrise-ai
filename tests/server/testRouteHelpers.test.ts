import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNewToeflListeningPayload,
  isNewListeningTestId,
  isUuidLike,
  stripTestSetPrefix,
} from "../../server/lib/testRouteHelpers";

test("isUuidLike detects UUID format ids", () => {
  assert.equal(isUuidLike("123e4567-e89b-12d3-a456-426614174000"), true);
  assert.equal(isUuidLike("testset-toefl-actual-1"), false);
});

test("isNewListeningTestId detects prefixed listening ids", () => {
  assert.equal(isNewListeningTestId("new-listening-123"), true);
  assert.equal(isNewListeningTestId("ai-123"), false);
});

test("stripTestSetPrefix removes only leading testset prefix", () => {
  assert.equal(stripTestSetPrefix("testset-abc"), "abc");
  assert.equal(stripTestSetPrefix("abc"), "abc");
});

test("buildNewToeflListeningPayload normalizes category arrays", () => {
  const payload = buildNewToeflListeningPayload({
    title: "Listening",
    listenAndChoose: [{ id: "a" }],
  });

  assert.equal(payload.examType, "new-toefl");
  assert.equal(payload.section, "listening");
  assert.equal(payload.listenAndChoose.length, 1);
  assert.deepEqual(payload.conversations, []);
  assert.deepEqual(payload.announcements, []);
  assert.deepEqual(payload.academicTalks, []);
});
