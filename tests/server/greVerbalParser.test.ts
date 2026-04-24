import test from "node:test";
import assert from "node:assert/strict";

import { parseGREVerbalText } from "../../server/lib/greVerbalParser";

test("parseGREVerbalText parses sentence equivalence headers and options", () => {
  const input = [
    "For Questions 1 to 1, select the two answer choices that, when inserted into the sentence, produce sentences most nearly alike in meaning.",
    "Question 1",
    "The scientist remained ___ despite the criticism.",
    "A. calm",
    "B. irate",
    "C. composed",
    "D. reckless",
    "E. joyous",
    "F. volatile",
  ].join("\n");

  const result = parseGREVerbalText(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].questionType, "sentence_equivalence");
  assert.deepEqual(result[0].options, ["calm", "irate", "composed", "reckless", "joyous", "volatile"]);
});

test("parseGREVerbalText preserves reading passage ranges", () => {
  const input = [
    "Questions 2 to 3 are based on the following reading passage",
    "The passage explains how migratory birds adapt to changing climates.",
    "Question 2",
    "According to the passage, what helps the birds survive?",
    "A. Random nesting",
    "B. Flexible migration patterns",
    "C. Shorter wings",
    "D. Less feeding",
    "E. Reduced social behavior",
  ].join("\n");

  const result = parseGREVerbalText(input);
  assert.equal(result.length, 1);
  assert.match(result[0].passage || "", /migratory birds adapt/i);
  assert.equal(result[0].questionType, "reading_comprehension");
});

test("parseGREVerbalText builds text completion blank groups", () => {
  const input = [
    "For each blank select one entry from the corresponding column of choices.",
    "Question 4",
    "The novel was so ___ that readers remained ___ throughout the final chapter.",
    "Blank (i): A. compelling B. tedious C. opaque",
    "Blank (ii): A. attentive B. indifferent C. confused",
  ].join("\n");

  const result = parseGREVerbalText(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].questionType, "text_completion");
  assert.deepEqual(result[0].options, {
    blank1: ["compelling", "tedious", "opaque"],
    blank2: ["attentive", "indifferent", "confused"],
  });
  assert.equal(result[0].blanks, 2);
});
