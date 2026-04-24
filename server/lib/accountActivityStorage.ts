import type {
  CreditTransaction,
  InsertSavedExplanation,
  InsertTestAuditLog,
  LearningFeedback,
  SavedExplanation,
  TestAuditLog,
  UserCredits,
} from "@shared/schema";
import {
  creditTransactions as creditTransactionsTable,
  INITIAL_CREDITS,
  learningFeedback as learningFeedbackTable,
  savedExplanations as savedExplanationsTable,
  testAuditLogs as testAuditLogsTable,
  userCredits as userCreditsTable,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";

type CreditTransactionInsert = typeof creditTransactionsTable.$inferInsert;
type TestAuditLogInsert = typeof testAuditLogsTable.$inferInsert;
type SavedExplanationInsert = typeof savedExplanationsTable.$inferInsert;

export async function getUserCreditsRecord(userId: string): Promise<UserCredits | undefined> {
  try {
    const [credits] = await db.select().from(userCreditsTable).where(eq(userCreditsTable.userId, userId)).limit(1);
    return credits;
  } catch (error) {
    console.error("Failed to get user credits:", error);
    return undefined;
  }
}

export async function initializeUserCreditsRecord(userId: string, initialBalance?: number): Promise<UserCredits> {
  const balance = initialBalance ?? INITIAL_CREDITS;
  const [created] = await db
    .insert(userCreditsTable)
    .values({ userId, balance, lifetimeEarned: balance, lifetimeUsed: 0 })
    .returning();

  await db.insert(creditTransactionsTable).values({
    userId,
    type: "bonus",
    amount: balance,
    balanceAfter: balance,
    description: "Welcome bonus credits",
    featureType: "bonus",
  });

  console.log("✅ User credits initialized:", userId, "balance:", balance);
  return created;
}

export async function addCreditsRecord(
  userId: string,
  amount: number,
  type: "purchase" | "bonus" | "refund" | "admin_adjustment",
  description: string,
  featureType?: string,
  referenceId?: string,
): Promise<UserCredits> {
  let credits = await getUserCreditsRecord(userId);
  if (!credits) {
    credits = await initializeUserCreditsRecord(userId, 0);
  }

  const newBalance = credits.balance + amount;
  const [updated] = await db
    .update(userCreditsTable)
    .set({
      balance: newBalance,
      lifetimeEarned: credits.lifetimeEarned + amount,
      lastUpdated: new Date(),
    })
    .where(eq(userCreditsTable.userId, userId))
    .returning();

  const transaction: CreditTransactionInsert = {
    userId,
    type,
    amount,
    balanceAfter: newBalance,
    description,
    featureType: (featureType || type) as CreditTransactionInsert["featureType"],
    referenceId,
  };
  await db.insert(creditTransactionsTable).values(transaction);

  console.log("✅ Credits added:", userId, "amount:", amount, "new balance:", newBalance);
  return updated;
}

export async function deductCreditsRecord(
  userId: string,
  amount: number,
  description: string,
  featureType: string,
  referenceId?: string,
): Promise<{ success: boolean; credits?: UserCredits; error?: string }> {
  let credits = await getUserCreditsRecord(userId);
  if (!credits) {
    credits = await initializeUserCreditsRecord(userId);
  }

  if (credits.balance < amount) {
    return {
      success: false,
      error: `Insufficient credits. Required: ${amount}, Available: ${credits.balance}`,
    };
  }

  const newBalance = credits.balance - amount;
  const [updated] = await db
    .update(userCreditsTable)
    .set({
      balance: newBalance,
      lifetimeUsed: credits.lifetimeUsed + amount,
      lastUpdated: new Date(),
    })
    .where(eq(userCreditsTable.userId, userId))
    .returning();

  const transaction: CreditTransactionInsert = {
    userId,
    type: "usage",
    amount: -amount,
    balanceAfter: newBalance,
    description,
    featureType: featureType as CreditTransactionInsert["featureType"],
    referenceId,
  };
  await db.insert(creditTransactionsTable).values(transaction);

  console.log("✅ Credits deducted:", userId, "amount:", amount, "new balance:", newBalance);
  return { success: true, credits: updated };
}

export async function getCreditTransactionsRecord(userId: string, limit = 20): Promise<CreditTransaction[]> {
  try {
    return await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, userId))
      .orderBy(creditTransactionsTable.createdAt)
      .limit(limit);
  } catch (error) {
    console.error("Failed to get credit transactions:", error);
    return [];
  }
}

