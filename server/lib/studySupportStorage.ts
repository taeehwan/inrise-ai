import { randomUUID } from "crypto";
import {
  type AdminMessage,
  type Faq,
  type InsertAdminMessage,
  type InsertFaq,
  type InsertStudyProgress,
  type InsertStudySchedule,
  type InsertUserStudyPlan,
  type StudyPlan,
  type StudyProgress,
  type StudyScheduleItem,
  type UserStudyPlan,
} from "@shared/schema";
import { asExamType, asFaqCategory, asPlanStatus } from "@shared/constants";

type PlanExamType = UserStudyPlan["examType"];

export type StudySupportCaches = {
  adminMessages: Map<string, AdminMessage>;
  faqs: Map<string, Faq>;
  userStudyPlans: Map<string, UserStudyPlan>;
  studyScheduleItems: Map<string, StudyScheduleItem>;
  studyProgress: Map<string, StudyProgress>;
};

const DEFAULT_STUDY_PLANS: StudyPlan[] = [
  {
    id: "toefl-beginner",
    name: "TOEFL Starter Plan",
    examType: "toefl",
    targetScore: 80,
    duration: 8,
    difficulty: "beginner",
    price: "99.00",
    features: ["Daily practice", "Progress tracking", "Personalized feedback"],
    testCount: 20,
  },
  {
    id: "toefl-advanced",
    name: "TOEFL Advanced Plan",
    examType: "toefl",
    targetScore: 100,
    duration: 12,
    difficulty: "advanced",
    price: "149.00",
    features: ["Advanced strategies", "Mock tests", "Expert feedback"],
    testCount: 30,
  },
  {
    id: "gre-standard",
    name: "GRE Standard Plan",
    examType: "gre",
    targetScore: 320,
    duration: 10,
    difficulty: "intermediate",
    price: "129.00",
    features: ["Adaptive learning", "Performance analytics", "Strategy guides"],
    testCount: 25,
  },
];

export function getStudyPlansRecord(): StudyPlan[] {
  return DEFAULT_STUDY_PLANS;
}

export function getStudyPlansByExamTypeRecord(examType: "toefl" | "gre"): StudyPlan[] {
  return DEFAULT_STUDY_PLANS.filter((plan) => plan.examType === examType);
}

export function createAdminMessageRecord(
  caches: StudySupportCaches,
  message: InsertAdminMessage,
): AdminMessage {
  const id = randomUUID();
  const newMessage: AdminMessage = {
    id,
    fromUserId: message.fromUserId,
    toUserId: message.toUserId || null,
    subject: message.subject,
    message: message.message,
    isRead: message.isRead || null,
    createdAt: new Date(),
  };
  caches.adminMessages.set(id, newMessage);
  return newMessage;
}

export function getAdminMessagesRecord(caches: StudySupportCaches): AdminMessage[] {
  return Array.from(caches.adminMessages.values());
}

export function getUserMessagesRecord(caches: StudySupportCaches, userId: string): AdminMessage[] {
  return Array.from(caches.adminMessages.values()).filter((message) => message.toUserId === userId);
}

export function markMessageAsReadRecord(caches: StudySupportCaches, messageId: string): void {
  const message = caches.adminMessages.get(messageId);
  if (message) {
    message.isRead = true;
    caches.adminMessages.set(messageId, message);
  }
}

export function getFaqsRecord(caches: StudySupportCaches): Faq[] {
  return Array.from(caches.faqs.values());
}

