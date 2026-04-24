import { z } from "zod";

export const testQuestionSchema = z.object({
  title: z.string().min(1, "제목을 입력하세요"),
  examType: z.enum(["toefl", "gre"]),
  section: z.enum(["speaking", "writing"]),
  type: z.string(),
  questionType: z.string().optional(),
  questionText: z.string().min(1, "질문 내용을 입력하세요"),
  topic: z.string().optional(),
  readingPassageTitle: z.string().optional(),
  readingPassage: z.string().optional(),
  readingTime: z.number().min(0).default(0),
  listeningScript: z.string().optional(),
  listeningAudioUrl: z.string().optional(),
  preparationTime: z.number().min(1).default(15),
  responseTime: z.number().min(1).default(45),
  description: z.string().optional(),
});

export type TestQuestionForm = z.infer<typeof testQuestionSchema>;

export interface TestQuestion {
  id: string;
  title: string;
  examType: "toefl" | "gre";
  section: "speaking" | "writing";
  type: string;
  questionType?: string;
  questionText: string;
  topic?: string;
  readingPassageTitle?: string;
  readingPassage?: string;
  readingTime?: number;
  listeningScript?: string;
  listeningAudioUrl?: string;
  preparationTime: number;
  responseTime: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export type AdminSpeakingTopicsTab = "toefl-speaking" | "gre-writing";

export function getDefaultTopicForm(
  currentTestType: AdminSpeakingTopicsTab,
  topic?: TestQuestion | null,
): TestQuestionForm {
  if (topic) {
    return {
      title: topic.title,
      examType: topic.examType,
      section: topic.section,
      type: topic.type,
      questionType: topic.questionType,
      questionText: topic.questionText,
      topic: topic.topic,
      readingPassageTitle: topic.readingPassageTitle,
      readingPassage: topic.readingPassage,
      readingTime: topic.readingTime ?? 0,
      listeningScript: topic.listeningScript,
      listeningAudioUrl: topic.listeningAudioUrl,
      preparationTime: topic.preparationTime,
      responseTime: topic.responseTime,
      description: topic.description,
    };
  }

  return {
    title: "",
    examType: currentTestType === "toefl-speaking" ? "toefl" : "gre",
    section: currentTestType === "toefl-speaking" ? "speaking" : "writing",
    type: currentTestType === "toefl-speaking" ? "independent" : "",
    questionText: "",
    readingTime: 0,
    preparationTime: 15,
    responseTime: currentTestType === "toefl-speaking" ? 45 : 1800,
  };
}
