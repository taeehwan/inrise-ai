import type {
  AdminMessage,
  Answer,
  Faq,
  InsertAdminMessage,
  InsertAnswer,
  InsertFaq,
  InsertQuestion,
  InsertReview,
  InsertStudyProgress,
  InsertStudySchedule,
  InsertTest,
  InsertTestAttempt,
  InsertUser,
  InsertUserStudyPlan,
  Question,
  Review,
  StudyPlan,
  StudyProgress,
  StudyScheduleItem,
  Test,
  TestAttempt,
  User,
  UserStudyPlan,
} from "@shared/schema";
import { DelegatedStorageBase } from "./delegatedStorageBase";
import type { CoreStorageCaches } from "./lib/coreUserTestStorage";
import type { StudySupportCaches } from "./lib/studySupportStorage";
import {
  approveReviewRecord,
  createAnswerRecord,
  createQuestionRecord,
  createReviewRecord,
  createTestAttemptRecord,
  createTestRecord,
  createUserRecord,
  deleteQuestionRecord,
  deleteQuestionsByTestIdRecord,
  deleteReviewRecord,
  deleteTestRecord,
  getActiveTestsRecord,
  getAllAttemptsRecord,
  getAllReviewsRecord,
  getAllTestsRecord,
  getAllUsersRecord,
  getAnswersByAttemptIdRecord,
  getApprovedReviewsRecord,
  getAverageRatingRecord,
  getQuestionsByTestIdRecord,
  getReviewsByExamTypeRecord,
  getReviewsRecord,
  getTestAttemptRecord,
  getTestAttemptsByTestIdRecord,
  getTestRecord,
  getTestsByExamTypeRecord,
  getTestsBySectionRecord,
  getTestsRecord,
  getTotalReviewsRecord,
  getUserByEmailRecord,
  getUserByIdRecord,
  getUserByProviderIdRecord,
  getUserByUsernameRecord,
  getUserRecord,
  getUserReviewsRecord,
  getUserTestAttemptsRecord,
  updateQuestionRecord,
  updateTestAttemptRecord,
  updateTestRecord,
  updateUserRecord,
  updateUserTierRecord,
} from "./lib/coreUserTestStorage";
import {
  createAdminMessageRecord,
  createFaqRecord,
  createStudyProgressRecord,
  createStudyScheduleItemRecord,
  createUserStudyPlanRecord,
  deleteFaqRecord,
  getAdminMessagesRecord,
  getFaqsRecord,
  getStudyPlansByExamTypeRecord,
  getStudyPlansRecord,
  getStudyProgressRecord as getStudyProgressCacheRecord,
  getStudyScheduleRecord,
  getUserMessagesRecord,
  getUserStudyPlanRecord,
  getUserStudyPlansRecord,
  markMessageAsReadRecord,
  updateFaqRecord,
  updateStudyProgressRecord,
  updateStudyScheduleItemRecord,
  updateUserStudyPlanRecord,
} from "./lib/studySupportStorage";
import { deleteUserCascadeRecord } from "./lib/userDeletionStorage";

export abstract class MemStorageCoreStudyBase extends DelegatedStorageBase {
  protected abstract users: Map<string, User>;
  protected abstract getCoreStorageCaches(): CoreStorageCaches;
  protected abstract getStudySupportCaches(): StudySupportCaches;

