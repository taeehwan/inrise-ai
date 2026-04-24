import type {
  InsertNewToeflFeedbackRequest,
  InsertNewToeflFullTest,
  InsertNewToeflFullTestAttempt,
  InsertNewToeflListeningTest,
  InsertNewToeflReadingTest,
  InsertNewToeflSpeakingTest,
  InsertNewToeflWritingTest,
  NewToeflFeedbackRequest,
  NewToeflFullTest,
  NewToeflFullTestAttempt,
  NewToeflListeningTest,
  NewToeflReadingTest,
  NewToeflSpeakingTest,
  NewToeflWritingTest,
} from "@shared/schema";
import {
  newToeflFeedbackRequests as newToeflFeedbackRequestsTable,
  newToeflFullTestAttempts as newToeflFullTestAttemptsTable,
  newToeflFullTests as newToeflFullTestsTable,
  newToeflListeningTests as newToeflListeningTestsTable,
  newToeflReadingTests as newToeflReadingTestsTable,
  newToeflSpeakingTests as newToeflSpeakingTestsTable,
  newToeflWritingTests as newToeflWritingTestsTable,
} from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";

type ReadingInsert = typeof newToeflReadingTestsTable.$inferInsert;
type ListeningInsert = typeof newToeflListeningTestsTable.$inferInsert;
type WritingInsert = typeof newToeflWritingTestsTable.$inferInsert;
type SpeakingInsert = typeof newToeflSpeakingTestsTable.$inferInsert;
type FeedbackRequestInsert = typeof newToeflFeedbackRequestsTable.$inferInsert;
type FullTestInsert = typeof newToeflFullTestsTable.$inferInsert;
type FullTestAttemptInsert = typeof newToeflFullTestAttemptsTable.$inferInsert;

function asDifficulty(value: string | null | undefined): ReadingInsert["difficulty"] {
  return value === "easy" || value === "medium" || value === "hard" ? value : null;
}

function asFeedbackTestType(value: string): FeedbackRequestInsert["testType"] {
  return value === "speaking" ? "speaking" : "writing";
}

function asAttemptStatus(value: string | null | undefined): FullTestAttemptInsert["status"] {
  if (value === "completed" || value === "abandoned") return value;
  return "in_progress";
}

function asCurrentSection(value: string | null | undefined): FullTestAttemptInsert["currentSection"] {
  if (
    value === "reading" ||
    value === "listening" ||
    value === "speaking" ||
    value === "writing" ||
    value === "completed"
  ) {
    return value;
  }
  return undefined;
}

function asCefrLevel(value: string | null | undefined): FullTestAttemptInsert["cefrLevel"] {
  if (value === "A1" || value === "A2" || value === "B1" || value === "B2" || value === "C1" || value === "C2") {
    return value;
  }
  return undefined;
}

export async function getNewToeflReadingTestsRecord(): Promise<NewToeflReadingTest[]> {
  try {
    return await db.select().from(newToeflReadingTestsTable);
  } catch (error) {
    console.error("Failed to get new TOEFL reading tests:", error);
    return [];
  }
}

export async function getNewToeflReadingTestRecord(id: string): Promise<NewToeflReadingTest | undefined> {
  const [test] = await db.select().from(newToeflReadingTestsTable).where(eq(newToeflReadingTestsTable.id, id)).limit(1);
  return test;
}

