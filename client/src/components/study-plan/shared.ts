import { z } from "zod";

export const studyPlanFormSchema = z.object({
  name: z.string().min(1, "학습 계획 이름을 입력해주세요"),
  examType: z.enum(["toefl", "gre"]),
  currentScore: z.number().min(0).optional(),
  targetScore: z.number().min(1, "목표 점수를 입력해주세요"),
  targetDate: z.date().optional(),
  duration: z.number().min(1, "학습 기간을 입력해주세요"),
  weeklyHours: z.number().min(1, "주간 학습 시간을 입력해주세요"),
  focusAreas: z.array(z.string()).min(1, "집중할 영역을 선택해주세요"),
  learningStyle: z.enum(["intensive", "balanced", "relaxed"]).default("balanced"),
  weaknessDetails: z.string().optional(),
  preferredTimeSlot: z.enum(["morning", "afternoon", "evening", "night"]).default("evening"),
  sectionScores: z.object({
    reading: z.number().min(0).max(30).optional(),
    listening: z.number().min(0).max(30).optional(),
    speaking: z.number().min(0).max(30).optional(),
    writing: z.number().min(0).max(30).optional(),
    verbal: z.number().min(0).max(170).optional(),
    quantitative: z.number().min(0).max(170).optional(),
    analytical: z.number().min(0).max(6).optional(),
  }).optional(),
  sectionPriorities: z.object({
    reading: z.number().min(1).max(4).optional(),
    listening: z.number().min(1).max(4).optional(),
    speaking: z.number().min(1).max(4).optional(),
    writing: z.number().min(1).max(4).optional(),
    verbal: z.number().min(1).max(3).optional(),
    quantitative: z.number().min(1).max(3).optional(),
    analytical: z.number().min(1).max(3).optional(),
  }).optional()
});

export type StudyPlanFormData = z.infer<typeof studyPlanFormSchema>;

export interface AIWeeklyPlan {
  week: number;
  theme: string;
  goals: string[];
  dailyTasks: Array<{
    day: number;
    section: string;
    activity: string;
    duration: number;
    description: string;
  }>;
  milestone: string;
}

export interface AIGeneratedPlanResult {
  summary: string;
  weeklyPlan: AIWeeklyPlan[];
  recommendations: string[];
  totalTasks: number;
}

export interface StudyPlanPerformanceSummary {
  examType: string;
  totalAttempts: number;
  sectionAnalysis: Array<{
    section: string;
    status: string;
    average: number | null;
    target: number;
    gap: number;
    attempts: number;
    trend: number;
    priority: number;
    recommendation: string;
  }>;
  estimatedCurrentScore: number;
  estimatedTargetScore: number;
  weakestSections: string[];
  strongestSections: string[];
  recentTests: Array<{
    id: string;
    testTitle: string;
    section: string;
    score: number;
    completedAt: string;
  }>;
  studyFocus: Array<{
    section: string;
    currentAvg: number | null;
    target: number;
    hoursRecommended: number;
  }>;
}

export const sectionOptions = {
  toefl: ["reading", "listening", "speaking", "writing"],
  gre: ["verbal", "quantitative", "analytical"]
} as const;

export const sectionLabels = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  verbal: "Verbal Reasoning",
  quantitative: "Quantitative Reasoning",
  analytical: "Analytical Writing"
} as const;
