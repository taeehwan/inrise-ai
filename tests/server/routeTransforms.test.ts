import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanScriptForTTS,
  detectAttemptExamType,
  detectAttemptSection,
  extractSectionFromTitle,
  inferExclusiveSectionFromTitle,
  inferScriptType,
  normalizeAnswerToLetter,
  normalizeToToefl30,
} from "../../server/lib/routeTransforms";

test("extractSectionFromTitle infers known section names", () => {
  assert.equal(extractSectionFromTitle("TOEFL Reading Practice Set"), "reading");
  assert.equal(extractSectionFromTitle("GRE Quantitative Drill"), "quantitative");
  assert.equal(extractSectionFromTitle("Unknown Title"), "reading");
});

test("inferExclusiveSectionFromTitle only returns a section when title is unambiguous", () => {
  assert.equal(inferExclusiveSectionFromTitle("TOEFL Reading Drill"), "reading");
  assert.equal(inferExclusiveSectionFromTitle("Reading and Listening Combo"), null);
});

test("normalizeToToefl30 caps and scales scores", () => {
  assert.equal(normalizeToToefl30(26.2), 26);
  assert.equal(normalizeToToefl30(100), 30);
  assert.equal(normalizeToToefl30(-3), 0);
});

test("inferScriptType distinguishes lecture and conversation cues", () => {
  assert.equal(inferScriptType("Professor: Today in class we discuss ecosystems."), "lecture");
  assert.equal(inferScriptType("Student: Hi.\nAdvisor: Let's review your schedule."), "conversation");
  assert.equal(inferScriptType("Attention students, the library closes at six."), "conversation");
});

test("cleanScriptForTTS removes trailing question section and enforces length limit", () => {
  const cleaned = cleanScriptForTTS("Lecture text.\nQuestion 1: What is the topic?");
  assert.equal(cleaned, "Lecture text.");

  const long = "a".repeat(4500);
  assert.equal(cleanScriptForTTS(long).length, 4000);
});

test("normalizeAnswerToLetter handles indices, labels, symbols, and option matching", () => {
  assert.equal(normalizeAnswerToLetter(2, []), "C");
  assert.equal(normalizeAnswerToLetter("정답: b", []), "B");
  assert.equal(normalizeAnswerToLetter("③", []), "C");
  assert.equal(normalizeAnswerToLetter("2", []), "C");
  assert.equal(normalizeAnswerToLetter("Paris", ["London", "Paris", "Rome"]), "B");
});

test("attempt detection helpers infer section and exam type from ids and metadata", () => {
  assert.equal(detectAttemptSection("gre-quant-mock-1"), "quantitative");
  assert.equal(detectAttemptSection(undefined, { section: "writing" }), "writing");
  assert.equal(detectAttemptExamType("sat-math-1"), "sat");
  assert.equal(detectAttemptExamType(undefined, { examType: "gre" }), "gre");
});
