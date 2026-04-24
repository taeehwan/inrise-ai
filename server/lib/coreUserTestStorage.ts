import { randomUUID } from "crypto";
import { db } from "../db";
import {
  aiGeneratedTests,
  answers as answersTable,
  reviews as reviewsTable,
  testAttempts as testAttemptsTable,
  users as usersTable,
  type Answer,
  type InsertAnswer,
  type InsertQuestion,
  type InsertReview,
  type InsertTestAttempt,
  type InsertTest,
  type InsertUser,
  type Question,
  type Review,
  type Test,
  type TestAttempt,
  type User,
} from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  asDifficultyLevel,
  asExamType,
  asMembershipTier,
  asQuestionType,
  asReviewExamType,
  type Provider,
} from "@shared/constants";

type UserInsert = typeof usersTable.$inferInsert;
type TestAttemptInsert = typeof testAttemptsTable.$inferInsert;

function asQuestionOptions(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}

function asTestExamType(value: string | null | undefined): "toefl" | "gre" | "sat" {
  if (value === "gre" || value === "sat") return value;
  return "toefl";
}

export type CoreStorageCaches = {
  users: Map<string, User>;
  tests: Map<string, Test>;
  questions: Map<string, Question>;
  testAttempts: Map<string, TestAttempt>;
  answers: Map<string, Answer>;
  testSets: Map<string, any>;
};

export async function getUserRecord(caches: CoreStorageCaches, id: string): Promise<User | undefined> {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (user) {
      caches.users.set(id, user);
    }
    return user;
  } catch (error) {
    console.error("Failed to get user:", error);
    return caches.users.get(id);
  }
}

export function getUserByIdRecord(caches: CoreStorageCaches, id: string): Promise<User | undefined> {
  return getUserRecord(caches, id);
}

export async function getUserByUsernameRecord(caches: CoreStorageCaches, username: string): Promise<User | undefined> {
  try {
    if (!username) return undefined;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (user) {
      caches.users.set(user.id, user);
    }
    return user;
  } catch (error) {
    console.error("Failed to get user by username:", error);
    return Array.from(caches.users.values()).find((user) => user.username === username);
  }
}

export async function getUserByEmailRecord(caches: CoreStorageCaches, email: string): Promise<User | undefined> {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user) {
      caches.users.set(user.id, user);
    }
    return user;
  } catch (error) {
    console.error("Failed to get user by email:", error);
    return Array.from(caches.users.values()).find((user) => user.email === email);
  }
}

export async function getUserByProviderIdRecord(
  caches: CoreStorageCaches,
  provider: string,
  providerId: string,
): Promise<User | undefined> {
  try {
    if (!providerId) return undefined;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.provider, provider as Provider), eq(usersTable.providerId, providerId)))
      .limit(1);
    if (user) {
      caches.users.set(user.id, user);
    }
    return user;
  } catch (error) {
    console.error("Failed to get user by provider ID:", error);
    return Array.from(caches.users.values()).find(
      (user) => user.provider === provider && user.providerId === providerId,
    );
  }
}

