import { randomUUID } from "crypto";
import { db } from "../db";
import {
  greAnalyticalWritingTests,
  greTestAttempts as greTestAttemptsTable,
  satTestAttempts as satTestAttemptsTable,
  writingAttempts as writingAttemptsTable,
  type GreAnalyticalWritingTest,
  type GreQuantitativeQuestion,
  type GreQuantitativeReasoningTest,
  type GreTest,
  type GreTestAttempt,
  type GreVerbalQuestion,
  type GreVerbalReasoningTest,
  type InsertGreAnalyticalWritingTest,
  type InsertGreQuantitativeQuestion,
  type InsertGreQuantitativeReasoningTest,
  type InsertGreTest,
  type InsertGreTestAttempt,
  type InsertGreVerbalQuestion,
  type InsertGreVerbalReasoningTest,
  type InsertQuestion,
  type InsertWritingAttempt,
  type InsertWritingTest,
  type Question,
  type SatTestAttempt,
  type WritingAttempt,
  type WritingTest,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export type WritingGreCaches = {
  writingTests: Map<string, WritingTest>;
  writingAttempts: Map<string, WritingAttempt>;
  greTests: Map<string, GreTest>;
  greVerbalReasoningTests: Map<string, GreVerbalReasoningTest>;
  greVerbalQuestions: Map<string, GreVerbalQuestion>;
  greQuantitativeReasoningTests: Map<string, GreQuantitativeReasoningTest>;
  greQuantitativeQuestions: Map<string, GreQuantitativeQuestion>;
  greTestAttempts: Map<string, GreTestAttempt>;
  questions: Map<string, Question>;
};

type GreAdminQuestion = Question & {
  examType?: string;
  section?: string;
};

function asWritingType(value: string): WritingTest["type"] {
  return value === "integrated" ? "integrated" : "discussion";
}

function asGreTestType(value: string): GreTest["type"] {
  if (value === "verbal_reasoning" || value === "quantitative_reasoning") return value;
  return "analytical_writing";
}

function asGreTaskType(value: string): GreAnalyticalWritingTest["taskType"] {
  return value === "analyze_argument" ? "analyze_argument" : "analyze_issue";
}

function asGreVerbalQuestionType(value: string): GreVerbalQuestion["questionType"] {
  if (value === "sentence_equivalence" || value === "reading_comprehension" || value === "multiple_choice") {
    return value;
  }
  return "text_completion";
}

function asGreQuantQuestionType(value: string): GreQuantitativeQuestion["questionType"] {
  if (value === "multiple_choice" || value === "numeric_entry" || value === "multiple_answer") {
    return value;
  }
  return "quantitative_comparison";
}

function asGreAttemptType(value: string): GreTestAttempt["testType"] {
  if (value === "verbal_reasoning" || value === "quantitative_reasoning") return value;
  return "analytical_writing";
}

function asAttemptStatus(value: string | null | undefined): GreTestAttempt["status"] {
  if (value === "completed" || value === "abandoned") return value;
  return "in_progress";
}

function asMainQuestionType(value: string): Question["questionType"] {
  switch (value) {
    case "essay":
    case "speaking":
    case "listening":
    case "fill_blank":
    case "quant-comparison":
    case "quant-multiple":
    case "quant-multi-select":
    case "quant-numeric":
      return value;
    default:
      return "multiple-choice";
  }
}

export function getWritingTestsRecord(caches: WritingGreCaches): WritingTest[] {
  return Array.from(caches.writingTests.values());
}

export function getWritingTestRecord(caches: WritingGreCaches, id: string): WritingTest | undefined {
  return caches.writingTests.get(id);
}

export function createWritingTestRecord(caches: WritingGreCaches, test: InsertWritingTest): WritingTest {
  const id = randomUUID();
  const newTest: WritingTest = {
    id,
    title: test.title,
    type: asWritingType(test.type),
    description: test.description ?? null,
    readingPassage: test.readingPassage ?? null,
    readingTime: test.readingTime ?? null,
    listeningAudioUrl: test.listeningAudioUrl ?? null,
    listeningScript: test.listeningScript ?? null,
    discussionTopic: test.discussionTopic ?? null,
    student1Opinion: test.student1Opinion ?? null,
    student2Opinion: test.student2Opinion ?? null,
    questionText: test.questionText,
    writingTime: test.writingTime,
    wordLimit: test.wordLimit ?? null,
    sampleEssay: test.sampleEssay ?? null,
    isActive: test.isActive ?? null,
    createdAt: new Date(),
  };
  caches.writingTests.set(id, newTest);
  return newTest;
}

export function updateWritingTestRecord(
  caches: WritingGreCaches,
  id: string,
  test: Partial<InsertWritingTest>,
): WritingTest {
  const existingTest = caches.writingTests.get(id);
  if (!existingTest) throw new Error("Writing test not found");
  const updatedTest: WritingTest = {
    ...existingTest,
    ...test,
    type: test.type ? asWritingType(test.type) : existingTest.type,
  };
  caches.writingTests.set(id, updatedTest);
  return updatedTest;
}

export function deleteWritingTestRecord(caches: WritingGreCaches, id: string): void {
  caches.writingTests.delete(id);
}

export async function createWritingAttemptRecord(
  caches: WritingGreCaches,
  attempt: InsertWritingAttempt,
): Promise<WritingAttempt> {
  const id = randomUUID();
  const newAttempt: WritingAttempt = {
    id,
    ...attempt,
    startedAt: new Date(),
    completedAt: attempt.completedAt || null,
    score: attempt.score || null,
    feedback: attempt.feedback || null,
    essayText: attempt.essayText || null,
    wordCount: attempt.wordCount || null,
  };
  try {
    const [inserted] = await db.insert(writingAttemptsTable).values(newAttempt).returning();
    return inserted;
  } catch (error) {
    console.error("Error inserting writing attempt to database:", error);
    caches.writingAttempts.set(id, newAttempt);
    return newAttempt;
  }
}

export function getWritingAttemptRecord(
  caches: WritingGreCaches,
  id: string,
): WritingAttempt | undefined {
  return caches.writingAttempts.get(id);
}

export function updateWritingAttemptRecord(
  caches: WritingGreCaches,
  id: string,
  attempt: Partial<WritingAttempt>,
): WritingAttempt {
  const existingAttempt = caches.writingAttempts.get(id);
  if (!existingAttempt) throw new Error("Writing attempt not found");
  const updatedAttempt = { ...existingAttempt, ...attempt };
  caches.writingAttempts.set(id, updatedAttempt);
  return updatedAttempt;
}

export function getUserWritingAttemptsRecord(caches: WritingGreCaches, userId: string): WritingAttempt[] {
  return Array.from(caches.writingAttempts.values()).filter((attempt) => attempt.userId === userId);
}

export async function getAllWritingAttemptsRecord(caches: WritingGreCaches): Promise<WritingAttempt[]> {
  try {
    return await db.select().from(writingAttemptsTable);
  } catch (error) {
    console.error("Error fetching all writing attempts from database:", error);
    return Array.from(caches.writingAttempts.values());
  }
}

export function getGreTestsRecord(caches: WritingGreCaches): GreTest[] {
  return Array.from(caches.greTests.values());
}

export function getGreTestRecord(caches: WritingGreCaches, id: string): GreTest | undefined {
  return caches.greTests.get(id);
}

export function createGreTestRecord(caches: WritingGreCaches, test: InsertGreTest): GreTest {
  const id = randomUUID();
  const newTest: GreTest = {
    id,
    title: test.title,
    type: asGreTestType(test.type),
    description: test.description ?? null,
    duration: test.duration,
    isActive: test.isActive ?? null,
    createdAt: new Date(),
  };
  caches.greTests.set(id, newTest);
  return newTest;
}

export function updateGreTestRecord(
  caches: WritingGreCaches,
  id: string,
  test: Partial<InsertGreTest>,
): GreTest {
  const existingTest = caches.greTests.get(id);
  if (!existingTest) throw new Error("GRE test not found");
  const updatedTest: GreTest = {
    ...existingTest,
    ...test,
    type: test.type ? asGreTestType(test.type) : existingTest.type,
  };
  caches.greTests.set(id, updatedTest);
  return updatedTest;
}

export function deleteGreTestRecord(caches: WritingGreCaches, id: string): void {
  caches.greTests.delete(id);
}

export async function getGreAnalyticalWritingTestsRecord(): Promise<GreAnalyticalWritingTest[]> {
  try {
    return await db.select().from(greAnalyticalWritingTests);
  } catch (error) {
    console.error("Failed to fetch GRE writing tests:", error);
    return [];
  }
}

export async function getGreAnalyticalWritingTestRecord(
  id: string,
): Promise<GreAnalyticalWritingTest | undefined> {
  try {
    const [test] = await db.select().from(greAnalyticalWritingTests).where(eq(greAnalyticalWritingTests.id, id));
    return test;
  } catch (error) {
    console.error("Failed to fetch GRE writing test:", error);
    return undefined;
  }
}

export async function createGreAnalyticalWritingTestRecord(
  test: InsertGreAnalyticalWritingTest,
): Promise<GreAnalyticalWritingTest> {
  try {
    const payload = {
      title: test.title,
      taskType: asGreTaskType(test.taskType),
      prompt: test.prompt,
      instructions: test.instructions,
      timeLimit: test.timeLimit ?? 30,
      sampleEssay: test.sampleEssay ?? null,
      isActive: test.isActive !== false,
    };
    const [newTest] = await db
      .insert(greAnalyticalWritingTests)
      .values(payload)
      .returning();
    return newTest;
  } catch (error) {
    console.error("Failed to create GRE writing test:", error);
    throw error;
  }
}

export async function updateGreAnalyticalWritingTestRecord(
  id: string,
  test: Partial<InsertGreAnalyticalWritingTest>,
): Promise<GreAnalyticalWritingTest> {
  try {
    const payload = {
      ...test,
      taskType: test.taskType ? asGreTaskType(test.taskType) : undefined,
    };
    const [updated] = await db.update(greAnalyticalWritingTests).set(payload).where(eq(greAnalyticalWritingTests.id, id)).returning();
    if (!updated) throw new Error("GRE Analytical Writing test not found");
    return updated;
  } catch (error) {
    console.error("Failed to update GRE writing test:", error);
    throw error;
  }
}

export async function deleteGreAnalyticalWritingTestRecord(id: string): Promise<void> {
  try {
    await db.delete(greAnalyticalWritingTests).where(eq(greAnalyticalWritingTests.id, id));
  } catch (error) {
    console.error("Failed to delete GRE writing test:", error);
    throw error;
  }
}

export function getGreVerbalReasoningTestsRecord(caches: WritingGreCaches): GreVerbalReasoningTest[] {
  return Array.from(caches.greVerbalReasoningTests.values());
}

export function getGreVerbalReasoningTestRecord(
  caches: WritingGreCaches,
  id: string,
): GreVerbalReasoningTest | undefined {
  return caches.greVerbalReasoningTests.get(id);
}

export function createGreVerbalReasoningTestRecord(
  caches: WritingGreCaches,
  test: InsertGreVerbalReasoningTest,
): GreVerbalReasoningTest {
  const id = randomUUID();
  const newTest: GreVerbalReasoningTest = {
    id,
    title: test.title,
    description: test.description ?? null,
    timeLimit: test.timeLimit ?? null,
    isActive: test.isActive ?? null,
    createdAt: new Date(),
  };
  caches.greVerbalReasoningTests.set(id, newTest);
  return newTest;
}

export function updateGreVerbalReasoningTestRecord(
  caches: WritingGreCaches,
  id: string,
  test: Partial<InsertGreVerbalReasoningTest>,
): GreVerbalReasoningTest {
  const existingTest = caches.greVerbalReasoningTests.get(id);
  if (!existingTest) throw new Error("GRE Verbal Reasoning test not found");
  const updatedTest: GreVerbalReasoningTest = { ...existingTest, ...test };
  caches.greVerbalReasoningTests.set(id, updatedTest);
  return updatedTest;
}

export function deleteGreVerbalReasoningTestRecord(caches: WritingGreCaches, id: string): void {
  caches.greVerbalReasoningTests.delete(id);
}

export function getGreVerbalQuestionsRecord(caches: WritingGreCaches, testId: string): GreVerbalQuestion[] {
  return Array.from(caches.greVerbalQuestions.values()).filter((question) => question.testId === testId);
}

export function createGreVerbalQuestionRecord(
  caches: WritingGreCaches,
  question: InsertGreVerbalQuestion,
): GreVerbalQuestion {
  const id = randomUUID();
  const newQuestion: GreVerbalQuestion = {
    id,
    testId: question.testId,
    questionType: asGreVerbalQuestionType(question.questionType),
    passage: question.passage ?? null,
    questionText: question.questionText,
    options: question.options ?? null,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation ?? null,
    blanks: question.blanks ?? null,
    orderIndex: question.orderIndex,
    createdAt: new Date(),
  };
  caches.greVerbalQuestions.set(id, newQuestion);
  return newQuestion;
}

export function updateGreVerbalQuestionRecord(
  caches: WritingGreCaches,
  id: string,
  question: Partial<InsertGreVerbalQuestion>,
): GreVerbalQuestion {
  const existingQuestion = caches.greVerbalQuestions.get(id);
  if (!existingQuestion) throw new Error("GRE Verbal question not found");
  const updatedQuestion: GreVerbalQuestion = {
    ...existingQuestion,
    ...question,
    questionType: question.questionType ? asGreVerbalQuestionType(question.questionType) : existingQuestion.questionType,
  };
  caches.greVerbalQuestions.set(id, updatedQuestion);
  return updatedQuestion;
}

export function deleteGreVerbalQuestionRecord(caches: WritingGreCaches, id: string): void {
  caches.greVerbalQuestions.delete(id);
}

export function getGreQuantitativeReasoningTestsRecord(
  caches: WritingGreCaches,
): GreQuantitativeReasoningTest[] {
  return Array.from(caches.greQuantitativeReasoningTests.values());
}

export function getGreQuantitativeReasoningTestRecord(
  caches: WritingGreCaches,
  id: string,
): GreQuantitativeReasoningTest | undefined {
  return caches.greQuantitativeReasoningTests.get(id);
}

export function createGreQuantitativeReasoningTestRecord(
  caches: WritingGreCaches,
  test: InsertGreQuantitativeReasoningTest,
): GreQuantitativeReasoningTest {
  const id = randomUUID();
  const newTest: GreQuantitativeReasoningTest = {
    id,
    title: test.title,
    description: test.description ?? null,
    timeLimit: test.timeLimit ?? null,
    isActive: test.isActive ?? null,
    createdAt: new Date(),
  };
  caches.greQuantitativeReasoningTests.set(id, newTest);
  return newTest;
}

export function updateGreQuantitativeReasoningTestRecord(
  caches: WritingGreCaches,
  id: string,
  test: Partial<InsertGreQuantitativeReasoningTest>,
): GreQuantitativeReasoningTest {
  const existingTest = caches.greQuantitativeReasoningTests.get(id);
  if (!existingTest) throw new Error("GRE Quantitative Reasoning test not found");
  const updatedTest: GreQuantitativeReasoningTest = { ...existingTest, ...test };
  caches.greQuantitativeReasoningTests.set(id, updatedTest);
  return updatedTest;
}

export function deleteGreQuantitativeReasoningTestRecord(
  caches: WritingGreCaches,
  id: string,
): void {
  caches.greQuantitativeReasoningTests.delete(id);
}

export function getGreQuantitativeQuestionsRecord(
  caches: WritingGreCaches,
  testId: string,
): GreQuantitativeQuestion[] {
  return Array.from(caches.greQuantitativeQuestions.values()).filter((question) => question.testId === testId);
}

export function createGreQuantitativeQuestionRecord(
  caches: WritingGreCaches,
  question: InsertGreQuantitativeQuestion,
): GreQuantitativeQuestion {
  const id = randomUUID();
  const newQuestion: GreQuantitativeQuestion = {
    id,
    testId: question.testId,
    questionType: asGreQuantQuestionType(question.questionType),
    questionText: question.questionText,
    quantityA: question.quantityA ?? null,
    quantityB: question.quantityB ?? null,
    options: question.options ?? null,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation ?? null,
    figures: question.figures ?? null,
    orderIndex: question.orderIndex,
    createdAt: new Date(),
  };
  caches.greQuantitativeQuestions.set(id, newQuestion);
  return newQuestion;
}

export function updateGreQuantitativeQuestionRecord(
  caches: WritingGreCaches,
  id: string,
  question: Partial<InsertGreQuantitativeQuestion>,
): GreQuantitativeQuestion {
  const existingQuestion = caches.greQuantitativeQuestions.get(id);
  if (!existingQuestion) throw new Error("GRE Quantitative question not found");
  const updatedQuestion: GreQuantitativeQuestion = {
    ...existingQuestion,
    ...question,
    questionType: question.questionType ? asGreQuantQuestionType(question.questionType) : existingQuestion.questionType,
  };
  caches.greQuantitativeQuestions.set(id, updatedQuestion);
  return updatedQuestion;
}

export function deleteGreQuantitativeQuestionRecord(caches: WritingGreCaches, id: string): void {
  caches.greQuantitativeQuestions.delete(id);
}

export async function createGreTestAttemptRecord(
  caches: WritingGreCaches,
  attempt: InsertGreTestAttempt,
): Promise<GreTestAttempt> {
  const id = randomUUID();
  const newAttempt: GreTestAttempt = {
    id,
    userId: attempt.userId,
    testType: asGreAttemptType(attempt.testType),
    testId: attempt.testId,
    answers: attempt.answers ?? null,
    score: attempt.score ?? null,
    timeSpent: attempt.timeSpent ?? null,
    status: asAttemptStatus(attempt.status),
    startedAt: new Date(),
    completedAt: attempt.completedAt ?? null,
  };
  try {
    const [inserted] = await db.insert(greTestAttemptsTable).values(newAttempt).returning();
    return inserted;
  } catch (error) {
    console.error("Error inserting GRE test attempt to database:", error);
    caches.greTestAttempts.set(id, newAttempt);
    return newAttempt;
  }
}

export function getGreTestAttemptRecord(
  caches: WritingGreCaches,
  id: string,
): GreTestAttempt | undefined {
  return caches.greTestAttempts.get(id);
}

export function updateGreTestAttemptRecord(
  caches: WritingGreCaches,
  id: string,
  attempt: Partial<GreTestAttempt>,
): GreTestAttempt {
  const existingAttempt = caches.greTestAttempts.get(id);
  if (!existingAttempt) throw new Error("GRE test attempt not found");
  const updatedAttempt = { ...existingAttempt, ...attempt };
  caches.greTestAttempts.set(id, updatedAttempt);
  return updatedAttempt;
}

export function getUserGreTestAttemptsRecord(caches: WritingGreCaches, userId: string): GreTestAttempt[] {
  return Array.from(caches.greTestAttempts.values()).filter((attempt) => attempt.userId === userId);
}

export async function getAllGreTestAttemptsRecord(caches: WritingGreCaches): Promise<GreTestAttempt[]> {
  try {
    return await db.select().from(greTestAttemptsTable);
  } catch (error) {
    console.error("Error fetching all GRE test attempts from database:", error);
    return Array.from(caches.greTestAttempts.values());
  }
}

export async function getAllSatTestAttemptsRecord(): Promise<SatTestAttempt[]> {
  try {
    return await db.select().from(satTestAttemptsTable);
  } catch (error) {
    console.error("Error fetching all SAT test attempts from database:", error);
    return [];
  }
}

export function getGreWritingTopicsRecord(caches: WritingGreCaches): Question[] {
  return (Array.from(caches.questions.values()) as GreAdminQuestion[]).filter(
    (question) => question.examType === "gre" && question.section === "analytical-writing",
  );
}

export function createGreWritingTopicRecord(caches: WritingGreCaches, topic: InsertQuestion): Question {
  const id = randomUUID();
  const newQuestion = {
    id,
    ...topic,
    questionType: asMainQuestionType(topic.questionType),
    options: topic.options ?? null,
    correctAnswer: topic.correctAnswer ?? null,
    explanation: topic.explanation ?? null,
    points: topic.points ?? null,
    passage: topic.passage ?? null,
    audioUrl: topic.audioUrl ?? null,
    imageUrl: topic.imageUrl ?? null,
    writingPrompt: topic.writingPrompt ?? null,
    quantityA: topic.quantityA ?? null,
    quantityB: topic.quantityB ?? null,
    requiresImage: topic.requiresImage ?? null,
    difficulty: topic.difficulty ?? null,
    createdAt: new Date(),
    examType: "gre",
    section: "analytical-writing",
  } as GreAdminQuestion;
  caches.questions.set(id, newQuestion);
  return newQuestion;
}

export function getGreAdminVerbalQuestionsRecord(caches: WritingGreCaches): Question[] {
  return (Array.from(caches.questions.values()) as GreAdminQuestion[]).filter(
    (question) => question.examType === "gre" && question.section === "verbal-reasoning",
  );
}

export function createGreAdminVerbalQuestionRecord(
  caches: WritingGreCaches,
  question: InsertQuestion,
): Question {
  const id = randomUUID();
  const newQuestion = {
    id,
    ...question,
    questionType: asMainQuestionType(question.questionType),
    options: question.options ?? null,
    correctAnswer: question.correctAnswer ?? null,
    explanation: question.explanation ?? null,
    points: question.points ?? null,
    passage: question.passage ?? null,
    audioUrl: question.audioUrl ?? null,
    imageUrl: question.imageUrl ?? null,
    writingPrompt: question.writingPrompt ?? null,
    quantityA: question.quantityA ?? null,
    quantityB: question.quantityB ?? null,
    requiresImage: question.requiresImage ?? null,
    difficulty: question.difficulty ?? null,
    createdAt: new Date(),
    examType: "gre",
    section: "verbal-reasoning",
  } as GreAdminQuestion;
  caches.questions.set(id, newQuestion);
  return newQuestion;
}

export function getGreAdminQuantitativeQuestionsRecord(caches: WritingGreCaches): Question[] {
  return (Array.from(caches.questions.values()) as GreAdminQuestion[]).filter(
    (question) => question.examType === "gre" && question.section === "quantitative-reasoning",
  );
}

export function createGreAdminQuantitativeQuestionRecord(
  caches: WritingGreCaches,
  question: InsertQuestion,
): Question {
  const id = randomUUID();
  const newQuestion = {
    id,
    ...question,
    questionType: asMainQuestionType(question.questionType),
    options: question.options ?? null,
    correctAnswer: question.correctAnswer ?? null,
    explanation: question.explanation ?? null,
    points: question.points ?? null,
    passage: question.passage ?? null,
    audioUrl: question.audioUrl ?? null,
    imageUrl: question.imageUrl ?? null,
    writingPrompt: question.writingPrompt ?? null,
    quantityA: question.quantityA ?? null,
    quantityB: question.quantityB ?? null,
    requiresImage: question.requiresImage ?? null,
    difficulty: question.difficulty ?? null,
    createdAt: new Date(),
    examType: "gre",
    section: "quantitative-reasoning",
  } as GreAdminQuestion;
  caches.questions.set(id, newQuestion);
  return newQuestion;
}