export async function createNewToeflReadingTestRecord(test: InsertNewToeflReadingTest): Promise<NewToeflReadingTest> {
  const payload: ReadingInsert = {
    ...test,
    difficulty: asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const [created] = await db
    .insert(newToeflReadingTestsTable)
    .values(payload)
    .returning();
  return created;
}

export async function updateNewToeflReadingTestRecord(
  id: string,
  test: Partial<InsertNewToeflReadingTest>,
): Promise<NewToeflReadingTest> {
  const payload: Partial<ReadingInsert> = {
    ...test,
    difficulty: test.difficulty === undefined ? undefined : asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const [updated] = await db
    .update(newToeflReadingTestsTable)
    .set(payload)
    .where(eq(newToeflReadingTestsTable.id, id))
    .returning();
  return updated;
}

export async function deleteNewToeflReadingTestRecord(id: string): Promise<void> {
  await db.delete(newToeflReadingTestsTable).where(eq(newToeflReadingTestsTable.id, id));
}

export async function getNewToeflListeningTestsRecord(): Promise<NewToeflListeningTest[]> {
  try {
    return await db.select().from(newToeflListeningTestsTable).orderBy(newToeflListeningTestsTable.createdAt);
  } catch (error) {
    console.error("Failed to get new TOEFL listening tests:", error);
    return [];
  }
}

export async function getNewToeflListeningTestRecord(id: string): Promise<NewToeflListeningTest | undefined> {
  const [test] = await db.select().from(newToeflListeningTestsTable).where(eq(newToeflListeningTestsTable.id, id)).limit(1);
  return test;
}

export async function createNewToeflListeningTestRecord(
  test: InsertNewToeflListeningTest,
): Promise<NewToeflListeningTest> {
  const payload: ListeningInsert = {
    ...test,
    difficulty: asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const [created] = await db
    .insert(newToeflListeningTestsTable)
    .values(payload)
    .returning();
  return created;
}

export async function updateNewToeflListeningTestRecord(
  id: string,
  test: Partial<InsertNewToeflListeningTest>,
): Promise<NewToeflListeningTest> {
  const payload: Partial<ListeningInsert> = {
    ...test,
    difficulty: test.difficulty === undefined ? undefined : asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const [updated] = await db
    .update(newToeflListeningTestsTable)
    .set(payload)
    .where(eq(newToeflListeningTestsTable.id, id))
    .returning();
  return updated;
}

export async function deleteNewToeflListeningTestRecord(id: string): Promise<void> {
  await db.delete(newToeflListeningTestsTable).where(eq(newToeflListeningTestsTable.id, id));
}

export async function getNewToeflWritingTestsRecord(): Promise<NewToeflWritingTest[]> {
  try {
    return await db.select().from(newToeflWritingTestsTable).orderBy(newToeflWritingTestsTable.createdAt);
  } catch (error) {
    console.error("Failed to get new TOEFL writing tests:", error);
    return [];
  }
}

export async function getNewToeflWritingTestRecord(id: string): Promise<NewToeflWritingTest | undefined> {
  const [test] = await db.select().from(newToeflWritingTestsTable).where(eq(newToeflWritingTestsTable.id, id)).limit(1);
  return test;
}

export async function createNewToeflWritingTestRecord(
  test: InsertNewToeflWritingTest,
): Promise<NewToeflWritingTest> {
  const payload: WritingInsert = {
    ...test,
    difficulty: asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const [created] = await db
    .insert(newToeflWritingTestsTable)
    .values(payload)
    .returning();
  return created;
}

export async function updateNewToeflWritingTestRecord(
  id: string,
  test: Partial<InsertNewToeflWritingTest>,
): Promise<NewToeflWritingTest> {
  const payload: Partial<WritingInsert> = {
    ...test,
    difficulty: test.difficulty === undefined ? undefined : asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const [updated] = await db
    .update(newToeflWritingTestsTable)
    .set(payload)
    .where(eq(newToeflWritingTestsTable.id, id))
    .returning();
  return updated;
}

export async function deleteNewToeflWritingTestRecord(id: string): Promise<void> {
  await db.delete(newToeflWritingTestsTable).where(eq(newToeflWritingTestsTable.id, id));
}

export async function getNewToeflSpeakingTestsRecord(): Promise<NewToeflSpeakingTest[]> {
  try {
    return await db.select().from(newToeflSpeakingTestsTable);
  } catch (error) {
    console.error("Failed to get new TOEFL speaking tests:", error);
    return [];
  }
}

export async function getNewToeflSpeakingTestRecord(id: string): Promise<NewToeflSpeakingTest | undefined> {
  const [test] = await db.select().from(newToeflSpeakingTestsTable).where(eq(newToeflSpeakingTestsTable.id, id));
  return test;
}

export async function createNewToeflSpeakingTestRecord(
  test: InsertNewToeflSpeakingTest,
): Promise<NewToeflSpeakingTest> {
  const payload: SpeakingInsert = {
    ...test,
    difficulty: asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const [created] = await db
    .insert(newToeflSpeakingTestsTable)
    .values(payload)
    .returning();
  return created;
}

export async function updateNewToeflSpeakingTestRecord(
  id: string,
  test: Partial<InsertNewToeflSpeakingTest>,
): Promise<NewToeflSpeakingTest> {
  const payload: Partial<SpeakingInsert> = {
    ...test,
    difficulty: test.difficulty === undefined ? undefined : asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const [updated] = await db
    .update(newToeflSpeakingTestsTable)
    .set(payload)
    .where(eq(newToeflSpeakingTestsTable.id, id))
    .returning();
  return updated;
}

export async function deleteNewToeflSpeakingTestRecord(id: string): Promise<void> {
  await db.delete(newToeflSpeakingTestsTable).where(eq(newToeflSpeakingTestsTable.id, id));
}

export async function createFeedbackRequestRecord(
  request: InsertNewToeflFeedbackRequest,
): Promise<NewToeflFeedbackRequest> {
  const payload: FeedbackRequestInsert = {
    ...request,
    testType: asFeedbackTestType(request.testType),
    status: "pending",
    updatedAt: new Date(),
  };
  const [created] = await db
    .insert(newToeflFeedbackRequestsTable)
    .values(payload)
    .returning();
  return created;
}

export async function getFeedbackRequestRecord(id: string): Promise<NewToeflFeedbackRequest | undefined> {
  const [request] = await db.select().from(newToeflFeedbackRequestsTable).where(eq(newToeflFeedbackRequestsTable.id, id));
  return request;
}

export async function getUserFeedbackRequestsRecord(userId: string): Promise<NewToeflFeedbackRequest[]> {
  return db.select().from(newToeflFeedbackRequestsTable).where(eq(newToeflFeedbackRequestsTable.userId, userId));
}

export async function getPendingFeedbackRequestsRecord(): Promise<NewToeflFeedbackRequest[]> {
  return db.select().from(newToeflFeedbackRequestsTable).where(eq(newToeflFeedbackRequestsTable.status, "pending"));
}

export async function getAllFeedbackRequestsRecord(): Promise<NewToeflFeedbackRequest[]> {
  return db.select().from(newToeflFeedbackRequestsTable);
}

export async function approveFeedbackRequestRecord(
  id: string,
  adminId: string,
  feedback: any,
  totalScore: number,
): Promise<NewToeflFeedbackRequest> {
  const [updated] = await db
    .update(newToeflFeedbackRequestsTable)
    .set({
      status: "approved",
      feedback,
      totalScore,
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(newToeflFeedbackRequestsTable.id, id))
    .returning();
  return updated;
}

export async function rejectFeedbackRequestRecord(id: string, adminId: string): Promise<NewToeflFeedbackRequest> {
  const [updated] = await db
    .update(newToeflFeedbackRequestsTable)
    .set({
      status: "rejected",
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(newToeflFeedbackRequestsTable.id, id))
    .returning();
  return updated;
}

export async function getApprovedFeedbackForUserRecord(userId: string): Promise<NewToeflFeedbackRequest[]> {
  return db
    .select()
    .from(newToeflFeedbackRequestsTable)
    .where(and(eq(newToeflFeedbackRequestsTable.userId, userId), eq(newToeflFeedbackRequestsTable.status, "approved")));
}

export async function getNewToeflFullTestsRecord(): Promise<NewToeflFullTest[]> {
  return db.select().from(newToeflFullTestsTable).orderBy(desc(newToeflFullTestsTable.createdAt));
}

export async function getNewToeflFullTestRecord(id: string): Promise<NewToeflFullTest | undefined> {
  const results = await db.select().from(newToeflFullTestsTable).where(eq(newToeflFullTestsTable.id, id));
  return results[0];
}

export async function createNewToeflFullTestRecord(test: InsertNewToeflFullTest): Promise<NewToeflFullTest> {
  const payload: FullTestInsert = {
    ...test,
    difficulty: asDifficulty(test.difficulty),
  };
  const results = await db.insert(newToeflFullTestsTable).values(payload).returning();
  return results[0];
}

export async function updateNewToeflFullTestRecord(
  id: string,
  test: Partial<InsertNewToeflFullTest>,
): Promise<NewToeflFullTest> {
  const payload: Partial<FullTestInsert> = {
    ...test,
    difficulty: test.difficulty === undefined ? undefined : asDifficulty(test.difficulty),
    updatedAt: new Date(),
  };
  const results = await db
    .update(newToeflFullTestsTable)
    .set(payload)
    .where(eq(newToeflFullTestsTable.id, id))
    .returning();
  return results[0];
}

export async function deleteNewToeflFullTestRecord(id: string): Promise<void> {
  await db.delete(newToeflFullTestsTable).where(eq(newToeflFullTestsTable.id, id));
}

export async function createNewToeflFullTestAttemptRecord(
  attempt: InsertNewToeflFullTestAttempt,
): Promise<NewToeflFullTestAttempt> {
  const payload: FullTestAttemptInsert = {
    ...attempt,
    cefrLevel: asCefrLevel(attempt.cefrLevel),
    currentSection: asCurrentSection(attempt.currentSection),
    status: asAttemptStatus(attempt.status),
  };
  const results = await db.insert(newToeflFullTestAttemptsTable).values(payload).returning();
  return results[0];
}

export async function getNewToeflFullTestAttemptRecord(id: string): Promise<NewToeflFullTestAttempt | undefined> {
  const results = await db.select().from(newToeflFullTestAttemptsTable).where(eq(newToeflFullTestAttemptsTable.id, id));
  return results[0];
}

export async function getUserNewToeflFullTestAttemptsRecord(
  userId: string,
): Promise<NewToeflFullTestAttempt[]> {
  return db
    .select()
    .from(newToeflFullTestAttemptsTable)
    .where(eq(newToeflFullTestAttemptsTable.userId, userId))
    .orderBy(desc(newToeflFullTestAttemptsTable.startedAt));
}

export async function updateNewToeflFullTestAttemptRecord(
  id: string,
  data: Partial<InsertNewToeflFullTestAttempt>,
): Promise<NewToeflFullTestAttempt> {
  const payload: Partial<FullTestAttemptInsert> = {
    ...data,
    cefrLevel: data.cefrLevel === undefined ? undefined : asCefrLevel(data.cefrLevel),
    currentSection: data.currentSection === undefined ? undefined : asCurrentSection(data.currentSection),
    status: data.status === undefined ? undefined : asAttemptStatus(data.status),
    updatedAt: new Date(),
  };
  const results = await db
    .update(newToeflFullTestAttemptsTable)
    .set(payload)
    .where(eq(newToeflFullTestAttemptsTable.id, id))
    .returning();
  return results[0];
}