export async function hasEnoughCreditsRecord(userId: string, requiredAmount: number): Promise<boolean> {
  const credits = await getUserCreditsRecord(userId);
  if (!credits) {
    return INITIAL_CREDITS >= requiredAmount;
  }
  return credits.balance >= requiredAmount;
}

export async function createTestAuditLogRecord(log: InsertTestAuditLog): Promise<TestAuditLog> {
  const id = randomUUID();
  const newLog: TestAuditLog = {
    id,
    testId: log.testId,
    testTitle: log.testTitle,
    testType: log.testType as TestAuditLog["testType"],
    examType: (log.examType || null) as TestAuditLog["examType"],
    section: log.section || null,
    action: log.action as TestAuditLog["action"],
    adminId: log.adminId,
    adminEmail: log.adminEmail,
    previousState: log.previousState || null,
    newState: log.newState || null,
    reason: log.reason || null,
    metadata: log.metadata || null,
    createdAt: new Date(),
  };

  try {
    const [inserted] = await db.insert(testAuditLogsTable).values(newLog).returning();
    console.log(`📝 Audit log created: ${log.action} on test ${log.testId}`);
    return inserted;
  } catch (error) {
    console.error("Failed to create test audit log:", error);
    return newLog;
  }
}

export async function getTestAuditLogsRecord(limit = 100): Promise<TestAuditLog[]> {
  try {
    return await db.select().from(testAuditLogsTable).orderBy(desc(testAuditLogsTable.createdAt)).limit(limit);
  } catch (error) {
    console.error("Failed to get test audit logs:", error);
    return [];
  }
}

export async function getTestAuditLogsByTestIdRecord(testId: string): Promise<TestAuditLog[]> {
  try {
    return await db
      .select()
      .from(testAuditLogsTable)
      .where(eq(testAuditLogsTable.testId, testId))
      .orderBy(desc(testAuditLogsTable.createdAt));
  } catch (error) {
    console.error("Failed to get test audit logs by test ID:", error);
    return [];
  }
}

export async function getTestAuditLogsByActionRecord(action: string): Promise<TestAuditLog[]> {
  try {
    return await db
      .select()
      .from(testAuditLogsTable)
      .where(eq(testAuditLogsTable.action, action as TestAuditLogInsert["action"]))
      .orderBy(desc(testAuditLogsTable.createdAt));
  } catch (error) {
    console.error("Failed to get test audit logs by action:", error);
    return [];
  }
}

export async function getLearningFeedbackRecord(userId: string): Promise<LearningFeedback | null> {
  try {
    const result = await db
      .select()
      .from(learningFeedbackTable)
      .where(eq(learningFeedbackTable.userId, userId))
      .orderBy(desc(learningFeedbackTable.updatedAt))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Failed to get learning feedback:", error);
    return null;
  }
}

export async function saveLearningFeedbackRecord(userId: string, feedbackData: unknown): Promise<LearningFeedback> {
  const existing = await db.select().from(learningFeedbackTable).where(eq(learningFeedbackTable.userId, userId)).limit(1);

  if (existing.length > 0) {
    const updated = await db
      .update(learningFeedbackTable)
      .set({ feedbackData, updatedAt: new Date() })
      .where(eq(learningFeedbackTable.userId, userId))
      .returning();
    return updated[0];
  }

  const created = await db.insert(learningFeedbackTable).values({ userId, feedbackData }).returning();
  return created[0];
}

export async function createSavedExplanationRecord(data: InsertSavedExplanation): Promise<SavedExplanation> {
  const payload: SavedExplanationInsert = {
    userId: data.userId,
    type: data.type as SavedExplanationInsert["type"],
    section: data.section as SavedExplanationInsert["section"],
    questionText: data.questionText.substring(0, 500),
    content: data.content,
    testId: data.testId,
  };
  const created = await db
    .insert(savedExplanationsTable)
    .values(payload)
    .returning();
  return created[0];
}

export async function getUserSavedExplanationsRecord(
  userId: string,
  options?: { type?: string; section?: string; limit?: number },
): Promise<SavedExplanation[]> {
  try {
    const conditions = [eq(savedExplanationsTable.userId, userId)];
    if (options?.type) {
      conditions.push(eq(savedExplanationsTable.type, options.type as any));
    }
    if (options?.section) {
      conditions.push(eq(savedExplanationsTable.section, options.section as any));
    }

    return await db
      .select()
      .from(savedExplanationsTable)
      .where(and(...conditions))
      .orderBy(desc(savedExplanationsTable.createdAt))
      .limit(options?.limit ?? 100);
  } catch (error) {
    console.error("Failed to get saved explanations:", error);
    return [];
  }
}
