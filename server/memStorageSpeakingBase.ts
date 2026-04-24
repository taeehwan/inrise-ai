import type {
  InsertSpeakingAttempt,
  InsertSpeakingTest,
  SpeakingAttempt,
  SpeakingTest,
} from "@shared/schema";
import { MemStorageCoreStudyBase } from "./memStorageCoreStudyBase";
import type { SpeakingStorageCaches } from "./lib/speakingStorage";
import {
  createSpeakingAttemptRecord,
  createSpeakingTopicRecord,
  deleteSpeakingTopicRecord,
  getAllListeningAttemptsRecord,
  getAllSpeakingAttemptsRecord,
  getAllSpeakingTopicsRecord,
  getSpeakingAttemptRecord as getSpeakingAttemptCacheRecord,
  getSpeakingTestRecord as getSpeakingTestDbRecord,
  getSpeakingTestsRecord,
  getUserSpeakingAttemptsRecord,
  updateSpeakingAttemptRecord,
  updateSpeakingTopicRecord,
} from "./lib/speakingStorage";

export abstract class MemStorageSpeakingBase extends MemStorageCoreStudyBase {
  protected abstract getSpeakingStorageCaches(): SpeakingStorageCaches;

  async getSpeakingTests(): Promise<SpeakingTest[]> {
    return getSpeakingTestsRecord();
  }

  async getAllSpeakingTopics(): Promise<SpeakingTest[]> {
    return getAllSpeakingTopicsRecord();
  }

  async createSpeakingTopic(topic: InsertSpeakingTest): Promise<SpeakingTest> {
    return createSpeakingTopicRecord(topic);
  }

  async updateSpeakingTopic(id: string, updates: Partial<InsertSpeakingTest>): Promise<SpeakingTest> {
    return updateSpeakingTopicRecord(id, updates);
  }

  async deleteSpeakingTopic(id: string): Promise<boolean> {
    return deleteSpeakingTopicRecord(id);
  }

  async getSpeakingTest(id: string): Promise<SpeakingTest | undefined> {
    return getSpeakingTestDbRecord(id);
  }

  async getSpeakingTestById(id: string): Promise<SpeakingTest | undefined> {
    return getSpeakingTestDbRecord(id);
  }

  async createSpeakingTest(test: InsertSpeakingTest): Promise<SpeakingTest> {
    return createSpeakingTopicRecord(test);
  }

  async updateSpeakingTest(id: string, test: Partial<InsertSpeakingTest>): Promise<SpeakingTest> {
    return updateSpeakingTopicRecord(id, test);
  }

  async deleteSpeakingTest(id: string): Promise<void> {
    await deleteSpeakingTopicRecord(id);
  }

  async createSpeakingAttempt(attempt: InsertSpeakingAttempt): Promise<SpeakingAttempt> {
    return createSpeakingAttemptRecord(this.getSpeakingStorageCaches(), attempt);
  }

  async getSpeakingAttempt(id: string): Promise<SpeakingAttempt | undefined> {
    return getSpeakingAttemptCacheRecord(this.getSpeakingStorageCaches(), id);
  }

  async updateSpeakingAttempt(id: string, attempt: Partial<SpeakingAttempt>): Promise<SpeakingAttempt> {
    return updateSpeakingAttemptRecord(this.getSpeakingStorageCaches(), id, attempt);
  }

  async getUserSpeakingAttempts(userId: string): Promise<SpeakingAttempt[]> {
    return getUserSpeakingAttemptsRecord(this.getSpeakingStorageCaches(), userId);
  }

  async getAllSpeakingAttempts(): Promise<SpeakingAttempt[]> {
    return getAllSpeakingAttemptsRecord(this.getSpeakingStorageCaches());
  }

  async getAllListeningAttempts(): Promise<any[]> {
    return getAllListeningAttemptsRecord();
  }
}
