import type {
  GreAnalyticalWritingTest,
  GreQuantitativeQuestion,
  GreQuantitativeReasoningTest,
  GreTest,
  GreTestAttempt,
  GreVerbalQuestion,
  GreVerbalReasoningTest,
  InsertGreAnalyticalWritingTest,
  InsertGreQuantitativeQuestion,
  InsertGreQuantitativeReasoningTest,
  InsertGreTest,
  InsertGreTestAttempt,
  InsertGreVerbalQuestion,
  InsertGreVerbalReasoningTest,
  InsertQuestion,
  InsertWritingAttempt,
  InsertWritingTest,
  Question,
  SatTestAttempt,
  WritingAttempt,
  WritingTest,
} from "@shared/schema";
import type { WritingGreCaches } from "./lib/writingGreStorage";
import { MemStorageSpeakingBase } from "./memStorageSpeakingBase";
import {
  createGreAdminQuantitativeQuestionRecord,
  createGreAdminVerbalQuestionRecord,
  createGreAnalyticalWritingTestRecord,
  createGreQuantitativeQuestionRecord,
  createGreQuantitativeReasoningTestRecord,
  createGreTestAttemptRecord,
  createGreTestRecord,
  createGreVerbalQuestionRecord,
  createGreVerbalReasoningTestRecord,
  createGreWritingTopicRecord,
  createWritingAttemptRecord,
  createWritingTestRecord,
  deleteGreAnalyticalWritingTestRecord,
  deleteGreQuantitativeQuestionRecord,
  deleteGreQuantitativeReasoningTestRecord,
  deleteGreTestRecord,
  deleteGreVerbalQuestionRecord,
  deleteGreVerbalReasoningTestRecord,
  deleteWritingTestRecord,
  getAllGreTestAttemptsRecord,
  getAllSatTestAttemptsRecord,
  getAllWritingAttemptsRecord,
  getGreAdminQuantitativeQuestionsRecord,
  getGreAdminVerbalQuestionsRecord,
  getGreAnalyticalWritingTestRecord,
  getGreAnalyticalWritingTestsRecord,
  getGreQuantitativeQuestionsRecord,
  getGreQuantitativeReasoningTestRecord,
  getGreQuantitativeReasoningTestsRecord,
  getGreTestAttemptRecord,
  getGreTestRecord,
  getGreTestsRecord,
  getGreVerbalQuestionsRecord,
  getGreVerbalReasoningTestRecord,
  getGreVerbalReasoningTestsRecord,
  getGreWritingTopicsRecord,
  getUserGreTestAttemptsRecord,
  getUserWritingAttemptsRecord,
  getWritingAttemptRecord,
  getWritingTestRecord,
  getWritingTestsRecord,
  updateGreAnalyticalWritingTestRecord,
  updateGreQuantitativeQuestionRecord,
  updateGreQuantitativeReasoningTestRecord,
  updateGreTestAttemptRecord,
  updateGreTestRecord,
  updateGreVerbalQuestionRecord,
  updateGreVerbalReasoningTestRecord,
  updateWritingAttemptRecord,
  updateWritingTestRecord,
} from "./lib/writingGreStorage";

export abstract class MemStorageWritingGreBase extends MemStorageSpeakingBase {
  protected abstract getWritingGreCaches(): WritingGreCaches;

  async getWritingTests(): Promise<WritingTest[]> {
    return getWritingTestsRecord(this.getWritingGreCaches());
  }

  async getWritingTest(id: string): Promise<WritingTest | undefined> {
    return getWritingTestRecord(this.getWritingGreCaches(), id);
  }

  async createWritingTest(test: InsertWritingTest): Promise<WritingTest> {
    return createWritingTestRecord(this.getWritingGreCaches(), test);
  }

  async updateWritingTest(id: string, test: Partial<InsertWritingTest>): Promise<WritingTest> {
    return updateWritingTestRecord(this.getWritingGreCaches(), id, test);
  }

  async deleteWritingTest(id: string): Promise<void> {
    return deleteWritingTestRecord(this.getWritingGreCaches(), id);
  }

  async createWritingAttempt(attempt: InsertWritingAttempt): Promise<WritingAttempt> {
    return createWritingAttemptRecord(this.getWritingGreCaches(), attempt);
  }

