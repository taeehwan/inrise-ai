import assert from "node:assert/strict";
import test from "node:test";
import { buildDefaultAdminUser, seedStorageBootstrapData } from "../../server/lib/storageBootstrap";
import type { Question, SpeakingTest, TestSet, TestSetComponent } from "@shared/schema";

test("seedStorageBootstrapData seeds speaking tests, GRE questions, and test sets", () => {
  const speakingTests = new Map<string, SpeakingTest>();
  const questions = new Map<string, Question>();
  const testSets = new Map<string, TestSet>();
  const testSetComponents = new Map<string, TestSetComponent>();

  seedStorageBootstrapData({
    speakingTests,
    questions,
    testSets,
    testSetComponents,
  });

  assert.equal(speakingTests.size, 16);
  assert.ok(speakingTests.has("speaking-independent-1"));
  assert.ok(speakingTests.has("integrated-2"));

  assert.equal(questions.size, 6);
  assert.equal(questions.get("gre-verbal-1")?.correctAnswer, "B");
  assert.deepEqual(questions.get("gre-quant-1")?.options, {
    A: "3",
    B: "5",
    C: "7",
    D: "8",
    E: "9",
  });

  assert.equal(testSets.size, 2);
  assert.equal(testSetComponents.size, 9);
  assert.deepEqual(testSets.get("toefl-full-set-1")?.sectionOrder, ["reading", "listening", "speaking", "writing"]);
  assert.deepEqual(testSets.get("gre-full-set-1")?.sectionOrder, ["verbal", "quantitative", "verbal", "quantitative", "analytical"]);
});

test("buildDefaultAdminUser uses env credentials when provided", async (t) => {
  const prevEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const prevPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const prevNodeEnv = process.env.NODE_ENV;

  t.after(() => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = prevEmail;
    process.env.ADMIN_BOOTSTRAP_PASSWORD = prevPassword;
    process.env.NODE_ENV = prevNodeEnv;
  });

  process.env.ADMIN_BOOTSTRAP_EMAIL = "security-admin@example.com";
  process.env.ADMIN_BOOTSTRAP_PASSWORD = "StrongTestPassword123!";
  process.env.NODE_ENV = "production";

  const adminUser = await buildDefaultAdminUser();
  assert.ok(adminUser);
  assert.equal(adminUser.email, "security-admin@example.com");
  assert.notEqual(adminUser.passwordHash, "StrongTestPassword123!");
  assert.match(adminUser.passwordHash, /^\$2[aby]\$/);
});

test("buildDefaultAdminUser skips bootstrap when production password is missing", async (t) => {
  const prevEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const prevPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const prevNodeEnv = process.env.NODE_ENV;

  t.after(() => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = prevEmail;
    process.env.ADMIN_BOOTSTRAP_PASSWORD = prevPassword;
    process.env.NODE_ENV = prevNodeEnv;
  });

  delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
  process.env.ADMIN_BOOTSTRAP_EMAIL = "security-admin@example.com";
  process.env.NODE_ENV = "production";

  const adminUser = await buildDefaultAdminUser();
  assert.equal(adminUser, null);
});
