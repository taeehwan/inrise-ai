import test from "node:test";
import assert from "node:assert/strict";
import { resolveAttemptTestData } from "../../server/lib/testResolver";

test("resolveAttemptTestData prefers a direct test match", async () => {
  const result = await resolveAttemptTestData(
    {
      getTest: async () => ({ id: "test-1", title: "Direct test" }),
      getTestSet: async () => ({ id: "set-1", title: "Set test" }),
      getAIGeneratedTest: async () => ({ id: "ai-1", title: "AI test" }),
    },
    "test-1",
  );

  assert.deepEqual(result, { id: "test-1", title: "Direct test" });
});

test("resolveAttemptTestData falls back to test set and strips prefix", async () => {
  let receivedTestSetId = "";
  const result = await resolveAttemptTestData(
    {
      getTest: async () => undefined,
      getTestSet: async (testSetId: string) => {
        receivedTestSetId = testSetId;
        return { id: testSetId, title: "Resolved set" };
      },
      getAIGeneratedTest: async () => undefined,
    },
    "testset-abc123",
  );

  assert.equal(receivedTestSetId, "abc123");
  assert.deepEqual(result, { id: "abc123", title: "Resolved set" });
});

test("resolveAttemptTestData falls back to AI test when others are missing", async () => {
  const result = await resolveAttemptTestData(
    {
      getTest: async () => undefined,
      getTestSet: async () => undefined,
      getAIGeneratedTest: async () => ({ id: "ai-1", title: "AI test" }),
    },
    "ai-1",
  );

  assert.deepEqual(result, { id: "ai-1", title: "AI test" });
});
