import test from "node:test";
import assert from "node:assert/strict";

import {
  convertCorrectAnswer,
  convertNewToeflReadingTestToQuestions,
  generateQuestionHash,
} from "../../server/lib/testTransforms";

test("convertCorrectAnswer normalizes numbers and letters", () => {
  assert.equal(convertCorrectAnswer(2), 2);
  assert.equal(convertCorrectAnswer("3"), 3);
  assert.equal(convertCorrectAnswer("B"), 1);
  assert.equal(convertCorrectAnswer("none"), -1);
});

test("convertNewToeflReadingTestToQuestions flattens mixed reading sections", () => {
  const result = convertNewToeflReadingTestToQuestions({
    completeWords: {
      paragraph: "Para",
      blanks: ["a"],
      answers: ["answer"],
    },
    comprehensionPassages: [
      {
        type: "notice",
        title: "Campus Notice",
        content: "Notice content",
        questions: [
          {
            question: "1. Why was the notice posted?",
            options: ["A", "B", "C", "D"],
            correctAnswer: "C",
          },
        ],
      },
    ],
    academicPassage: {
      content: "Academic content",
      questions: [
        {
          question: "2. What does the professor suggest?",
          options: ["A", "B", "C", "D"],
          correctAnswer: "1",
        },
      ],
    },
  });

  assert.equal(result.length, 3);
  assert.equal(result[0].type, "complete-words");
  assert.equal(result[1].question, "Why was the notice posted?");
  assert.equal(result[1].correctAnswer, 2);
  assert.equal(result[2].type, "academic");
  assert.equal(result[2].correctAnswer, 1);
});

test("generateQuestionHash is stable for equivalent spacing", () => {
  const a = generateQuestionHash({ question: "What   is   the answer?" });
  const b = generateQuestionHash({ questionText: "What is the answer?" });
  assert.equal(a, b);
});