export async function createUserRecord(caches: CoreStorageCaches, insertUser: InsertUser): Promise<User> {
  const id = randomUUID();
  const userData: UserInsert = {
    id,
    username: insertUser.username || null,
    email: insertUser.email,
    passwordHash: insertUser.passwordHash || null,
    firstName: insertUser.firstName || null,
    lastName: insertUser.lastName || null,
    phone: insertUser.phone || null,
    profileImageUrl: insertUser.profileImageUrl || null,
    country: insertUser.country || null,
    targetExam: asExamType(insertUser.targetExam || "toefl"),
    targetScore: insertUser.targetScore || null,
    role: insertUser.role === "admin" ? "admin" : "user",
    membershipTier: asMembershipTier(insertUser.membershipTier || "guest"),
    subscriptionStatus:
      insertUser.subscriptionStatus === "active" ||
      insertUser.subscriptionStatus === "trial" ||
      insertUser.subscriptionStatus === "cancelled" ||
      insertUser.subscriptionStatus === "past_due"
        ? insertUser.subscriptionStatus
        : "inactive",
    subscriptionId: insertUser.subscriptionId || null,
    subscriptionStartDate: insertUser.subscriptionStartDate || null,
    subscriptionEndDate: insertUser.subscriptionEndDate || null,
    provider:
      insertUser.provider === "google" ||
      insertUser.provider === "naver" ||
      insertUser.provider === "kakao"
        ? insertUser.provider
        : "local",
    providerId: insertUser.providerId || null,
    privacyConsent: insertUser.privacyConsent ?? false,
    marketingConsent: insertUser.marketingConsent ?? false,
    isActive: insertUser.isActive !== false,
    lastLoginAt: insertUser.lastLoginAt || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [user] = await db.insert(usersTable).values(userData).returning();
  caches.users.set(id, user);
  console.log("✅ User saved to database:", { id: user.id, email: user.email });
  return user;
}

export async function updateUserRecord(
  caches: CoreStorageCaches,
  id: string,
  userData: Partial<InsertUser>,
): Promise<User> {
  const updateData: any = { ...userData, updatedAt: new Date() };

  if (updateData.targetExam) {
    updateData.targetExam = asExamType(updateData.targetExam);
  }
  if (updateData.membershipTier) {
    updateData.membershipTier = asMembershipTier(updateData.membershipTier);
  }

  const [updatedUser] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();

  if (!updatedUser) {
    throw new Error("User not found");
  }

  caches.users.set(id, updatedUser);
  return updatedUser;
}

export async function getAllUsersRecord(caches: CoreStorageCaches): Promise<User[]> {
  try {
    const users = await db.select().from(usersTable);
    for (const user of users) {
      caches.users.set(user.id, user);
    }
    return users;
  } catch (error) {
    console.error("Failed to get all users:", error);
    return Array.from(caches.users.values());
  }
}

export async function updateUserTierRecord(caches: CoreStorageCaches, id: string, tier: string): Promise<User> {
  const normalizedTier = asMembershipTier(tier);
  const isPaidTier = ["light", "pro", "max", "master"].includes(normalizedTier);

  const [updatedUser] = await db
    .update(usersTable)
    .set({
      membershipTier: normalizedTier,
      subscriptionStatus: isPaidTier ? "active" : "inactive",
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updatedUser) {
    throw new Error("User not found");
  }

  caches.users.set(id, updatedUser);
  console.log("✅ User tier updated:", { id, tier, subscriptionStatus: isPaidTier ? "active" : "inactive" });
  return updatedUser;
}

export function getAllTestsRecord(caches: CoreStorageCaches): Test[] {
  console.log(
    "Available tests (including TestSets and AI tests):",
    Array.from(caches.tests.values()).map((t) => ({
      id: t.id,
      title: t.title,
      section: t.section,
      examType: t.examType,
    })),
  );
  return Array.from(caches.tests.values());
}

export function getActiveTestsRecord(caches: CoreStorageCaches): Test[] {
  return Array.from(caches.tests.values()).filter((test) => test.isActive !== false);
}

export function getTestsRecord(caches: CoreStorageCaches): Test[] {
  return getActiveTestsRecord(caches);
}

export function getTestsByExamTypeRecord(caches: CoreStorageCaches, examType: "toefl" | "gre"): Test[] {
  return Array.from(caches.tests.values()).filter((test) => test.examType === examType && test.isActive !== false);
}

export async function getTestsBySectionRecord(
  caches: CoreStorageCaches,
  examType: string,
  section: string,
): Promise<Test[]> {
  const activeTests = getActiveTestsRecord(caches);
  return activeTests.filter((test) => test.examType === examType && test.section === section);
}

export function getTestRecord(caches: CoreStorageCaches, id: string): Test | undefined {
  return caches.tests.get(id);
}

export function createTestRecord(caches: CoreStorageCaches, test: InsertTest): Test {
  const newTest: Test = {
    id: randomUUID(),
    title: test.title,
    description: test.description,
    examType: asTestExamType(test.examType),
    section: test.section,
    duration: test.duration,
    questionCount: test.questionCount,
    difficulty: asDifficultyLevel(test.difficulty) || null,
    isActive: test.isActive ?? true,
    createdAt: new Date(),
  };
  caches.tests.set(newTest.id, newTest);
  return newTest;
}

export function updateTestRecord(caches: CoreStorageCaches, id: string, testData: Partial<InsertTest>): Test {
  const existingTest = caches.tests.get(id);
  if (!existingTest) {
    throw new Error("Test not found");
  }
  const updatedTest = {
    ...existingTest,
    ...testData,
    id,
    updatedAt: new Date().toISOString(),
  } as Test;
  caches.tests.set(id, updatedTest);
  return updatedTest;
}

export async function deleteTestRecord(caches: CoreStorageCaches, id: string): Promise<void> {
  caches.tests.delete(id);

  try {
    await db.update(aiGeneratedTests).set({ isActive: false, updatedAt: new Date() }).where(eq(aiGeneratedTests.id, id));
    console.log(`✅ Soft-deleted AI test from database: ${id}`);
  } catch (error) {
    console.log(`Test ${id} not in ai_generated_tests table`);
  }

  if (id.startsWith("ai-")) {
    const testSetId = id.split("-").slice(3).join("-");
    if (testSetId) {
      caches.testSets.delete(testSetId);
      console.log("Deleted associated TestSet:", testSetId);
    }
  }

  Array.from(caches.questions.entries()).forEach(([questionId, question]) => {
    if (question.testId === id) {
      caches.questions.delete(questionId);
    }
  });

  console.log(`✅ Test deleted: ${id}`);
}

export function getQuestionsByTestIdRecord(caches: CoreStorageCaches, testId: string): Question[] {
  return Array.from(caches.questions.values()).filter((question) => question.testId === testId);
}

export function createQuestionRecord(caches: CoreStorageCaches, question: InsertQuestion): Question {
  const id = randomUUID();
  const newQuestion: Question = {
    id,
    testId: question.testId,
    questionText: question.questionText,
    questionType: asQuestionType(question.questionType),
    orderIndex: question.orderIndex,
    options: asQuestionOptions(question.options),
    difficulty: asDifficultyLevel(question.difficulty) || null,
    correctAnswer: question.correctAnswer || null,
    explanation: question.explanation || null,
    points: question.points || null,
    passage: question.passage || null,
    audioUrl: question.audioUrl || null,
    imageUrl: question.imageUrl || null,
    writingPrompt: question.writingPrompt || null,
    quantityA: question.quantityA || null,
    quantityB: question.quantityB || null,
    requiresImage: question.requiresImage ?? false,
    createdAt: new Date(),
  };
  caches.questions.set(id, newQuestion);
  return newQuestion;
}

export function updateQuestionRecord(
  caches: CoreStorageCaches,
  id: string,
  question: Partial<InsertQuestion>,
): Question {
  const existingQuestion = caches.questions.get(id);
  if (!existingQuestion) {
    throw new Error("Question not found");
  }
  const updatedQuestion: Question = {
    ...existingQuestion,
    ...question,
    options: "options" in question ? asQuestionOptions(question.options) : existingQuestion.options,
    questionType: question.questionType
      ? asQuestionType(question.questionType)
      : existingQuestion.questionType,
    difficulty: question.difficulty
      ? asDifficultyLevel(question.difficulty) || null
      : existingQuestion.difficulty,
  };
  caches.questions.set(id, updatedQuestion);
  return updatedQuestion;
}

export function deleteQuestionRecord(caches: CoreStorageCaches, id: string): void {
  caches.questions.delete(id);
}

export function deleteQuestionsByTestIdRecord(caches: CoreStorageCaches, testId: string): void {
  const questionsToDelete = Array.from(caches.questions.values()).filter((question) => question.testId === testId);
  questionsToDelete.forEach((question) => caches.questions.delete(question.id));
}

export async function createTestAttemptRecord(
  caches: CoreStorageCaches,
  attempt: InsertTestAttempt,
): Promise<TestAttempt> {
  const id = randomUUID();
  const newAttempt: TestAttempt = {
    id,
    userId: attempt.userId,
    testId: attempt.testId,
    startedAt: new Date(),
    completedAt: attempt.completedAt ? new Date(attempt.completedAt as any) : attempt.status === "completed" ? new Date() : null,
    totalScore: attempt.totalScore ?? null,
    sectionScores: attempt.sectionScores ?? null,
    timeSpent: attempt.timeSpent ?? 0,
    status: (attempt.status ?? "in_progress") as TestAttempt["status"],
  };
  try {
    const payload: TestAttemptInsert = {
      ...newAttempt,
      status: newAttempt.status,
    };
    const [inserted] = await db.insert(testAttemptsTable).values(payload).returning();
    caches.testAttempts.set(inserted.id, inserted);
    return inserted;
  } catch (error) {
    console.error("Error inserting test attempt to database (saving to memory):", error);
    caches.testAttempts.set(id, newAttempt);
    return newAttempt;
  }
}

export async function getTestAttemptRecord(
  caches: CoreStorageCaches,
  id: string,
): Promise<TestAttempt | undefined> {
  try {
    const [dbAttempt] = await db.select().from(testAttemptsTable).where(eq(testAttemptsTable.id, id));
    if (dbAttempt) return dbAttempt;
  } catch (error) {
    console.error("Error fetching test attempt from database:", error);
  }
  return caches.testAttempts.get(id);
}

export async function updateTestAttemptRecord(
  caches: CoreStorageCaches,
  id: string,
  data: Partial<TestAttempt>,
): Promise<TestAttempt> {
  try {
    const [updated] = await db.update(testAttemptsTable).set(data).where(eq(testAttemptsTable.id, id)).returning();
    if (updated) {
      caches.testAttempts.set(id, updated);
      return updated;
    }
  } catch (error) {
    console.error("Error updating test attempt in database:", error);
  }
  const attempt = caches.testAttempts.get(id);
  if (!attempt) {
    throw new Error("Test attempt not found");
  }
  const updatedAttempt = { ...attempt, ...data };
  caches.testAttempts.set(id, updatedAttempt);
  return updatedAttempt;
}

async function mergeAttemptRecords(
  caches: CoreStorageCaches,
  predicate: (attempt: TestAttempt) => boolean,
  whereClause?: any,
  errorLabel?: string,
): Promise<TestAttempt[]> {
  try {
    const dbAttempts = whereClause
      ? await db.select().from(testAttemptsTable).where(whereClause)
      : await db.select().from(testAttemptsTable);
    const memAttempts = Array.from(caches.testAttempts.values()).filter(predicate);
    const dbIds = new Set(dbAttempts.map((attempt) => attempt.id));
    const uniqueMemAttempts = memAttempts.filter((attempt) => !dbIds.has(attempt.id));
    return [...dbAttempts, ...uniqueMemAttempts];
  } catch (error) {
    console.error(errorLabel ?? "Error fetching test attempts from database:", error);
    return Array.from(caches.testAttempts.values()).filter(predicate);
  }
}

export function getUserTestAttemptsRecord(caches: CoreStorageCaches, userId: string): Promise<TestAttempt[]> {
  return mergeAttemptRecords(
    caches,
    (attempt) => attempt.userId === userId,
    eq(testAttemptsTable.userId, userId),
    "Error fetching user test attempts from database:",
  );
}

export function getAllAttemptsRecord(caches: CoreStorageCaches): Promise<TestAttempt[]> {
  return mergeAttemptRecords(caches, () => true, undefined, "Error fetching all test attempts from database:");
}

export function getTestAttemptsByTestIdRecord(caches: CoreStorageCaches, testId: string): Promise<TestAttempt[]> {
  return mergeAttemptRecords(
    caches,
    (attempt) => attempt.testId === testId,
    eq(testAttemptsTable.testId, testId),
    "Error fetching test attempts by testId from database:",
  );
}

export async function createAnswerRecord(caches: CoreStorageCaches, answer: InsertAnswer): Promise<Answer> {
  const id = randomUUID();
  const newAnswer: Answer = {
    id,
    attemptId: answer.attemptId,
    questionId: answer.questionId,
    userAnswer: answer.userAnswer ?? null,
    isCorrect: answer.isCorrect ?? null,
    pointsEarned: answer.pointsEarned ?? null,
    timeSpent: answer.timeSpent ?? null,
    submittedAt: new Date(),
  };
  try {
    const [inserted] = await db.insert(answersTable).values(newAnswer).returning();
    caches.answers.set(inserted.id, inserted);
    return inserted;
  } catch (error) {
    console.error("Error inserting answer to database (saving to memory):", error);
    caches.answers.set(id, newAnswer);
    return newAnswer;
  }
}

export async function getAnswersByAttemptIdRecord(caches: CoreStorageCaches, attemptId: string): Promise<Answer[]> {
  try {
    const dbAnswers = await db.select().from(answersTable).where(eq(answersTable.attemptId, attemptId));
    const memAnswers = Array.from(caches.answers.values()).filter((answer) => answer.attemptId === attemptId);
    const dbIds = new Set(dbAnswers.map((answer) => answer.id));
    const uniqueMemAnswers = memAnswers.filter((answer) => !dbIds.has(answer.id));
    return [...dbAnswers, ...uniqueMemAnswers];
  } catch (error) {
    console.error("Error fetching answers from database:", error);
    return Array.from(caches.answers.values()).filter((answer) => answer.attemptId === attemptId);
  }
}

export function getAllReviewsRecord(): Promise<Review[]> {
  return db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
}

export function getReviewsRecord(): Promise<Review[]> {
  return db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
}

export function getApprovedReviewsRecord(): Promise<Review[]> {
  return db.select().from(reviewsTable).where(eq(reviewsTable.isApproved, true)).orderBy(desc(reviewsTable.createdAt));
}

export function getUserReviewsRecord(userId: string): Promise<Review[]> {
  return db.select().from(reviewsTable).where(eq(reviewsTable.userId, userId)).orderBy(desc(reviewsTable.createdAt));
}

export async function createReviewRecord(userId: string, review: InsertReview): Promise<Review> {
  const [newReview] = await db
    .insert(reviewsTable)
    .values({
      userId,
      rating: review.rating,
      comment: review.comment,
      reviewerName: review.reviewerName,
      reviewerCountry: review.reviewerCountry,
      examType: asReviewExamType(review.examType) || null,
      achievedScore: review.achievedScore || null,
      imageUrl: review.imageUrl || null,
      videoUrl: review.videoUrl || null,
      isApproved: false,
    })
    .returning();
  return newReview;
}

export async function approveReviewRecord(id: string): Promise<Review> {
  const [updated] = await db.update(reviewsTable).set({ isApproved: true }).where(eq(reviewsTable.id, id)).returning();
  if (!updated) throw new Error("Review not found");
  return updated;
}

export function deleteReviewRecord(id: string): Promise<void> {
  return db.delete(reviewsTable).where(eq(reviewsTable.id, id)) as unknown as Promise<void>;
}

export async function getAverageRatingRecord(): Promise<number> {
  const rows = await db.select({ rating: reviewsTable.rating }).from(reviewsTable).where(eq(reviewsTable.isApproved, true));
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.rating, 0) / rows.length;
}

export async function getTotalReviewsRecord(): Promise<number> {
  const rows = await db.select({ id: reviewsTable.id }).from(reviewsTable).where(eq(reviewsTable.isApproved, true));
  return rows.length;
}

export function getReviewsByExamTypeRecord(examType: "toefl" | "gre"): Promise<Review[]> {
  return db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.examType, examType), eq(reviewsTable.isApproved, true)))
    .orderBy(desc(reviewsTable.createdAt));
}
