import assert from "node:assert/strict";
import test from "node:test";
import {
  extractQuestionData,
  parseQuestionsFromText,
  parseReadingContentAdvanced,
} from "../../server/lib/textQuestionParser";

test("extractQuestionData parses options, answer, and explanation", () => {
  const parsed = extractQuestionData(
    "1. What is the main idea?\n(A) Alpha\n(B) Beta\n(C) Gamma\n(D) Delta\nAnswer: B\nExplanation: Because beta fits best.",
    1,
    "reading",
  );

  assert.ok(parsed);
  assert.equal(parsed?.questionText, "What is the main idea?");
  assert.deepEqual(parsed?.options, ["Alpha", "Beta", "Gamma", "Delta"]);
  assert.equal(parsed?.correctAnswer, 1);
  assert.equal(parsed?.explanation, "Because beta fits best.");
});

test("parseQuestionsFromText attaches passage content when present", () => {
  const parsed = parseQuestionsFromText(
    "(Questions 1-2)\nA short passage about campus life.\n1. Why did the student visit?\n(A) To study\n(B) To work\n(C) To eat\n(D) To leave",
    "listening",
  );

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].scriptIndex, 0);
  assert.match(parsed[0].passageContent || "", /campus life/);
});

test("parseReadingContentAdvanced handles explicit separator content", () => {
  const parsed = parseReadingContentAdvanced(
    "Passage body here.\n===QUESTIONS===\n1. What is described?\n(A) One\n(B) Two\n(C) Three\n(D) Four",
  );

  assert.equal(parsed.passages.length, 1);
  assert.equal(parsed.questions.length, 1);
  assert.equal(parsed.passages[0].content, "Passage body here.");
});

test("parseReadingContentAdvanced creates fill-in-blank questions from passage markers", () => {
  const parsed = parseReadingContentAdvanced(
    "Complete the Words\nThe st_dent [1] visited the lib_ary [2] yesterday.",
  );

  assert.equal(parsed.passages.length, 1);
  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.questions[0].questionType, "fill-in-blank");
  assert.equal(parsed.questions[0].blankNumber, 1);
  assert.equal(parsed.questions[1].blankNumber, 2);
});
