export interface Question {
  id: string;
  questionType: string;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  passage?: string;
  points?: number;
}

export type AITestCreatorSection =
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "verbal"
  | "quant"
  | "reading-writing"
  | "math";

export interface NewToeflReadingQuestion {
  type: "complete-words" | "comprehension" | "academic";
  passage: string;
  answers?: string[];
  question?: string;
  options?: string[];
  correctAnswer?: string;
  answerConfirmed?: boolean;
  blankLengths?: number[];
}

export interface NewToeflListeningQuestion {
  type: "choose-response" | "conversation" | "announcement" | "academic-talk";
  prompt?: string;
  script?: string;
  question?: string;
  options: string[];
  correctAnswer: string;
  answerConfirmed?: boolean;
  explanation?: string;
}

export interface NewToeflSpeakingQuestion {
  type: "listen-repeat" | "interview";
  sentence?: string;
  question?: string;
  sampleAnswer: string;
}

export interface NewToeflWritingQuestion {
  type: "build-sentence" | "email" | "discussion";
  words?: string[];
  contextSentence?: string;
  sentenceTemplate?: string;
  correctOrder?: number[];
  scenario?: string;
  topic?: string;
  answer?: string;
  sampleAnswer?: string;
  professorName?: string;
  professorQuestion?: string;
  studentResponses?: Array<{ name: string; response: string }>;
}
