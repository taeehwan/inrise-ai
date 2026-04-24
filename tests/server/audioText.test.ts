import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChooseResponseQuestionText,
  getSpeakerGender,
  parseDialogueSegments,
  stripOptionContentFromText,
  stripOptionsFromScript,
  stripSpeakerLabels,
} from "../../server/lib/audioText";

test("stripSpeakerLabels removes speaker-only prefixes and empty lines", () => {
  const input = ["Woman: Hello there.", "Man: Hi.", "Narrator:", "", "Professor: Welcome."].join("\n");
  assert.equal(stripSpeakerLabels(input), "Hello there.\nHi.\nWelcome.");
});

test("stripOptionsFromScript trims trailing answer choices", () => {
  const input = ["This is the prompt.", "A. First", "B. Second", "C. Third"].join("\n");
  assert.equal(stripOptionsFromScript(input), "This is the prompt.");
});

test("stripOptionContentFromText removes lines that duplicate option text", () => {
  const input = ["Why did the student visit the office?", "To ask about work-study opportunities", "To submit the tax form"].join("\n");
  const output = stripOptionContentFromText(input, ["A. To ask about work-study opportunities", "B. To submit the tax form"]);
  assert.equal(output, "Why did the student visit the office?");
});

test("buildChooseResponseQuestionText removes labels and option content", () => {
  const input = ["Woman: Which response best fits?", "A. I already submitted it.", "B. It closes at five.", "C. Yesterday afternoon."].join("\n");
  const output = buildChooseResponseQuestionText(input, ["A. I already submitted it.", "B. It closes at five.", "C. Yesterday afternoon."]);
  assert.equal(output, "Which response best fits?");
});

test("parseDialogueSegments preserves multiline turns", () => {
  const input = ["Student: I have a question", "about registration.", "Advisor: The office opens at nine."].join("\n");
  assert.deepEqual(parseDialogueSegments(input), [
    { speaker: "Student", text: "I have a question about registration." },
    { speaker: "Advisor", text: "The office opens at nine." },
  ]);
});

test("getSpeakerGender infers common role genders", () => {
  assert.equal(getSpeakerGender("Woman"), "female");
  assert.equal(getSpeakerGender("Professor"), "male");
  assert.equal(getSpeakerGender("Student"), "unknown");
});
