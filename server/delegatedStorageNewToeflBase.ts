import {
  approveFeedbackRequestRecord,
  createFeedbackRequestRecord,
  createNewToeflFullTestAttemptRecord,
  createNewToeflFullTestRecord,
  createNewToeflListeningTestRecord,
  createNewToeflReadingTestRecord,
  createNewToeflSpeakingTestRecord,
  createNewToeflWritingTestRecord,
  deleteNewToeflFullTestRecord,
  deleteNewToeflListeningTestRecord,
  deleteNewToeflReadingTestRecord,
  deleteNewToeflSpeakingTestRecord,
  deleteNewToeflWritingTestRecord,
  getAllFeedbackRequestsRecord,
  getApprovedFeedbackForUserRecord,
  getFeedbackRequestRecord,
  getNewToeflFullTestAttemptRecord,
  getNewToeflFullTestRecord,
  getNewToeflFullTestsRecord,
  getNewToeflListeningTestRecord,
  getNewToeflListeningTestsRecord,
  getNewToeflReadingTestRecord,
  getNewToeflReadingTestsRecord,
  getNewToeflSpeakingTestRecord,
  getNewToeflSpeakingTestsRecord,
  getNewToeflWritingTestRecord,
  getNewToeflWritingTestsRecord,
  getPendingFeedbackRequestsRecord,
  getUserFeedbackRequestsRecord,
  getUserNewToeflFullTestAttemptsRecord,
  rejectFeedbackRequestRecord,
  updateNewToeflFullTestAttemptRecord,
  updateNewToeflFullTestRecord,
  updateNewToeflListeningTestRecord,
  updateNewToeflReadingTestRecord,
  updateNewToeflSpeakingTestRecord,
  updateNewToeflWritingTestRecord,
} from "./lib/newToeflStorage";
import type {
  InsertNewToeflFeedbackRequest,
  InsertNewToeflFullTest,
  InsertNewToeflFullTestAttempt,
  InsertNewToeflListeningTest,
  InsertNewToeflReadingTest,
  InsertNewToeflSpeakingTest,
  InsertNewToeflWritingTest,
} from "@shared/schema";
import { DelegatedStorageAccountFeatureBase } from "./delegatedStorageAccountFeatureBase";

export abstract class DelegatedStorageNewToeflBase extends DelegatedStorageAccountFeatureBase {
  async getNewToeflReadingTests() {
    return getNewToeflReadingTestsRecord();
  }

  async getNewToeflReadingTest(id: string) {
    return getNewToeflReadingTestRecord(id);
  }

  async createNewToeflReadingTest(test: InsertNewToeflReadingTest) {
    return createNewToeflReadingTestRecord(test);
  }

  async updateNewToeflReadingTest(id: string, test: Partial<InsertNewToeflReadingTest>) {
    return updateNewToeflReadingTestRecord(id, test);
  }

  async deleteNewToeflReadingTest(id: string) {
    return deleteNewToeflReadingTestRecord(id);
  }

  async getNewToeflListeningTests() {
    return getNewToeflListeningTestsRecord();
  }

  async getNewToeflListeningTest(id: string) {
    return getNewToeflListeningTestRecord(id);
  }

  async createNewToeflListeningTest(test: InsertNewToeflListeningTest) {
    return createNewToeflListeningTestRecord(test);
  }

  async updateNewToeflListeningTest(id: string, test: Partial<InsertNewToeflListeningTest>) {
    return updateNewToeflListeningTestRecord(id, test);
  }

  async deleteNewToeflListeningTest(id: string) {
    return deleteNewToeflListeningTestRecord(id);
  }

  async getNewToeflWritingTests() {
    return getNewToeflWritingTestsRecord();
  }

  async getNewToeflWritingTest(id: string) {
    return getNewToeflWritingTestRecord(id);
  }

  async createNewToeflWritingTest(test: InsertNewToeflWritingTest) {
    return createNewToeflWritingTestRecord(test);
  }

  async updateNewToeflWritingTest(id: string, test: Partial<InsertNewToeflWritingTest>) {
    return updateNewToeflWritingTestRecord(id, test);
  }

  async deleteNewToeflWritingTest(id: string) {
    return deleteNewToeflWritingTestRecord(id);
  }

  async getNewToeflSpeakingTests() {
    return getNewToeflSpeakingTestsRecord();
  }

  async getNewToeflSpeakingTest(id: string) {
    return getNewToeflSpeakingTestRecord(id);
  }

  async createNewToeflSpeakingTest(test: InsertNewToeflSpeakingTest) {
    return createNewToeflSpeakingTestRecord(test);
  }

  async updateNewToeflSpeakingTest(id: string, test: Partial<InsertNewToeflSpeakingTest>) {
    return updateNewToeflSpeakingTestRecord(id, test);
  }

  async deleteNewToeflSpeakingTest(id: string) {
    return deleteNewToeflSpeakingTestRecord(id);
  }

  async createFeedbackRequest(request: InsertNewToeflFeedbackRequest) {
    return createFeedbackRequestRecord(request);
  }

  async getFeedbackRequest(id: string) {
    return getFeedbackRequestRecord(id);
  }

  async getUserFeedbackRequests(userId: string) {
    return getUserFeedbackRequestsRecord(userId);
  }

  async getPendingFeedbackRequests() {
    return getPendingFeedbackRequestsRecord();
  }

  async getAllFeedbackRequests() {
    return getAllFeedbackRequestsRecord();
  }

  async approveFeedbackRequest(id: string, adminId: string, feedback: object, totalScore: number) {
    return approveFeedbackRequestRecord(id, adminId, feedback, totalScore);
  }

  async rejectFeedbackRequest(id: string, adminId: string) {
    return rejectFeedbackRequestRecord(id, adminId);
  }

  async getApprovedFeedbackForUser(userId: string) {
    return getApprovedFeedbackForUserRecord(userId);
  }

  async getNewToeflFullTests() {
    return getNewToeflFullTestsRecord();
  }

  async getNewToeflFullTest(id: string) {
    return getNewToeflFullTestRecord(id);
  }

  async createNewToeflFullTest(test: InsertNewToeflFullTest) {
    return createNewToeflFullTestRecord(test);
  }

  async updateNewToeflFullTest(id: string, test: Partial<InsertNewToeflFullTest>) {
    return updateNewToeflFullTestRecord(id, test);
  }

  async deleteNewToeflFullTest(id: string) {
    return deleteNewToeflFullTestRecord(id);
  }

  async createNewToeflFullTestAttempt(attempt: InsertNewToeflFullTestAttempt) {
    return createNewToeflFullTestAttemptRecord(attempt);
  }

  async getNewToeflFullTestAttempt(id: string) {
    return getNewToeflFullTestAttemptRecord(id);
  }

  async getUserNewToeflFullTestAttempts(userId: string) {
    return getUserNewToeflFullTestAttemptsRecord(userId);
  }

  async updateNewToeflFullTestAttempt(id: string, data: Partial<InsertNewToeflFullTestAttempt>) {
    return updateNewToeflFullTestAttemptRecord(id, data);
  }
}