  async getUser(id: string): Promise<User | undefined> {
    return getUserRecord(this.getCoreStorageCaches(), id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return getUserByIdRecord(this.getCoreStorageCaches(), id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return getUserByUsernameRecord(this.getCoreStorageCaches(), username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return getUserByEmailRecord(this.getCoreStorageCaches(), email);
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    return getUserByProviderIdRecord(this.getCoreStorageCaches(), provider, providerId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return createUserRecord(this.getCoreStorageCaches(), insertUser);
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    return updateUserRecord(this.getCoreStorageCaches(), id, userData);
  }

  async getAllUsers(): Promise<User[]> {
    return getAllUsersRecord(this.getCoreStorageCaches());
  }

  async updateUserTier(id: string, tier: string): Promise<User> {
    return updateUserTierRecord(this.getCoreStorageCaches(), id, tier);
  }

  async deleteUser(id: string): Promise<void> {
    return deleteUserCascadeRecord(this.users, id);
  }

  async getAllTests(): Promise<Test[]> {
    return getAllTestsRecord(this.getCoreStorageCaches());
  }

  async getActiveTests(): Promise<Test[]> {
    return getActiveTestsRecord(this.getCoreStorageCaches());
  }

  async getTests(): Promise<Test[]> {
    return getTestsRecord(this.getCoreStorageCaches());
  }

  async getTestsByExamType(examType: "toefl" | "gre"): Promise<Test[]> {
    return getTestsByExamTypeRecord(this.getCoreStorageCaches(), examType);
  }

  async getTestsBySection(examType: string, section: string): Promise<Test[]> {
    return getTestsBySectionRecord(this.getCoreStorageCaches(), examType, section);
  }

  async getTest(id: string): Promise<Test | undefined> {
    return getTestRecord(this.getCoreStorageCaches(), id);
  }

  async createTest(test: any): Promise<any> {
    return createTestRecord(this.getCoreStorageCaches(), test);
  }

  async updateTest(id: string, testData: any): Promise<any> {
    return updateTestRecord(this.getCoreStorageCaches(), id, testData);
  }

  async deleteTest(id: string): Promise<void> {
    return deleteTestRecord(this.getCoreStorageCaches(), id);
  }

  async getQuestionsByTestId(testId: string): Promise<Question[]> {
    return getQuestionsByTestIdRecord(this.getCoreStorageCaches(), testId);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    return createQuestionRecord(this.getCoreStorageCaches(), question);
  }

  async updateQuestion(id: string, question: Partial<InsertQuestion>): Promise<Question> {
    return updateQuestionRecord(this.getCoreStorageCaches(), id, question);
  }

  async deleteQuestion(id: string): Promise<void> {
    return deleteQuestionRecord(this.getCoreStorageCaches(), id);
  }

  async deleteQuestionsByTestId(testId: string): Promise<void> {
    return deleteQuestionsByTestIdRecord(this.getCoreStorageCaches(), testId);
  }

  async createTestAttempt(attempt: InsertTestAttempt): Promise<TestAttempt> {
    return createTestAttemptRecord(this.getCoreStorageCaches(), attempt);
  }

  async getTestAttempt(id: string): Promise<TestAttempt | undefined> {
    return getTestAttemptRecord(this.getCoreStorageCaches(), id);
  }

  async updateTestAttempt(id: string, data: Partial<TestAttempt>): Promise<TestAttempt> {
    return updateTestAttemptRecord(this.getCoreStorageCaches(), id, data);
  }

  async getUserTestAttempts(userId: string): Promise<TestAttempt[]> {
    return getUserTestAttemptsRecord(this.getCoreStorageCaches(), userId);
  }

  async getAllAttempts(): Promise<TestAttempt[]> {
    return getAllAttemptsRecord(this.getCoreStorageCaches());
  }

  async getTestAttemptsByTestId(testId: string): Promise<TestAttempt[]> {
    return getTestAttemptsByTestIdRecord(this.getCoreStorageCaches(), testId);
  }

  async createAnswer(answer: InsertAnswer): Promise<Answer> {
    return createAnswerRecord(this.getCoreStorageCaches(), answer);
  }

  async getAnswersByAttemptId(attemptId: string): Promise<Answer[]> {
    return getAnswersByAttemptIdRecord(this.getCoreStorageCaches(), attemptId);
  }

  async getAllReviews(): Promise<Review[]> {
    return getAllReviewsRecord();
  }

  async getReviews(): Promise<Review[]> {
    return getReviewsRecord();
  }

  async getApprovedReviews(): Promise<Review[]> {
    return getApprovedReviewsRecord();
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    return getUserReviewsRecord(userId);
  }

  async createReview(userId: string, review: InsertReview): Promise<Review> {
    return createReviewRecord(userId, review);
  }

  async approveReview(id: string): Promise<Review> {
    return approveReviewRecord(id);
  }

  async deleteReview(id: string): Promise<void> {
    return deleteReviewRecord(id);
  }

  async getAverageRating(): Promise<number> {
    return getAverageRatingRecord();
  }

  async getTotalReviews(): Promise<number> {
    return getTotalReviewsRecord();
  }

  async getReviewsByExamType(examType: "toefl" | "gre"): Promise<Review[]> {
    return getReviewsByExamTypeRecord(examType);
  }

  async getStudyPlans(): Promise<StudyPlan[]> {
    return getStudyPlansRecord();
  }

  async getStudyPlansByExamType(examType: "toefl" | "gre"): Promise<StudyPlan[]> {
    return getStudyPlansByExamTypeRecord(examType);
  }

  async createAdminMessage(message: InsertAdminMessage): Promise<AdminMessage> {
    return createAdminMessageRecord(this.getStudySupportCaches(), message);
  }

  async getAdminMessages(): Promise<AdminMessage[]> {
    return getAdminMessagesRecord(this.getStudySupportCaches());
  }

  async getUserMessages(userId: string): Promise<AdminMessage[]> {
    return getUserMessagesRecord(this.getStudySupportCaches(), userId);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    return markMessageAsReadRecord(this.getStudySupportCaches(), messageId);
  }

  async getFaqs(): Promise<Faq[]> {
    return getFaqsRecord(this.getStudySupportCaches());
  }

  async createFaq(faq: InsertFaq): Promise<Faq> {
    return createFaqRecord(this.getStudySupportCaches(), faq);
  }

  async updateFaq(id: string, faq: Partial<InsertFaq>): Promise<Faq> {
    return updateFaqRecord(this.getStudySupportCaches(), id, faq);
  }

  async deleteFaq(id: string): Promise<void> {
    return deleteFaqRecord(this.getStudySupportCaches(), id);
  }

  async createUserStudyPlan(userId: string, plan: InsertUserStudyPlan): Promise<UserStudyPlan> {
    return createUserStudyPlanRecord(this.getStudySupportCaches(), userId, plan);
  }

  async getUserStudyPlans(userId: string): Promise<UserStudyPlan[]> {
    return getUserStudyPlansRecord(this.getStudySupportCaches(), userId);
  }

  async getUserStudyPlan(id: string): Promise<UserStudyPlan | undefined> {
    return getUserStudyPlanRecord(this.getStudySupportCaches(), id);
  }

  async updateUserStudyPlan(id: string, plan: Partial<UserStudyPlan>): Promise<UserStudyPlan> {
    return updateUserStudyPlanRecord(this.getStudySupportCaches(), id, plan);
  }

  async createStudyScheduleItem(item: InsertStudySchedule): Promise<StudyScheduleItem> {
    return createStudyScheduleItemRecord(this.getStudySupportCaches(), item);
  }

  async getStudySchedule(userStudyPlanId: string, startDate?: Date, endDate?: Date): Promise<StudyScheduleItem[]> {
    void startDate;
    void endDate;
    return getStudyScheduleRecord(this.getStudySupportCaches(), userStudyPlanId);
  }

  async updateStudyScheduleItem(id: string, item: Partial<StudyScheduleItem>): Promise<StudyScheduleItem> {
    return updateStudyScheduleItemRecord(this.getStudySupportCaches(), id, item);
  }

  async createStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress> {
    return createStudyProgressRecord(this.getStudySupportCaches(), progress);
  }

  async getStudyProgress(userStudyPlanId: string): Promise<StudyProgress[]> {
    return getStudyProgressCacheRecord(this.getStudySupportCaches(), userStudyPlanId);
  }

  async updateStudyProgress(id: string, progress: Partial<StudyProgress>): Promise<StudyProgress> {
    return updateStudyProgressRecord(this.getStudySupportCaches(), id, progress);
  }
}
