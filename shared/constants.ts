// Shared constants for type-safe enums across the application

export const EXAM_TYPES = {
  TOEFL: "toefl" as const,
  GRE: "gre" as const,
  BOTH: "both" as const,
} as const;

export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple-choice" as const,
  ESSAY: "essay" as const,
  SPEAKING: "speaking" as const,
  LISTENING: "listening" as const,
  FILL_BLANK: "fill_blank" as const,
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: "easy" as const,
  MEDIUM: "medium" as const,
  HARD: "hard" as const,
} as const;

export const USER_ROLES = {
  USER: "user" as const,
  ADMIN: "admin" as const,
} as const;

export const MEMBERSHIP_TIERS = {
  GUEST: "guest" as const,
  LIGHT: "light" as const,
  PRO: "pro" as const,
  MAX: "max" as const,
  MASTER: "master" as const,
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active" as const,
  INACTIVE: "inactive" as const,
  TRIAL: "trial" as const,
  CANCELLED: "cancelled" as const,
  PAST_DUE: "past_due" as const,
} as const;

export const PROVIDERS = {
  GOOGLE: "google" as const,
  NAVER: "naver" as const,
  KAKAO: "kakao" as const,
  LOCAL: "local" as const,
} as const;

export const TEST_ATTEMPT_STATUS = {
  IN_PROGRESS: "in_progress" as const,
  COMPLETED: "completed" as const,
  ABANDONED: "abandoned" as const,
  PAUSED: "paused" as const,
} as const;

export const REVIEW_EXAM_TYPES = {
  TOEFL: "toefl" as const,
  GRE: "gre" as const,
  GENERAL: "general" as const,
} as const;

export const PLAN_DIFFICULTY = {
  BEGINNER: "beginner" as const,
  INTERMEDIATE: "intermediate" as const,
  ADVANCED: "advanced" as const,
} as const;

export const PLAN_STATUS = {
  ACTIVE: "active" as const,
  COMPLETED: "completed" as const,
  PAUSED: "paused" as const,
} as const;

export const FAQ_CATEGORIES = {
  GENERAL: "general" as const,
  TOEFL: "toefl" as const,
  GRE: "gre" as const,
  TECHNICAL: "technical" as const,
} as const;

export const SPEAKING_TYPES = {
  INDEPENDENT: "independent" as const,
  INTEGRATED: "integrated" as const,
} as const;

export const WRITING_TYPES = {
  INTEGRATED: "integrated" as const,
  DISCUSSION: "discussion" as const,
} as const;

// Type helpers to convert const objects to union types
export type ExamType = typeof EXAM_TYPES[keyof typeof EXAM_TYPES];
export type QuestionType = typeof QUESTION_TYPES[keyof typeof QUESTION_TYPES];
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type MembershipTier = typeof MEMBERSHIP_TIERS[keyof typeof MEMBERSHIP_TIERS];
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];
export type Provider = typeof PROVIDERS[keyof typeof PROVIDERS];
export type TestAttemptStatus = typeof TEST_ATTEMPT_STATUS[keyof typeof TEST_ATTEMPT_STATUS];
export type ReviewExamType = typeof REVIEW_EXAM_TYPES[keyof typeof REVIEW_EXAM_TYPES];
export type PlanDifficulty = typeof PLAN_DIFFICULTY[keyof typeof PLAN_DIFFICULTY];
export type PlanStatus = typeof PLAN_STATUS[keyof typeof PLAN_STATUS];
export type FaqCategory = typeof FAQ_CATEGORIES[keyof typeof FAQ_CATEGORIES];
export type SpeakingType = typeof SPEAKING_TYPES[keyof typeof SPEAKING_TYPES];
export type WritingType = typeof WRITING_TYPES[keyof typeof WRITING_TYPES];

// Type guard helpers for validation and safe type conversion
export function isQuestionType(value: string): value is QuestionType {
  return Object.values(QUESTION_TYPES).includes(value as any);
}

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return Object.values(DIFFICULTY_LEVELS).includes(value as any);
}

export function isExamType(value: string): value is ExamType {
  return Object.values(EXAM_TYPES).includes(value as any);
}

export function isReviewExamType(value: string): value is ReviewExamType {
  return Object.values(REVIEW_EXAM_TYPES).includes(value as any);
}

export function isFaqCategory(value: string): value is FaqCategory {
  return Object.values(FAQ_CATEGORIES).includes(value as any);
}

export function isSpeakingType(value: string): value is SpeakingType {
  return Object.values(SPEAKING_TYPES).includes(value as any);
}

export function isWritingType(value: string): value is WritingType {
  return Object.values(WRITING_TYPES).includes(value as any);
}

export function isPlanStatus(value: string): value is PlanStatus {
  return Object.values(PLAN_STATUS).includes(value as any);
}

export function isMembershipTier(value: string): value is MembershipTier {
  return Object.values(MEMBERSHIP_TIERS).includes(value as any);
}

// Safe conversion helpers with defaults
export function asQuestionType(value: string | null | undefined, defaultValue: QuestionType = QUESTION_TYPES.MULTIPLE_CHOICE): QuestionType {
  if (!value) return defaultValue;
  return isQuestionType(value) ? value : defaultValue;
}

export function asDifficultyLevel(value: string | null | undefined, defaultValue: DifficultyLevel = DIFFICULTY_LEVELS.MEDIUM): DifficultyLevel {
  if (!value) return defaultValue;
  return isDifficultyLevel(value) ? value : defaultValue;
}

export function asExamType(value: string | null | undefined, defaultValue: ExamType = EXAM_TYPES.TOEFL): ExamType {
  if (!value) return defaultValue;
  return isExamType(value) ? value : defaultValue;
}

export function asReviewExamType(value: string | null | undefined, defaultValue: ReviewExamType = REVIEW_EXAM_TYPES.GENERAL): ReviewExamType {
  if (!value) return defaultValue;
  return isReviewExamType(value) ? value : defaultValue;
}

export function asFaqCategory(value: string | null | undefined, defaultValue: FaqCategory = FAQ_CATEGORIES.GENERAL): FaqCategory {
  if (!value) return defaultValue;
  return isFaqCategory(value) ? value : defaultValue;
}

export function asSpeakingType(value: string | null | undefined, defaultValue: SpeakingType = SPEAKING_TYPES.INDEPENDENT): SpeakingType {
  if (!value) return defaultValue;
  return isSpeakingType(value) ? value : defaultValue;
}

export function asWritingType(value: string | null | undefined, defaultValue: WritingType = WRITING_TYPES.INTEGRATED): WritingType {
  if (!value) return defaultValue;
  return isWritingType(value) ? value : defaultValue;
}

export function asPlanStatus(value: string | null | undefined, defaultValue: PlanStatus = PLAN_STATUS.ACTIVE): PlanStatus {
  if (!value) return defaultValue;
  return isPlanStatus(value) ? value : defaultValue;
}

export function asMembershipTier(value: string | null | undefined, defaultValue: MembershipTier = MEMBERSHIP_TIERS.GUEST): MembershipTier {
  if (!value) return defaultValue;
  return isMembershipTier(value) ? value : defaultValue;
}
