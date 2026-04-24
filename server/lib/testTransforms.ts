export interface ConvertedReadingQuestion {
  type: string;
  question: string;
  passage: string;
  options: string[];
  correctAnswer: number;
  passageType?: string;
  passageTitle?: string;
  blanks?: string[];
  answers?: string[];
}

export interface NewToeflReadingLikeTest {
  completeWords?: unknown;
  comprehensionPassages?: unknown;
  academicPassage?: unknown;
}

type ReadingQuestionInput = {
  question?: string;
  options?: string[];
  correctAnswer?: string | number | null;
};

type ReadingPassageInput = {
  type?: string;
  title?: string;
  content?: string;
  questions?: ReadingQuestionInput[];
};

type CompleteWordsInput = {
  paragraph?: string;
  blanks?: string[];
  answers?: string[];
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asCompleteWordsInput(value: unknown): CompleteWordsInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    paragraph: typeof record.paragraph === "string" ? record.paragraph : undefined,
    blanks: asStringArray(record.blanks),
    answers: asStringArray(record.answers),
  };
}

function asReadingQuestionInput(value: unknown): ReadingQuestionInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const correctAnswer = record.correctAnswer;
  return {
    question: typeof record.question === "string" ? record.question : undefined,
    options: asStringArray(record.options),
    correctAnswer:
      typeof correctAnswer === "string" || typeof correctAnswer === "number" || correctAnswer == null
        ? correctAnswer
        : null,
  };
}

function asReadingPassageInput(value: unknown): ReadingPassageInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    type: typeof record.type === "string" ? record.type : undefined,
    title: typeof record.title === "string" ? record.title : undefined,
    content: typeof record.content === "string" ? record.content : undefined,
    questions: Array.isArray(record.questions)
      ? record.questions.map(asReadingQuestionInput).filter((item): item is ReadingQuestionInput => item !== null)
      : [],
  };
}

export function convertCorrectAnswer(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value === "" || value === "none") return -1;
    if (/^[0-9]+$/.test(value)) return parseInt(value, 10);
    const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    if (letterMap[value.toUpperCase()] !== undefined) return letterMap[value.toUpperCase()];
  }
  return -1;
}

export function convertNewToeflReadingTestToQuestions(test: NewToeflReadingLikeTest): ConvertedReadingQuestion[] {
  const questions: ConvertedReadingQuestion[] = [];

  const completeWords = asCompleteWordsInput(test.completeWords);
  if (completeWords?.paragraph) {
    questions.push({
      type: "complete-words",
      question: "Complete the words",
      passage: completeWords.paragraph || "",
      blanks: completeWords.blanks || [],
      answers: completeWords.answers || [],
      options: [],
      correctAnswer: -1,
    });
  }

  const comprehensionPassages = Array.isArray(test.comprehensionPassages)
    ? test.comprehensionPassages.map(asReadingPassageInput).filter((item): item is ReadingPassageInput => item !== null)
    : [];
  for (const passage of comprehensionPassages) {
    const passageContent = passage.content || "";
    const passageQuestions = passage.questions || [];
    for (const question of passageQuestions) {
      questions.push({
        type: "comprehension",
        question: (question.question || "").replace(/^\d+[.)]\s+/, ""),
        passage: passageContent,
        options: question.options || [],
        correctAnswer: convertCorrectAnswer(question.correctAnswer),
        passageType: passage.type || "notice",
        passageTitle: passage.title || "",
      });
    }
  }

  const academicPassage = asReadingPassageInput(test.academicPassage);
  if (academicPassage?.content) {
    for (const question of academicPassage.questions || []) {
      questions.push({
        type: "academic",
        question: (question.question || "").replace(/^\d+[.)]\s+/, ""),
        passage: academicPassage.content || "",
        options: question.options || [],
        correctAnswer: convertCorrectAnswer(question.correctAnswer),
      });
    }
  }

  return questions;
}

export function generateQuestionHash(question: { question?: string; questionText?: string }): string {
  const text = (question.question || question.questionText || "").toLowerCase().replace(/\s+/g, " ").trim();
  const first50 = text.substring(0, 50);
  let hash = 0;
  for (let i = 0; i < first50.length; i++) {
    const char = first50.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return hash.toString(16);
}
