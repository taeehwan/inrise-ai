import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAiListeningView,
  buildAiSectionedResponse,
  buildAiTestSetPayload,
  buildTestSetAsTestResponse,
} from "../../server/lib/testPayloads";

test("buildAiTestSetPayload flattens passage questions", () => {
  const payload = buildAiTestSetPayload("ai-1", {
    passages: [{ title: "P1", script: "s", questions: [{ id: "q1", question: "Q" }] }],
  });
  assert.equal(payload.questions.length, 1);
  assert.equal(payload.questions[0].passageTitle, "P1");
});

test("buildAiListeningView normalizes listening questions", () => {
  const payload = buildAiListeningView({
    title: "L",
    section: "listening",
    questions: [{ questionText: "Q1", options: ["A"], points: 2 }],
  });
  assert.equal(payload.questions[0].question, "Q1");
  assert.equal(payload.totalQuestions, 1);
});

test("buildAiSectionedResponse fills sectionData", () => {
  const payload = buildAiSectionedResponse({ passages: [], scripts: ["s1"], tasks: [], audioFiles: [] }, [{ id: "q1" }]);
  assert.equal(payload.sectionData.questions.length, 1);
  assert.equal(payload.sectionData.scripts.length, 1);
});

test("buildTestSetAsTestResponse infers section from title", () => {
  const payload = buildTestSetAsTestResponse("testset-1", {
    title: "TOEFL Listening Full Test",
    examType: "toefl",
    totalDuration: 90,
    isActive: true,
    _sectionData: { foo: "bar" },
  });
  assert.equal(payload.section, "listening");
  assert.equal(payload.duration, 90);
});
