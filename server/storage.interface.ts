import { 
  type User, 
  type InsertUser, 
  type Test, 
  type InsertTest, 
  type Question, 
  type InsertQuestion, 
  type TestAttempt, 
  type InsertTestAttempt, 
  type Answer, 
  type InsertAnswer, 
  type Review, 
  type InsertReview, 
  type StudyPlan,
  type AdminMessage,
  type InsertAdminMessage,
  type Faq,
  type InsertFaq,
  type UserStudyPlan,
  type InsertUserStudyPlan,
  type StudyScheduleItem,
  type InsertStudySchedule,
  type StudyProgress,
  type InsertStudyProgress,
  type SpeakingTest,
  type InsertSpeakingTest,
  type SpeakingAttempt,
  type InsertSpeakingAttempt,
  type WritingTest,
  type InsertWritingTest,
  type WritingAttempt,
  type InsertWritingAttempt,
  type GreTest,
  type InsertGreTest,
  type GreAnalyticalWritingTest,
  type InsertGreAnalyticalWritingTest,
  type GreVerbalReasoningTest,
  type InsertGreVerbalReasoningTest,
  type GreVerbalQuestion,
  type InsertGreVerbalQuestion,
  type GreQuantitativeReasoningTest,
  type InsertGreQuantitativeReasoningTest,
  type GreQuantitativeQuestion,
  type InsertGreQuantitativeQuestion,
  type GreTestAttempt,
  type InsertGreTestAttempt,
  type PerformanceAnalytics,
  type InsertPerformanceAnalytics,
  type TestSet,
  type InsertTestSet,
  type TestSetComponent,
  type InsertTestSetComponent,
  type TestSetAttempt,
  type InsertTestSetAttempt,
  type SuccessStory,
  type InsertSuccessStory,
  type SuccessStats,
  type InsertSuccessStats,
  type AiUsage,
  type InsertAiUsage,
  type Program,
  type InsertProgram,
  type UserProgramAccess,
  type InsertUserProgramAccess,
  type UserActivity,
  type InsertUserActivity,
  type AiGeneratedTest,
  type InsertAiGeneratedTest,
  type VisitorLog,
  type InsertVisitorLog,
  type DailyStats,
  type InsertDailyStats,
  type Subscription,
  type InsertSubscription,
  type Payment,
  type InsertPayment,
  type Achievement,
  type InsertAchievement,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type NewToeflReadingTest,
  type InsertNewToeflReadingTest,
  type NewToeflListeningTest,
  type InsertNewToeflListeningTest,
  type NewToeflWritingTest,
  type InsertNewToeflWritingTest,
  type NewToeflSpeakingTest,
  type InsertNewToeflSpeakingTest,
  type NewToeflFeedbackRequest,
  type InsertNewToeflFeedbackRequest,
  type TestProgress,
  type InsertTestProgress,
  type ListeningTtsAsset,
  type InsertListeningTtsAsset,
  type UserCredits,
  type InsertUserCredits,
  type CreditTransaction,
  type InsertCreditTransaction,
  type LiveActivity,
  type InsertLiveActivity,
  type SatTestAttempt,
  type InsertSatTestAttempt,
  type TestAuditLog,
  type InsertTestAuditLog,
  type NewToeflFullTest,
  type InsertNewToeflFullTest,
  type NewToeflFullTestAttempt,
  type InsertNewToeflFullTestAttempt,
  type Survey,
  type SurveyResponse,
  type InsertSurveyResponse,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  CREDIT_COSTS,
  INITIAL_CREDITS
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<InsertUser>): Promise<User>;
  updateUserTier(id: string, tier: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Test methods
  getAllTests(): Promise<Test[]>;
  getActiveTests(): Promise<Test[]>;
  getTests(): Promise<Test[]>;
  getTestsByExamType(examType: "toefl" | "gre"): Promise<Test[]>;
  getTest(id: string): Promise<Test | undefined>;
  createTest(test: InsertTest): Promise<Test>;
  updateTest(id: string, test: Partial<InsertTest>): Promise<Test>;
  deleteTest(id: string): Promise<void>;

  // Question methods
  getQuestionsByTestId(testId: string): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, question: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  deleteQuestionsByTestId(testId: string): Promise<void>;

  // Test attempt methods
  createTestAttempt(attempt: InsertTestAttempt): Promise<TestAttempt>;
  getTestAttempt(id: string): Promise<TestAttempt | undefined>;
  updateTestAttempt(id: string, data: Partial<TestAttempt>): Promise<TestAttempt>;
  getUserTestAttempts(userId: string): Promise<TestAttempt[]>;
  getAllAttempts(): Promise<TestAttempt[]>;
  getTestAttemptsByTestId(testId: string): Promise<TestAttempt[]>;

  // Answer methods
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersByAttemptId(attemptId: string): Promise<Answer[]>;

  // Review methods
  getAllReviews(): Promise<Review[]>;
  getReviews(): Promise<Review[]>;
  getApprovedReviews(): Promise<Review[]>;
  getUserReviews(userId: string): Promise<Review[]>;
  createReview(userId: string, review: InsertReview): Promise<Review>;
  approveReview(id: string): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  getAverageRating(): Promise<number>;
  getTotalReviews(): Promise<number>;
  getReviewsByExamType(examType: "toefl" | "gre"): Promise<Review[]>;

  // Study plans
  getStudyPlans(): Promise<StudyPlan[]>;
  getStudyPlansByExamType(examType: "toefl" | "gre"): Promise<StudyPlan[]>;

  // Achievement methods
  getAllAchievements(): Promise<Achievement[]>;
  getActiveAchievements(): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  updateAchievement(id: string, achievement: Partial<InsertAchievement>): Promise<Achievement>;
  deleteAchievement(id: string): Promise<void>;

  // Admin methods
  createAdminMessage(message: InsertAdminMessage): Promise<AdminMessage>;
  getAdminMessages(): Promise<AdminMessage[]>;
  getUserMessages(userId: string): Promise<AdminMessage[]>;
  markMessageAsRead(messageId: string): Promise<void>;

  // FAQ methods
  getFaqs(): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;
  updateFaq(id: string, faq: Partial<InsertFaq>): Promise<Faq>;
  deleteFaq(id: string): Promise<void>;
  
  // User study plan methods
  createUserStudyPlan(userId: string, plan: InsertUserStudyPlan): Promise<UserStudyPlan>;
  getUserStudyPlans(userId: string): Promise<UserStudyPlan[]>;
  getUserStudyPlan(id: string): Promise<UserStudyPlan | undefined>;
  updateUserStudyPlan(id: string, plan: Partial<UserStudyPlan>): Promise<UserStudyPlan>;
  
  // Study schedule methods
  createStudyScheduleItem(item: InsertStudySchedule): Promise<StudyScheduleItem>;
  getStudySchedule(userStudyPlanId: string, startDate?: Date, endDate?: Date): Promise<StudyScheduleItem[]>;
  updateStudyScheduleItem(id: string, item: Partial<StudyScheduleItem>): Promise<StudyScheduleItem>;
  
  // Study progress methods
  createStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress>;
  getStudyProgress(userStudyPlanId: string): Promise<StudyProgress[]>;
  updateStudyProgress(id: string, progress: Partial<StudyProgress>): Promise<StudyProgress>;

  // Speaking test methods
  getSpeakingTests(): Promise<SpeakingTest[]>;
  getSpeakingTest(id: string): Promise<SpeakingTest | undefined>;
  getSpeakingTestById(id: string): Promise<SpeakingTest | undefined>;
  createSpeakingTest(test: InsertSpeakingTest): Promise<SpeakingTest>;
  updateSpeakingTest(id: string, test: Partial<InsertSpeakingTest>): Promise<SpeakingTest>;
  deleteSpeakingTest(id: string): Promise<void>;
  
  // Admin speaking topic management
  getAllSpeakingTopics(): Promise<SpeakingTest[]>;
  createSpeakingTopic(topic: InsertSpeakingTest): Promise<SpeakingTest>;
  updateSpeakingTopic(id: string, updates: Partial<InsertSpeakingTest>): Promise<SpeakingTest>;
  deleteSpeakingTopic(id: string): Promise<boolean>;

  // Speaking attempt methods
  createSpeakingAttempt(attempt: InsertSpeakingAttempt): Promise<SpeakingAttempt>;
  getSpeakingAttempt(id: string): Promise<SpeakingAttempt | undefined>;
  updateSpeakingAttempt(id: string, attempt: Partial<SpeakingAttempt>): Promise<SpeakingAttempt>;
  getUserSpeakingAttempts(userId: string): Promise<SpeakingAttempt[]>;
  getAllSpeakingAttempts(): Promise<SpeakingAttempt[]>;
  getAllListeningAttempts(): Promise<any[]>;

  // Writing test methods
  getWritingTests(): Promise<WritingTest[]>;
  getWritingTest(id: string): Promise<WritingTest | undefined>;
  createWritingTest(test: InsertWritingTest): Promise<WritingTest>;
  updateWritingTest(id: string, test: Partial<InsertWritingTest>): Promise<WritingTest>;
  deleteWritingTest(id: string): Promise<void>;

  // Writing attempt methods
  createWritingAttempt(attempt: InsertWritingAttempt): Promise<WritingAttempt>;
  getWritingAttempt(id: string): Promise<WritingAttempt | undefined>;
  updateWritingAttempt(id: string, attempt: Partial<WritingAttempt>): Promise<WritingAttempt>;
  getUserWritingAttempts(userId: string): Promise<WritingAttempt[]>;
  getAllWritingAttempts(): Promise<WritingAttempt[]>;

  // GRE Test methods
  getGreTests(): Promise<GreTest[]>;
  getGreTest(id: string): Promise<GreTest | undefined>;
  createGreTest(test: InsertGreTest): Promise<GreTest>;
  updateGreTest(id: string, test: Partial<InsertGreTest>): Promise<GreTest>;
  deleteGreTest(id: string): Promise<void>;
  
  // GRE Analytical Writing methods
  getGreAnalyticalWritingTests(): Promise<GreAnalyticalWritingTest[]>;
  getGreAnalyticalWritingTest(id: string): Promise<GreAnalyticalWritingTest | undefined>;
  createGreAnalyticalWritingTest(test: InsertGreAnalyticalWritingTest): Promise<GreAnalyticalWritingTest>;
  updateGreAnalyticalWritingTest(id: string, test: Partial<InsertGreAnalyticalWritingTest>): Promise<GreAnalyticalWritingTest>;
  deleteGreAnalyticalWritingTest(id: string): Promise<void>;
  
  // GRE Verbal Reasoning methods
  getGreVerbalReasoningTests(): Promise<GreVerbalReasoningTest[]>;
  getGreVerbalReasoningTest(id: string): Promise<GreVerbalReasoningTest | undefined>;
  createGreVerbalReasoningTest(test: InsertGreVerbalReasoningTest): Promise<GreVerbalReasoningTest>;
  updateGreVerbalReasoningTest(id: string, test: Partial<InsertGreVerbalReasoningTest>): Promise<GreVerbalReasoningTest>;
  deleteGreVerbalReasoningTest(id: string): Promise<void>;
  
  // GRE Verbal Questions methods
  getGreVerbalQuestions(testId: string): Promise<GreVerbalQuestion[]>;
  createGreVerbalQuestion(question: InsertGreVerbalQuestion): Promise<GreVerbalQuestion>;
  updateGreVerbalQuestion(id: string, question: Partial<InsertGreVerbalQuestion>): Promise<GreVerbalQuestion>;
  deleteGreVerbalQuestion(id: string): Promise<void>;
  
  // GRE Quantitative Reasoning methods
  getGreQuantitativeReasoningTests(): Promise<GreQuantitativeReasoningTest[]>;
  getGreQuantitativeReasoningTest(id: string): Promise<GreQuantitativeReasoningTest | undefined>;
  createGreQuantitativeReasoningTest(test: InsertGreQuantitativeReasoningTest): Promise<GreQuantitativeReasoningTest>;
  updateGreQuantitativeReasoningTest(id: string, test: Partial<InsertGreQuantitativeReasoningTest>): Promise<GreQuantitativeReasoningTest>;
  deleteGreQuantitativeReasoningTest(id: string): Promise<void>;
  
  // GRE Quantitative Questions methods
  getGreQuantitativeQuestions(testId: string): Promise<GreQuantitativeQuestion[]>;
  createGreQuantitativeQuestion(question: InsertGreQuantitativeQuestion): Promise<GreQuantitativeQuestion>;
  updateGreQuantitativeQuestion(id: string, question: Partial<InsertGreQuantitativeQuestion>): Promise<GreQuantitativeQuestion>;
  deleteGreQuantitativeQuestion(id: string): Promise<void>;
  
  // GRE Test Attempts methods
  createGreTestAttempt(attempt: InsertGreTestAttempt): Promise<GreTestAttempt>;
  getGreTestAttempt(id: string): Promise<GreTestAttempt | undefined>;
  updateGreTestAttempt(id: string, attempt: Partial<GreTestAttempt>): Promise<GreTestAttempt>;
  getUserGreTestAttempts(userId: string): Promise<GreTestAttempt[]>;
  getAllGreTestAttempts(): Promise<GreTestAttempt[]>;

  // SAT Test Attempt methods
  getAllSatTestAttempts(): Promise<SatTestAttempt[]>;

  // GRE Admin methods
  getGREWritingTopics(): Promise<Question[]>;
  createGREWritingTopic(topic: InsertQuestion): Promise<Question>;
  getGREVerbalQuestions(): Promise<Question[]>;
  createGREVerbalQuestion(question: InsertQuestion): Promise<Question>;
  getGREQuantitativeQuestions(): Promise<Question[]>;
  createGREQuantitativeQuestion(question: InsertQuestion): Promise<Question>;

  // Performance Analytics methods
  getPerformanceAnalytics(userId: string): Promise<PerformanceAnalytics[]>;
  
  // Test Set methods
  getTestSets(examType?: "toefl" | "gre"): Promise<TestSet[]>;
  getTestSet(id: string): Promise<TestSet | undefined>;
  createTestSet(testSet: InsertTestSet): Promise<TestSet>;
  updateTestSet(id: string, testSet: Partial<InsertTestSet>): Promise<TestSet>;
  deleteTestSet(id: string): Promise<void>;
  
  // Test Set Component methods
  getTestSetComponents(testSetId: string): Promise<TestSetComponent[]>;
  createTestSetComponent(component: InsertTestSetComponent): Promise<TestSetComponent>;
  deleteTestSetComponent(id: string): Promise<void>;
  
  // Test Set Attempt methods
  getTestSetAttempts(userId: string): Promise<TestSetAttempt[]>;
  getTestSetAttempt(id: string): Promise<TestSetAttempt | undefined>;
  createTestSetAttempt(attempt: InsertTestSetAttempt): Promise<TestSetAttempt>;
  updateTestSetAttempt(id: string, attempt: Partial<TestSetAttempt>): Promise<TestSetAttempt>;
  createPerformanceAnalytics(analytics: InsertPerformanceAnalytics): Promise<PerformanceAnalytics>;
  updatePerformanceAnalytics(id: string, updates: Partial<PerformanceAnalytics>): Promise<PerformanceAnalytics | undefined>;
  getLatestPerformanceAnalytics(userId: string, examType: 'toefl' | 'gre'): Promise<PerformanceAnalytics | undefined>;
  
  // User Performance tracking
  updateUserPerformance(userId: string, performanceData: any): Promise<void>;
  
  // Full Test specific methods
  getInProgressTestSetAttempt(userId: string, testSetId: string): Promise<TestSetAttempt | undefined>;
  getUserScoreHistory(userId: string, period: 'week' | 'month' | 'year', examType: 'toefl' | 'gre'): Promise<any[]>;
  generateAIInsights(userId: string, scoreHistory: any[], examType: 'toefl' | 'gre'): Promise<any>;



  
  

  // Success Story methods
  getSuccessStories(): Promise<SuccessStory[]>;
  getSuccessStory(id: string): Promise<SuccessStory | undefined>;
  createSuccessStory(story: InsertSuccessStory): Promise<SuccessStory>;
  updateSuccessStory(id: string, story: Partial<InsertSuccessStory>): Promise<SuccessStory>;
  deleteSuccessStory(id: string): Promise<void>;
  
  // Success Stats methods
  getSuccessStats(): Promise<SuccessStats | undefined>;
  updateSuccessStats(stats: Partial<InsertSuccessStats>): Promise<SuccessStats>;

  // AI Usage methods
  createAiUsage(usage: InsertAiUsage): Promise<AiUsage>;
  getAiUsage(userId: string, startDate?: Date, endDate?: Date): Promise<AiUsage[]>;
  getAiUsageStats(): Promise<any>;
  getUserAiUsageStats(userId: string): Promise<any>;

  // Program Management methods
  getPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, program: Partial<InsertProgram>): Promise<Program>;
  deleteProgram(id: string): Promise<void>;

  // User Program Access methods
  getUserProgramAccess(userId: string): Promise<UserProgramAccess[]>;
  grantProgramAccess(access: InsertUserProgramAccess): Promise<UserProgramAccess>;
  revokeProgramAccess(userId: string, programId: string): Promise<void>;

  // User Activity methods
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivity(userId: string, startDate?: Date, endDate?: Date): Promise<UserActivity[]>;
  getAllUserActivities(limit?: number, activityType?: string): Promise<UserActivity[]>;
  getActivityStats(): Promise<any>;
  
  // AI Generated Test Persistence methods
  saveAIGeneratedTest(testId: string, testData: any, options?: { activateImmediately?: boolean }): Promise<void>;
  getAIGeneratedTest(testId: string): Promise<any | undefined>;
  getAIGeneratedTestById(testId: string): Promise<any | undefined>;
  getAllAIGeneratedTests(): Promise<any[]>;
  getAllAIGeneratedTestsMetadata(): Promise<any[]>; // Lightweight version for listing
  getAIGeneratedTestsByCreator(creatorId: string): Promise<any[]>; // Get all tests by creator (regardless of isActive)
  deleteAIGeneratedTest(testId: string): Promise<void>;

  // Password Reset Token methods
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  deletePasswordResetToken(token: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // New TOEFL Reading Test methods (2026 format)
  getNewToeflReadingTests(): Promise<NewToeflReadingTest[]>;
  getNewToeflReadingTest(id: string): Promise<NewToeflReadingTest | undefined>;
  createNewToeflReadingTest(test: InsertNewToeflReadingTest): Promise<NewToeflReadingTest>;
  updateNewToeflReadingTest(id: string, test: Partial<InsertNewToeflReadingTest>): Promise<NewToeflReadingTest>;
  deleteNewToeflReadingTest(id: string): Promise<void>;

  // New TOEFL Listening Test methods (2026 format)
  getNewToeflListeningTests(): Promise<NewToeflListeningTest[]>;
  getNewToeflListeningTest(id: string): Promise<NewToeflListeningTest | undefined>;
  createNewToeflListeningTest(test: InsertNewToeflListeningTest): Promise<NewToeflListeningTest>;
  updateNewToeflListeningTest(id: string, test: Partial<InsertNewToeflListeningTest>): Promise<NewToeflListeningTest>;
  deleteNewToeflListeningTest(id: string): Promise<void>;

  // New TOEFL Writing Test methods (2026 format)
  getNewToeflWritingTests(): Promise<NewToeflWritingTest[]>;
  getNewToeflWritingTest(id: string): Promise<NewToeflWritingTest | undefined>;
  createNewToeflWritingTest(test: InsertNewToeflWritingTest): Promise<NewToeflWritingTest>;
  updateNewToeflWritingTest(id: string, test: Partial<InsertNewToeflWritingTest>): Promise<NewToeflWritingTest>;
  deleteNewToeflWritingTest(id: string): Promise<void>;

  // New TOEFL Speaking Test methods (2026 format)
  getNewToeflSpeakingTests(): Promise<NewToeflSpeakingTest[]>;
  getNewToeflSpeakingTest(id: string): Promise<NewToeflSpeakingTest | undefined>;
  createNewToeflSpeakingTest(test: InsertNewToeflSpeakingTest): Promise<NewToeflSpeakingTest>;
  updateNewToeflSpeakingTest(id: string, test: Partial<InsertNewToeflSpeakingTest>): Promise<NewToeflSpeakingTest>;
  deleteNewToeflSpeakingTest(id: string): Promise<void>;

  // New TOEFL Feedback Request methods
  createFeedbackRequest(request: InsertNewToeflFeedbackRequest): Promise<NewToeflFeedbackRequest>;
  getFeedbackRequest(id: string): Promise<NewToeflFeedbackRequest | undefined>;
  getUserFeedbackRequests(userId: string): Promise<NewToeflFeedbackRequest[]>;
  getPendingFeedbackRequests(): Promise<NewToeflFeedbackRequest[]>;
  getAllFeedbackRequests(): Promise<NewToeflFeedbackRequest[]>;
  approveFeedbackRequest(id: string, adminId: string, feedback: any, totalScore: number): Promise<NewToeflFeedbackRequest>;
  rejectFeedbackRequest(id: string, adminId: string): Promise<NewToeflFeedbackRequest>;
  getApprovedFeedbackForUser(userId: string): Promise<NewToeflFeedbackRequest[]>;

  // Test Progress methods (pause/resume functionality)
  getTestProgress(userId: string, testSetAttemptId?: string, testAttemptId?: string): Promise<TestProgress | undefined>;
  getUserTestProgressList(userId: string): Promise<TestProgress[]>;
  createTestProgress(progress: InsertTestProgress): Promise<TestProgress>;
  updateTestProgress(id: string, progress: Partial<InsertTestProgress>): Promise<TestProgress>;
  pauseTestProgress(id: string): Promise<TestProgress>;
  resumeTestProgress(id: string): Promise<TestProgress>;
  deleteTestProgress(id: string): Promise<void>;

  // User Credits methods
  getUserCredits(userId: string): Promise<UserCredits | undefined>;
  initializeUserCredits(userId: string, initialBalance?: number): Promise<UserCredits>;
  addCredits(userId: string, amount: number, type: 'purchase' | 'bonus' | 'refund' | 'admin_adjustment', description: string, featureType?: string, referenceId?: string): Promise<UserCredits>;
  deductCredits(userId: string, amount: number, description: string, featureType: string, referenceId?: string): Promise<{ success: boolean; credits?: UserCredits; error?: string }>;
  getCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>;
  hasEnoughCredits(userId: string, requiredAmount: number): Promise<boolean>;

  // Live Activity methods
  getLiveActivities(limit?: number): Promise<LiveActivity[]>;
  createLiveActivity(activity: InsertLiveActivity): Promise<LiveActivity>;
  getRecentLiveActivities(since?: Date): Promise<LiveActivity[]>;
  deleteExpiredLiveActivities(): Promise<void>;

  // Test Audit Log methods
  createTestAuditLog(log: InsertTestAuditLog): Promise<TestAuditLog>;
  getTestAuditLogs(limit?: number): Promise<TestAuditLog[]>;
  getTestAuditLogsByTestId(testId: string): Promise<TestAuditLog[]>;
  getTestAuditLogsByAction(action: string): Promise<TestAuditLog[]>;

  // Learning Feedback methods
  getLearningFeedback(userId: string): Promise<any | null>;
  saveLearningFeedback(userId: string, feedbackData: any): Promise<any>;

  // Saved Explanations & Feedback methods
  createSavedExplanation(data: {
    userId: string;
    type: 'explanation' | 'feedback';
    section: 'reading' | 'listening' | 'speaking' | 'writing' | 'gre-writing' | 'sat';
    questionText: string;
    content: any;
    testId?: string;
  }): Promise<any>;
  getUserSavedExplanations(userId: string, options?: { type?: string; section?: string; limit?: number }): Promise<any[]>;

  // New TOEFL Full Test Set methods
  getNewToeflFullTests(): Promise<NewToeflFullTest[]>;
  getNewToeflFullTest(id: string): Promise<NewToeflFullTest | undefined>;
  createNewToeflFullTest(test: InsertNewToeflFullTest): Promise<NewToeflFullTest>;
  updateNewToeflFullTest(id: string, test: Partial<InsertNewToeflFullTest>): Promise<NewToeflFullTest>;
  deleteNewToeflFullTest(id: string): Promise<void>;

  // New TOEFL Full Test Attempt methods
  createNewToeflFullTestAttempt(attempt: InsertNewToeflFullTestAttempt): Promise<NewToeflFullTestAttempt>;
  getNewToeflFullTestAttempt(id: string): Promise<NewToeflFullTestAttempt | undefined>;
  getUserNewToeflFullTestAttempts(userId: string): Promise<NewToeflFullTestAttempt[]>;
  updateNewToeflFullTestAttempt(id: string, data: Partial<InsertNewToeflFullTestAttempt>): Promise<NewToeflFullTestAttempt>;

  // Survey methods
  getActiveSurvey(): Promise<Survey | undefined>;
  hasUserRespondedToSurvey(surveyId: string, userId: string): Promise<boolean>;
  createSurveyResponse(data: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyStats(surveyId: string): Promise<any>;

  // Analytics Events methods
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsEventsSummary(days?: number): Promise<any>;
  getAnalyticsEventsDailyTrend(days?: number): Promise<any[]>;
}