export function createFaqRecord(caches: StudySupportCaches, faq: InsertFaq): Faq {
  const id = randomUUID();
  const newFaq: Faq = {
    id,
    question: faq.question,
    answer: faq.answer,
    category: asFaqCategory(faq.category) || null,
    order: faq.order || null,
    isActive: faq.isActive !== undefined ? faq.isActive : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  caches.faqs.set(id, newFaq);
  return newFaq;
}

export function updateFaqRecord(caches: StudySupportCaches, id: string, faq: Partial<InsertFaq>): Faq {
  const existingFaq = caches.faqs.get(id);
  if (!existingFaq) {
    throw new Error("FAQ not found");
  }
  const updatedFaq: Faq = {
    ...existingFaq,
    question: faq.question !== undefined ? faq.question : existingFaq.question,
    answer: faq.answer !== undefined ? faq.answer : existingFaq.answer,
    category: faq.category !== undefined ? asFaqCategory(faq.category) || null : existingFaq.category,
    order: faq.order !== undefined ? faq.order : existingFaq.order,
    isActive: faq.isActive !== undefined ? faq.isActive : existingFaq.isActive,
    updatedAt: new Date(),
  };
  caches.faqs.set(id, updatedFaq);
  return updatedFaq;
}

export function deleteFaqRecord(caches: StudySupportCaches, id: string): void {
  caches.faqs.delete(id);
}

export function createUserStudyPlanRecord(
  caches: StudySupportCaches,
  userId: string,
  plan: InsertUserStudyPlan,
): UserStudyPlan {
  const id = randomUUID();
  const newPlan: UserStudyPlan = {
    id,
    userId,
    name: plan.name,
    examType: (asExamType(plan.examType) === "both" ? "toefl" : asExamType(plan.examType)) as PlanExamType,
    currentScore: plan.currentScore || null,
    targetScore: plan.targetScore,
    targetDate: plan.targetDate || null,
    duration: plan.duration,
    status: asPlanStatus(plan.status) || null,
    weeklyHours: plan.weeklyHours || null,
    focusAreas: plan.focusAreas || null,
    learningStyle: (plan as any).learningStyle || null,
    weaknessDetails: (plan as any).weaknessDetails || null,
    studyEnvironment: (plan as any).studyEnvironment || null,
    preferredTimeSlot: (plan as any).preferredTimeSlot || null,
    aiGeneratedPlan: (plan as any).aiGeneratedPlan || null,
    aiPlanSummary: (plan as any).aiPlanSummary || null,
    completedTasks: 0,
    totalTasks: (plan as any).totalTasks || 0,
    completedTaskKeys: [],
    achievementBadges: [],
    lastActivityAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  caches.userStudyPlans.set(id, newPlan);
  return newPlan;
}

export function getUserStudyPlansRecord(caches: StudySupportCaches, userId: string): UserStudyPlan[] {
  return Array.from(caches.userStudyPlans.values()).filter((plan) => plan.userId === userId);
}

export function getUserStudyPlanRecord(caches: StudySupportCaches, id: string): UserStudyPlan | undefined {
  return caches.userStudyPlans.get(id);
}

export function updateUserStudyPlanRecord(
  caches: StudySupportCaches,
  id: string,
  plan: Partial<UserStudyPlan>,
): UserStudyPlan {
  const existingPlan = caches.userStudyPlans.get(id);
  if (!existingPlan) {
    throw new Error("User study plan not found");
  }
  const updatedPlan = { ...existingPlan, ...plan, updatedAt: new Date() };
  caches.userStudyPlans.set(id, updatedPlan);
  return updatedPlan;
}

export function createStudyScheduleItemRecord(
  caches: StudySupportCaches,
  item: InsertStudySchedule,
): StudyScheduleItem {
  const id = randomUUID();
  const newItem: StudyScheduleItem = {
    id,
    userStudyPlanId: item.userStudyPlanId,
    date: item.date,
    activity: item.activity,
    section: item.section,
    estimatedTime: item.estimatedTime || null,
    isCompleted: item.isCompleted || null,
    completedAt: item.completedAt || null,
    notes: item.notes || null,
    testId: item.testId || null,
    createdAt: new Date(),
  };
  caches.studyScheduleItems.set(id, newItem);
  return newItem;
}

export function getStudyScheduleRecord(caches: StudySupportCaches, userStudyPlanId: string): StudyScheduleItem[] {
  return Array.from(caches.studyScheduleItems.values()).filter((item) => item.userStudyPlanId === userStudyPlanId);
}

export function updateStudyScheduleItemRecord(
  caches: StudySupportCaches,
  id: string,
  item: Partial<StudyScheduleItem>,
): StudyScheduleItem {
  const existingItem = caches.studyScheduleItems.get(id);
  if (!existingItem) {
    throw new Error("Study schedule item not found");
  }
  const updatedItem = { ...existingItem, ...item };
  caches.studyScheduleItems.set(id, updatedItem);
  return updatedItem;
}

export function createStudyProgressRecord(
  caches: StudySupportCaches,
  progress: InsertStudyProgress,
): StudyProgress {
  const id = randomUUID();
  const newProgress: StudyProgress = {
    id,
    userStudyPlanId: progress.userStudyPlanId,
    week: progress.week,
    sectionScores: progress.sectionScores || null,
    completedActivities: progress.completedActivities || null,
    totalActivities: progress.totalActivities || null,
    studyHours: progress.studyHours || null,
    averageScore: progress.averageScore || null,
    improvementRate: progress.improvementRate || null,
    createdAt: new Date(),
  };
  caches.studyProgress.set(id, newProgress);
  return newProgress;
}

export function getStudyProgressRecord(caches: StudySupportCaches, userStudyPlanId: string): StudyProgress[] {
  return Array.from(caches.studyProgress.values()).filter((progress) => progress.userStudyPlanId === userStudyPlanId);
}

export function updateStudyProgressRecord(
  caches: StudySupportCaches,
  id: string,
  progress: Partial<StudyProgress>,
): StudyProgress {
  const existingProgress = caches.studyProgress.get(id);
  if (!existingProgress) {
    throw new Error("Study progress not found");
  }
  const updatedProgress = { ...existingProgress, ...progress, updatedAt: new Date() };
  caches.studyProgress.set(id, updatedProgress);
  return updatedProgress;
}