  async getWritingAttempt(id: string): Promise<WritingAttempt | undefined> {
    return getWritingAttemptRecord(this.getWritingGreCaches(), id);
  }

  async updateWritingAttempt(id: string, attempt: Partial<WritingAttempt>): Promise<WritingAttempt> {
    return updateWritingAttemptRecord(this.getWritingGreCaches(), id, attempt);
  }

  async getUserWritingAttempts(userId: string): Promise<WritingAttempt[]> {
    return getUserWritingAttemptsRecord(this.getWritingGreCaches(), userId);
  }

  async getAllWritingAttempts(): Promise<WritingAttempt[]> {
    return getAllWritingAttemptsRecord(this.getWritingGreCaches());
  }

  async getGreTests(): Promise<GreTest[]> {
    return getGreTestsRecord(this.getWritingGreCaches());
  }

  async getGreTest(id: string): Promise<GreTest | undefined> {
    return getGreTestRecord(this.getWritingGreCaches(), id);
  }

  async createGreTest(test: InsertGreTest): Promise<GreTest> {
    return createGreTestRecord(this.getWritingGreCaches(), test);
  }

  async updateGreTest(id: string, test: Partial<InsertGreTest>): Promise<GreTest> {
    return updateGreTestRecord(this.getWritingGreCaches(), id, test);
  }

  async deleteGreTest(id: string): Promise<void> {
    return deleteGreTestRecord(this.getWritingGreCaches(), id);
  }

  async getGreAnalyticalWritingTests(): Promise<GreAnalyticalWritingTest[]> {
    return getGreAnalyticalWritingTestsRecord();
  }

  async getGreAnalyticalWritingTest(id: string): Promise<GreAnalyticalWritingTest | undefined> {
    return getGreAnalyticalWritingTestRecord(id);
  }

  async createGreAnalyticalWritingTest(test: InsertGreAnalyticalWritingTest): Promise<GreAnalyticalWritingTest> {
    return createGreAnalyticalWritingTestRecord(test);
  }

  async updateGreAnalyticalWritingTest(id: string, test: Partial<InsertGreAnalyticalWritingTest>): Promise<GreAnalyticalWritingTest> {
    return updateGreAnalyticalWritingTestRecord(id, test);
  }

  async deleteGreAnalyticalWritingTest(id: string): Promise<void> {
    return deleteGreAnalyticalWritingTestRecord(id);
  }

  async getGreVerbalReasoningTests(): Promise<GreVerbalReasoningTest[]> {
    return getGreVerbalReasoningTestsRecord(this.getWritingGreCaches());
  }

  async getGreVerbalReasoningTest(id: string): Promise<GreVerbalReasoningTest | undefined> {
    return getGreVerbalReasoningTestRecord(this.getWritingGreCaches(), id);
  }

  async createGreVerbalReasoningTest(test: InsertGreVerbalReasoningTest): Promise<GreVerbalReasoningTest> {
    return createGreVerbalReasoningTestRecord(this.getWritingGreCaches(), test);
  }

  async updateGreVerbalReasoningTest(id: string, test: Partial<InsertGreVerbalReasoningTest>): Promise<GreVerbalReasoningTest> {
    return updateGreVerbalReasoningTestRecord(this.getWritingGreCaches(), id, test);
  }

  async deleteGreVerbalReasoningTest(id: string): Promise<void> {
    return deleteGreVerbalReasoningTestRecord(this.getWritingGreCaches(), id);
  }

  async getGreVerbalQuestions(testId: string): Promise<GreVerbalQuestion[]> {
    return getGreVerbalQuestionsRecord(this.getWritingGreCaches(), testId);
  }

  async createGreVerbalQuestion(question: InsertGreVerbalQuestion): Promise<GreVerbalQuestion> {
    return createGreVerbalQuestionRecord(this.getWritingGreCaches(), question);
  }

  async updateGreVerbalQuestion(id: string, question: Partial<InsertGreVerbalQuestion>): Promise<GreVerbalQuestion> {
    return updateGreVerbalQuestionRecord(this.getWritingGreCaches(), id, question);
  }

