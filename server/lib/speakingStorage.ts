import { randomUUID } from "crypto";
import { db } from "../db";
import {
  listeningAttempts as listeningAttemptsTable,
  speakingAttempts as speakingAttemptsTable,
  speakingTests,
  type InsertSpeakingAttempt,
  type InsertSpeakingTest,
  type SpeakingAttempt,
  type SpeakingTest,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { asSpeakingType } from "@shared/constants";

export type SpeakingStorageCaches = {
  speakingAttempts: Map<string, SpeakingAttempt>;
};

export async function getSpeakingTestsRecord(): Promise<SpeakingTest[]> {
  try {
    return await db.select().from(speakingTests).where(eq(speakingTests.isActive, true));
  } catch (error) {
    console.error("Failed to fetch active speaking topics:", error);
    return [];
  }
}

export async function getAllSpeakingTopicsRecord(): Promise<SpeakingTest[]> {
  try {
    return await db.select().from(speakingTests);
  } catch (error) {
    console.error("Failed to fetch speaking topics:", error);
    return [];
  }
}

export async function createSpeakingTopicRecord(topic: InsertSpeakingTest): Promise<SpeakingTest> {
  try {
    const speakingType = asSpeakingType(topic.type);
    const [newTopic] = await db
      .insert(speakingTests)
      .values({
        title: topic.title,
        type: speakingType,
        questionType: topic.questionType || null,
        description: topic.description || null,
        topic: topic.topic || null,
        readingPassageTitle: topic.readingPassageTitle || null,
        readingPassage: topic.readingPassage || null,
        readingTime: topic.readingTime || (speakingType === "integrated" ? 45 : 0),
        listeningAudioUrl: topic.listeningAudioUrl || null,
        listeningScript: topic.listeningScript || null,
        questionText: topic.questionText,
        preparationTime: topic.preparationTime || (speakingType === "integrated" ? 30 : 15),
        responseTime: topic.responseTime || (speakingType === "integrated" ? 60 : 45),
        sampleAnswer: topic.sampleAnswer || null,
        isActive: topic.isActive !== false,
      })
      .returning();
    return newTopic;
  } catch (error) {
    console.error("Failed to create speaking topic:", error);
    throw error;
  }
}

export async function updateSpeakingTopicRecord(
  id: string,
  updates: Partial<InsertSpeakingTest>,
): Promise<SpeakingTest> {
  try {
    const updateData: any = { ...updates };
    if (updateData.type) {
      updateData.type = asSpeakingType(updateData.type);
    }
    const [updated] = await db.update(speakingTests).set(updateData).where(eq(speakingTests.id, id)).returning();
    if (!updated) {
      throw new Error("Speaking topic not found");
    }
    return updated;
  } catch (error) {
    console.error("Failed to update speaking topic:", error);
    throw error;
  }
}

export async function deleteSpeakingTopicRecord(id: string): Promise<boolean> {
  try {
    await db.delete(speakingTests).where(eq(speakingTests.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete speaking topic:", error);
    return false;
  }
}

export async function getSpeakingTestRecord(id: string): Promise<SpeakingTest | undefined> {
  try {
    const [test] = await db.select().from(speakingTests).where(eq(speakingTests.id, id));
    return test;
  } catch (error) {
    console.error("Failed to fetch speaking test:", error);
    return undefined;
  }
}

export async function createSpeakingAttemptRecord(
  caches: SpeakingStorageCaches,
  attempt: InsertSpeakingAttempt,
): Promise<SpeakingAttempt> {
  const id = randomUUID();
  const newAttempt: SpeakingAttempt = {
    id,
    ...attempt,
    startedAt: new Date(),
    completedAt: attempt.completedAt || null,
    recordingUrl: attempt.recordingUrl || null,
    transcription: attempt.transcription || null,
    score: attempt.score || null,
    feedback: attempt.feedback || null,
  };
  try {
    const [inserted] = await db.insert(speakingAttemptsTable).values(newAttempt).returning();
    return inserted;
  } catch (error) {
    console.error("Error inserting speaking attempt to database:", error);
    caches.speakingAttempts.set(id, newAttempt);
    return newAttempt;
  }
}

export function getSpeakingAttemptRecord(
  caches: SpeakingStorageCaches,
  id: string,
): SpeakingAttempt | undefined {
  return caches.speakingAttempts.get(id);
}

export function updateSpeakingAttemptRecord(
  caches: SpeakingStorageCaches,
  id: string,
  attempt: Partial<SpeakingAttempt>,
): SpeakingAttempt {
  const existingAttempt = caches.speakingAttempts.get(id);
  if (!existingAttempt) {
    throw new Error("Speaking attempt not found");
  }
  const updatedAttempt = { ...existingAttempt, ...attempt };
  caches.speakingAttempts.set(id, updatedAttempt);
  return updatedAttempt;
}

export function getUserSpeakingAttemptsRecord(
  caches: SpeakingStorageCaches,
  userId: string,
): SpeakingAttempt[] {
  return Array.from(caches.speakingAttempts.values()).filter((attempt) => attempt.userId === userId);
}

export async function getAllSpeakingAttemptsRecord(caches: SpeakingStorageCaches): Promise<SpeakingAttempt[]> {
  try {
    return await db.select().from(speakingAttemptsTable);
  } catch (error) {
    console.error("Error fetching all speaking attempts from database:", error);
    return Array.from(caches.speakingAttempts.values());
  }
}

export async function getAllListeningAttemptsRecord(): Promise<any[]> {
  try {
    const attempts = await db.select().from(listeningAttemptsTable);
    console.log(`[Storage] Fetched ${attempts.length} listening attempts from database`);
    return attempts;
  } catch (error) {
    console.error("Error fetching all listening attempts from database:", error);
    return [];
  }
}