  async deleteGreVerbalQuestion(id: string): Promise<void> {
    return deleteGreVerbalQuestionRecord(this.getWritingGreCaches(), id);
  }

  async getGreQuantitativeReasoningTests(): Promise<GreQuantitativeReasoningTest[]> {
    return getGreQuantitativeReasoningTestsRecord(this.getWritingGreCaches());
  }

  async getGreQuantitativeReasoningTest(id: string): Promise<GreQuantitativeReasoningTest | undefined> {
    return getGreQuantitativeReasoningTestRecord(this.getWritingGreCaches(), id);
  }

  async createGreQuantitativeReasoningTest(test: InsertGreQuantitativeReasoningTest): Promise<GreQuantitativeReasoningTest> {
    return createGreQuantitativeReasoningTestRecord(this.getWritingGreCaches(), test);
  }

  async updateGreQuantitativeReasoningTest(id: string, test: Partial<InsertGreQuantitativeReasoningTest>): Promise<GreQuantitativeReasoningTest> {
    return updateGreQuantitativeReasoningTestRecord(this.getWritingGreCaches(), id, test);
  }

  async deleteGreQuantitativeReasoningTest(id: string): Promise<void> {
    return deleteGreQuantitativeReasoningTestRecord(this.getWritingGreCaches(), id);
  }

  async getGreQuantitativeQuestions(testId: string): Promise<GreQuantitativeQuestion[]> {
    return getGreQuantitativeQuestionsRecord(this.getWritingGreCaches(), testId);
  }

  async createGreQuantitativeQuestion(question: InsertGreQuantitativeQuestion): Promise<GreQuantitativeQuestion> {
    return createGreQuantitativeQuestionRecord(this.getWritingGreCaches(), question);
  }

  async updateGreQuantitativeQuestion(id: string, question: Partial<InsertGreQuantitativeQuestion>): Promise<GreQuantitativeQuestion> {
    return updateGreQuantitativeQuestionRecord(this.getWritingGreCaches(), id, question);
  }

  async deleteGreQuantitativeQuestion(id: string): Promise<void> {
    return deleteGreQuantitativeQuestionRecord(this.getWritingGreCaches(), id);
  }

  async createGreTestAttempt(attempt: InsertGreTestAttempt): Promise<GreTestAttempt> {
    return createGreTestAttemptRecord(this.getWritingGreCaches(), attempt);
  }

  async getGreTestAttempt(id: string): Promise<GreTestAttempt | undefined> {
    return getGreTestAttemptRecord(this.getWritingGreCaches(), id);
  }

  async updateGreTestAttempt(id: string, attempt: Partial<GreTestAttempt>): Promise<GreTestAttempt> {
    return updateGreTestAttemptRecord(this.getWritingGreCaches(), id, attempt);
  }

  async getUserGreTestAttempts(userId: string): Promise<GreTestAttempt[]> {
    return getUserGreTestAttemptsRecord(this.getWritingGreCaches(), userId);
  }

  async getAllGreTestAttempts(): Promise<GreTestAttempt[]> {
    return getAllGreTestAttemptsRecord(this.getWritingGreCaches());
  }

  async getAllSatTestAttempts(): Promise<SatTestAttempt[]> {
    return getAllSatTestAttemptsRecord();
  }

  async getGREWritingTopics(): Promise<Question[]> {
    return getGreWritingTopicsRecord(this.getWritingGreCaches());
  }

  async createGREWritingTopic(topic: InsertQuestion): Promise<Question> {
    return createGreWritingTopicRecord(this.getWritingGreCaches(), topic);
  }

  async getGREVerbalQuestions(): Promise<Question[]> {
    return getGreAdminVerbalQuestionsRecord(this.getWritingGreCaches());
  }

  async createGREVerbalQuestion(question: InsertQuestion): Promise<Question> {
    return createGreAdminVerbalQuestionRecord(this.getWritingGreCaches(), question);
  }

  async getGREQuantitativeQuestions(): Promise<Question[]> {
    return getGreAdminQuantitativeQuestionsRecord(this.getWritingGreCaches());
  }

  async createGREQuantitativeQuestion(question: InsertQuestion): Promise<Question> {
    return createGreAdminQuantitativeQuestionRecord(this.getWritingGreCaches(), question);
  }
}
