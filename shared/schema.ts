import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, jsonb, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  profileImageUrl: text("profile_image_url"),
  country: text("country"),
  targetExam: text("target_exam").$type<"toefl" | "gre" | "both">().default("toefl"),
  targetScore: integer("target_score"),
  role: text("role").$type<"user" | "admin">().default("user"),
  membershipTier: text("membership_tier").$type<"guest" | "light" | "pro" | "max" | "master">().default("guest"),
  subscriptionStatus: text("subscription_status").$type<"active" | "inactive" | "trial" | "cancelled" | "past_due">().default("inactive"),
  subscriptionId: text("subscription_id"), // 토스페이먼츠 구독 ID
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  provider: text("provider").$type<"google" | "naver" | "kakao" | "local">().default("local"),
  providerId: text("provider_id"),
  privacyConsent: boolean("privacy_consent").default(false),
  marketingConsent: boolean("marketing_consent").default(false),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tests = pgTable("tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  examType: text("exam_type").$type<"toefl" | "gre" | "sat">().notNull(),
  section: text("section").notNull(), // e.g., "reading", "listening", "speaking", "writing", "verbal", "quantitative", "analytical", "reading-writing", "math"
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // in minutes
  questionCount: integer("question_count").notNull(),
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => tests.id).notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").$type<"multiple-choice" | "essay" | "speaking" | "listening" | "fill_blank" | "quant-comparison" | "quant-multiple" | "quant-multi-select" | "quant-numeric">().notNull(),
  options: jsonb("options"), // For multiple choice questions
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  points: integer("points").default(1),
  orderIndex: integer("order_index").notNull(),
  passage: text("passage"), // For reading comprehension
  audioUrl: text("audio_url"), // For listening questions
  imageUrl: text("image_url"), // For GRE quantitative image-based questions
  writingPrompt: text("writing_prompt"), // For GRE analytical writing topics
  quantityA: text("quantity_a"), // For GRE quantitative comparison (Column A)
  quantityB: text("quantity_b"), // For GRE quantitative comparison (Column B)
  requiresImage: boolean("requires_image").default(false), // Flag for image-based questions
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testAttempts = pgTable(
  "test_attempts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    testId: varchar("test_id").references(() => tests.id).notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    totalScore: integer("total_score"),
    sectionScores: jsonb("section_scores"), // {"reading": 25, "listening": 28, etc.}
    timeSpent: integer("time_spent"), // in minutes
    status: text("status").$type<"in_progress" | "completed" | "abandoned">().default("in_progress"),
  },
  (t) => ({
    userIdx: index("idx_test_attempts_user").on(t.userId),
    testIdx: index("idx_test_attempts_test").on(t.testId),
    completedIdx: index("idx_test_attempts_completed").on(t.completedAt),
  }),
);

export const answers = pgTable(
  "answers",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    attemptId: varchar("attempt_id").references(() => testAttempts.id).notNull(),
    questionId: varchar("question_id").references(() => questions.id).notNull(),
    userAnswer: text("user_answer"),
    isCorrect: boolean("is_correct"),
    pointsEarned: integer("points_earned").default(0),
    timeSpent: integer("time_spent"), // in seconds
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (t) => ({
    attemptIdx: index("idx_answers_attempt").on(t.attemptId),
  }),
);

export const reviews = pgTable(
  "reviews",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    reviewerName: text("reviewer_name").notNull(),
    reviewerCountry: text("reviewer_country").notNull(),
    examType: text("exam_type").$type<"toefl" | "gre" | "general">().default("general"),
    achievedScore: integer("achieved_score"),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    isApproved: boolean("is_approved").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    approvedIdx: index("idx_reviews_approved").on(t.isApproved),
  }),
);

export const studyPlans = pgTable("study_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  examType: text("exam_type").$type<"toefl" | "gre">().notNull(),
  targetScore: integer("target_score").notNull(),
  duration: integer("duration").notNull(), // in weeks
  difficulty: text("difficulty").$type<"beginner" | "intermediate" | "advanced">().notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  features: text("features").array().notNull(),
  testCount: integer("test_count").notNull(),
});

// 방문자 로그 및 세션 추적을 위한 테이블
export const visitorLogs = pgTable(
  "visitor_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: text("session_id").notNull(),
    userId: varchar("user_id").references(() => users.id), // null if guest
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    page: text("page").notNull(),
    action: text("action").$type<"visit" | "login" | "logout" | "test_start" | "test_complete" | "signup">().notNull(),
    metadata: jsonb("metadata"), // Additional data like test_id, score, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_visitor_logs_user").on(t.userId),
    createdIdx: index("idx_visitor_logs_created").on(t.createdAt),
    actionIdx: index("idx_visitor_logs_action").on(t.action),
  }),
);

// 일일 통계 요약 테이블 (성능 최적화용)
export const dailyStats = pgTable("daily_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  totalVisitors: integer("total_visitors").default(0),
  uniqueVisitors: integer("unique_visitors").default(0),
  newSignups: integer("new_signups").default(0),
  testsCompleted: integer("tests_completed").default(0),
  averageScore: real("average_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Test Sets - Full test combinations (TOEFL: R+L+S+W, GRE: 2V+2Q+1AW, SAT: R&W+Math)
export const testSets = pgTable("test_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  examType: text("exam_type").$type<"toefl" | "gre" | "sat">().notNull(),
  testType: text("test_type").$type<"toefl" | "newToefl" | "sat">().default("toefl"), // toefl: 2023 July ~ 2026 Jan, newToefl: 2026 Jan ~, sat: Digital SAT
  description: text("description").notNull(),
  totalDuration: integer("total_duration").notNull(), // in minutes
  sectionOrder: text("section_order").array(), // ["reading", "listening", "speaking", "writing"] or ["reading", "listening", "writing", "speaking"]
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Test Set Components - Individual tests that make up a full set
export const testSetComponents = pgTable("test_set_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testSetId: varchar("test_set_id").references(() => testSets.id).notNull(),
  testId: varchar("test_id").references(() => tests.id).notNull(),
  orderIndex: integer("order_index").notNull(), // Order within the set
  isRequired: boolean("is_required").default(true),
});

// Test Set Attempts - Full test set attempts
export const testSetAttempts = pgTable(
  "test_set_attempts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    testSetId: varchar("test_set_id").references(() => testSets.id).notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    currentTestIndex: integer("current_test_index").default(0),
    currentQuestionIndex: integer("current_question_index").default(0), // Current question within current test
    answers: jsonb("answers").default({}), // Saved answers: {"test_0_question_1": "A", ...}
    status: text("status").$type<"in_progress" | "completed" | "paused" | "abandoned">().default("in_progress"),
    totalScore: integer("total_score"), // Overall score for the full test set
    sectionScores: jsonb("section_scores"), // {"reading": 25, "listening": 28, "speaking": 24, "writing": 26}
    percentageScore: decimal("percentage_score", { precision: 5, scale: 2 }), // Overall percentage
    timeSpent: integer("time_spent"), // Total time spent in minutes
    feedback: text("feedback"), // Overall performance feedback
    recommendations: jsonb("recommendations"), // Study recommendations based on performance
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_test_set_attempts_user").on(t.userId),
    statusIdx: index("idx_test_set_attempts_status").on(t.status),
  }),
);

// User Performance History - Track performance over time
export const userPerformanceHistory = pgTable(
  "user_performance_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    testSetAttemptId: varchar("test_set_attempt_id").references(() => testSetAttempts.id),
    testAttemptId: varchar("test_attempt_id").references(() => testAttempts.id), // For individual tests
    examType: text("exam_type").$type<"toefl" | "gre">().notNull(),
    section: text("section"), // Specific section if applicable
    score: integer("score").notNull(),
    maxPossibleScore: integer("max_possible_score").notNull(),
    percentageScore: decimal("percentage_score", { precision: 5, scale: 2 }).notNull(),
    testDate: timestamp("test_date").defaultNow().notNull(),
    strengths: text("strengths").array(), // Areas of strength
    weaknesses: text("weaknesses").array(), // Areas for improvement
    studyRecommendations: jsonb("study_recommendations"), // Personalized study recommendations
  },
  (t) => ({
    userExamIdx: index("idx_user_perf_user_exam").on(t.userId, t.examType),
    dateIdx: index("idx_user_perf_date").on(t.testDate),
  }),
);

// User Study Progress - Track learning progress and integration with study plans
export const userStudyProgress = pgTable(
  "user_study_progress",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    examType: text("exam_type").$type<"toefl" | "gre">().notNull(),
    currentLevel: text("current_level").$type<"beginner" | "intermediate" | "advanced">().default("beginner"),
    targetScore: integer("target_score"),
    currentAverageScore: decimal("current_average_score", { precision: 5, scale: 2 }),
    improvementRate: decimal("improvement_rate", { precision: 5, scale: 2 }), // Score improvement per week
    totalStudyHours: integer("total_study_hours").default(0),
    totalTestsTaken: integer("total_tests_taken").default(0),
    strongSections: text("strong_sections").array(), // User's strong sections
    weakSections: text("weak_sections").array(), // Sections needing improvement
    recommendedStudyPlan: text("recommended_study_plan"), // Suggested study plan based on performance
    lastStudyPlanUpdate: timestamp("last_study_plan_update"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userExamIdx: index("idx_user_study_progress_user_exam").on(t.userId, t.examType),
  }),
);

// Duplicate testSetAttempts removed - already defined at line 127

// Test Set Schemas and Types
export const insertTestSetSchema = createInsertSchema(testSets).omit({ id: true, createdAt: true });
export const insertTestSetComponentSchema = createInsertSchema(testSetComponents).omit({ id: true });
export const insertTestSetAttemptSchema = createInsertSchema(testSetAttempts).omit({ id: true, startedAt: true });

export type TestSet = typeof testSets.$inferSelect;
export type InsertTestSet = z.infer<typeof insertTestSetSchema>;
export type TestSetComponent = typeof testSetComponents.$inferSelect;
export type InsertTestSetComponent = z.infer<typeof insertTestSetComponentSchema>;
export type TestSetAttempt = typeof testSetAttempts.$inferSelect;
export type InsertTestSetAttempt = z.infer<typeof insertTestSetAttemptSchema>;
export type UserPerformanceHistory = typeof userPerformanceHistory.$inferSelect;
export type InsertUserPerformanceHistory = typeof userPerformanceHistory.$inferInsert;
export type UserStudyProgress = typeof userStudyProgress.$inferSelect;
export type InsertUserStudyProgress = typeof userStudyProgress.$inferInsert;



export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const adminMessages = pgTable(
  "admin_messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    fromUserId: varchar("from_user_id").notNull().references(() => users.id),
    toUserId: varchar("to_user_id").references(() => users.id),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    toUserIdx: index("idx_admin_messages_to_user").on(t.toUserId),
    isReadIdx: index("idx_admin_messages_is_read").on(t.isRead),
  }),
);

// User Study Plans - Personalized study plans
export const userStudyPlans = pgTable("user_study_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  examType: text("exam_type").$type<"toefl" | "gre">().notNull(),
  currentScore: integer("current_score"),
  targetScore: integer("target_score").notNull(),
  targetDate: timestamp("target_date"),
  duration: integer("duration").notNull(), // in weeks
  status: text("status").$type<"active" | "completed" | "paused">().default("active"),
  weeklyHours: integer("weekly_hours").default(10),
  focusAreas: text("focus_areas").array(), // ["reading", "writing", etc.]
  // Enhanced AI fields
  learningStyle: text("learning_style").$type<"intensive" | "balanced" | "relaxed">().default("balanced"),
  weaknessDetails: text("weakness_details"), // Detailed description of weaknesses
  studyEnvironment: text("study_environment").$type<"home" | "office" | "cafe" | "library">().default("home"),
  preferredTimeSlot: text("preferred_time_slot").$type<"morning" | "afternoon" | "evening" | "night">().default("evening"),
  aiGeneratedPlan: jsonb("ai_generated_plan"), // AI-generated detailed curriculum
  aiPlanSummary: text("ai_plan_summary"), // AI summary of the plan
  completedTasks: integer("completed_tasks").default(0),
  totalTasks: integer("total_tasks").default(0),
  completedTaskKeys: text("completed_task_keys").array(), // Array of "week-day" keys for completed tasks
  achievementBadges: text("achievement_badges").array(), // Earned badges
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Study Schedule - Daily/weekly learning schedule
export const studySchedule = pgTable("study_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userStudyPlanId: varchar("user_study_plan_id").notNull().references(() => userStudyPlans.id),
  date: timestamp("date").notNull(),
  section: text("section").notNull(), // "reading", "listening", etc.
  activity: text("activity").notNull(), // "practice_test", "review", "study"
  testId: varchar("test_id").references(() => tests.id),
  estimatedTime: integer("estimated_time"), // in minutes
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Study Progress - Track learning progress
export const studyProgress = pgTable("study_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userStudyPlanId: varchar("user_study_plan_id").notNull().references(() => userStudyPlans.id),
  week: integer("week").notNull(),
  sectionScores: jsonb("section_scores"), // {"reading": 25, "listening": 28, etc.}
  completedActivities: integer("completed_activities").default(0),
  totalActivities: integer("total_activities").default(0),
  studyHours: integer("study_hours").default(0),
  averageScore: decimal("average_score", { precision: 5, scale: 2 }),
  improvementRate: decimal("improvement_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// TOEFL Listening Content Management
export const listeningTests = pgTable("listening_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  audioUrl: text("audio_url").notNull(), // MP3 file URL
  duration: integer("duration").notNull(), // in seconds
  script: jsonb("script").notNull(), // Array of {start, end, text}
  images: text("images").array(), // Array of image URLs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listeningQuestions = pgTable("listening_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => listeningTests.id).notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").$type<"multiple-choice" | "multiple-select" | "replay">().notNull(),
  options: text("options").array().notNull(), // Array of answer options
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  points: integer("points").default(1),
  orderIndex: integer("order_index").notNull(),
  audioSegment: jsonb("audio_segment"), // {start, end} for the question audio
  replaySegment: jsonb("replay_segment"), // {start, end} for replay questions
  images: text("images").array(), // Question-specific images
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listeningAttempts = pgTable(
  "listening_attempts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    testId: varchar("test_id").references(() => listeningTests.id).notNull(),
    answers: jsonb("answers").notNull(), // User's answers
    score: integer("score").notNull(),
    timeSpent: integer("time_spent").notNull(), // in seconds
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({
    userIdx: index("idx_listening_attempts_user").on(t.userId),
    testIdx: index("idx_listening_attempts_test").on(t.testId),
  }),
);

// TTS 음성 캐시 테이블 - API 크레딧 절약을 위해 생성된 음성 저장
export const listeningTtsAssets = pgTable("listening_tts_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scriptHash: text("script_hash").notNull().unique(),
  voiceProfile: text("voice_profile").default("default"),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration"),
  sizeBytes: integer("size_bytes"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListeningTtsAssetSchema = createInsertSchema(listeningTtsAssets).omit({
  id: true,
  createdAt: true,
});

export type ListeningTtsAsset = typeof listeningTtsAssets.$inferSelect;
export type InsertListeningTtsAsset = z.infer<typeof insertListeningTtsAssetSchema>;

// 결제 관련 테이블
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    planId: text("plan_id").notNull(), // light, pro, max
    planName: text("plan_name").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("KRW"),
    status: text("status").$type<"active" | "inactive" | "cancelled" | "past_due" | "trialing">().default("active"),
    paymentMethodId: text("payment_method_id"), // 토스페이먼츠 결제수단 ID
    billingCycleStart: timestamp("billing_cycle_start").notNull(),
    billingCycleEnd: timestamp("billing_cycle_end").notNull(),
    trialEnd: timestamp("trial_end"),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_subscriptions_user").on(t.userId),
    statusIdx: index("idx_subscriptions_status").on(t.status),
  }),
);

// 결제 내역 테이블
export const payments = pgTable(
  "payments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
    tossPaymentKey: text("toss_payment_key").unique(), // 토스페이먼츠 결제 키
    tossOrderId: text("toss_order_id").unique(), // 토스페이먼츠 주문 ID
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("KRW"),
    status: text("status").$type<"ready" | "in_progress" | "waiting_for_deposit" | "done" | "cancelled" | "partial_cancelled" | "aborted" | "expired">().notNull(),
    method: text("method"), // 결제 방법
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_payments_user").on(t.userId),
    statusIdx: index("idx_payments_status").on(t.status),
  }),
);

// 관리자 로그 테이블
export const adminLogs = pgTable("admin_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // "user_update", "payment_refund", "subscription_cancel", etc.
  targetUserId: varchar("target_user_id").references(() => users.id),
  targetType: text("target_type"), // "user", "payment", "subscription", etc.
  targetId: text("target_id"),
  details: jsonb("details"), // 상세 정보
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student Achievement Showcase
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photoUrl: text("photo_url").notNull(), // 성취 사진 URL
  previousScore: integer("previous_score").notNull(), // 이전 점수
  currentScore: integer("current_score").notNull(), // 현재 점수
  examType: text("exam_type").$type<"toefl" | "gre">().notNull(),
  reviewText: text("review_text").notNull(), // 후기 내용
  reviewerName: text("reviewer_name").notNull(), // 작성자 이름
  reviewerCountry: text("reviewer_country").notNull(), // 작성자 국가
  rating: integer("rating").notNull(), // 별점 (1-5)
  isDisplayed: boolean("is_displayed").default(false), // 랜딩페이지 표시 여부
  isActive: boolean("is_active").default(true), // 활성 상태
  displayOrder: integer("display_order").default(0), // 표시 순서
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

export const insertTestAttemptSchema = createInsertSchema(testAttempts).omit({
  id: true,
  startedAt: true,
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  submittedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  userId: true,
  isApproved: true,
  createdAt: true,
});

export const insertAdminMessageSchema = createInsertSchema(adminMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserStudyPlanSchema = createInsertSchema(userStudyPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudyScheduleSchema = createInsertSchema(studySchedule).omit({
  id: true,
  createdAt: true,
});

export const insertStudyProgressSchema = createInsertSchema(studyProgress).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof tests.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect & {
  type?: "multiple-choice" | "essay" | "speaking" | "listening" | "fill_blank";
  content?: string;
  options?: string[];
};
export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;
export type TestAttempt = typeof testAttempts.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answers.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

// FAQ table
export const faqs = pgTable("faqs", {
  id: varchar("id").primaryKey().$defaultFn(() => `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").$type<"general" | "toefl" | "gre" | "technical">().default("general"),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// TOEFL Speaking Tests
export const speakingTests = pgTable("speaking_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").$type<"independent" | "integrated">().notNull(),
  questionType: text("question_type"), // For integrated: '2', '3', '4' (Task numbers)
  description: text("description"),
  topic: text("topic"), // For independent questions
  readingPassageTitle: text("reading_passage_title"), // Title for reading passage (for integrated Task 2 & 3)
  readingPassage: text("reading_passage"), // For integrated questions
  readingTime: integer("reading_time").default(45), // seconds
  listeningAudioUrl: text("listening_audio_url"), // For integrated questions
  listeningScript: text("listening_script"),
  questionText: text("question_text").notNull(),
  preparationTime: integer("preparation_time").notNull(), // seconds (15 for independent, 30 for integrated)
  responseTime: integer("response_time").notNull(), // seconds (45 for independent, 60 for integrated)
  sampleAnswer: text("sample_answer"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const speakingAttempts = pgTable(
  "speaking_attempts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    testId: varchar("test_id").references(() => speakingTests.id).notNull(),
    recordingUrl: text("recording_url"), // Audio recording URL
    transcription: text("transcription"), // Speech-to-text result
    score: integer("score"), // AI generated score
    feedback: text("feedback"), // AI generated feedback
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({
    userIdx: index("idx_speaking_attempts_user").on(t.userId),
    testIdx: index("idx_speaking_attempts_test").on(t.testId),
  }),
);

// TOEFL Writing Tests
export const writingTests = pgTable("writing_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").$type<"integrated" | "discussion">().notNull(),
  description: text("description"),
  // For integrated tasks
  readingPassage: text("reading_passage"),
  readingTime: integer("reading_time").default(180), // 3 minutes in seconds
  listeningAudioUrl: text("listening_audio_url"),
  listeningScript: text("listening_script"),
  // For discussion tasks
  discussionTopic: text("discussion_topic"),
  student1Opinion: text("student1_opinion"),
  student2Opinion: text("student2_opinion"),
  questionText: text("question_text").notNull(),
  writingTime: integer("writing_time").notNull(), // 20 minutes for integrated, 10 for discussion
  wordLimit: integer("word_limit").default(300),
  sampleEssay: text("sample_essay"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const writingAttempts = pgTable(
  "writing_attempts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    testId: varchar("test_id").references(() => writingTests.id).notNull(),
    essayText: text("essay_text"), // User's essay
    wordCount: integer("word_count"),
    score: integer("score"), // AI generated score
    feedback: text("feedback"), // AI generated feedback
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({
    userIdx: index("idx_writing_attempts_user").on(t.userId),
    testIdx: index("idx_writing_attempts_test").on(t.testId),
  }),
);

// GRE Tests
export const greTests = pgTable("gre_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").$type<"analytical_writing" | "verbal_reasoning" | "quantitative_reasoning">().notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GRE Analytical Writing Tests
export const greAnalyticalWritingTests = pgTable("gre_analytical_writing_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  taskType: text("task_type").$type<"analyze_issue" | "analyze_argument">().notNull(),
  prompt: text("prompt").notNull(),
  instructions: text("instructions").notNull(),
  timeLimit: integer("time_limit").default(30), // minutes
  sampleEssay: text("sample_essay"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GRE Verbal Reasoning Tests
export const greVerbalReasoningTests = pgTable("gre_verbal_reasoning_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit").default(18), // minutes per section
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const greVerbalQuestions = pgTable("gre_verbal_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => greVerbalReasoningTests.id).notNull(),
  questionType: text("question_type").$type<"text_completion" | "sentence_equivalence" | "reading_comprehension" | "multiple_choice">().notNull(),
  passage: text("passage"), // For reading comprehension
  questionText: text("question_text").notNull(),
  options: text("options").array(), // Answer choices
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  blanks: integer("blanks").default(1), // Number of blanks for completion questions
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GRE Quantitative Reasoning Tests
export const greQuantitativeReasoningTests = pgTable("gre_quantitative_reasoning_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit").default(35), // minutes per section
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const greQuantitativeQuestions = pgTable("gre_quantitative_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => greQuantitativeReasoningTests.id).notNull(),
  questionType: text("question_type").$type<"quantitative_comparison" | "multiple_choice" | "numeric_entry" | "multiple_answer">().notNull(),
  questionText: text("question_text").notNull(),
  quantityA: text("quantity_a"), // For quantitative comparison
  quantityB: text("quantity_b"), // For quantitative comparison
  options: text("options").array(), // Answer choices
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  figures: text("figures").array(), // URLs to mathematical figures/charts
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GRE Test Attempts
export const greTestAttempts = pgTable(
  "gre_test_attempts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    testType: text("test_type").$type<"analytical_writing" | "verbal_reasoning" | "quantitative_reasoning">().notNull(),
    testId: varchar("test_id").notNull(), // References different test tables based on type
    answers: jsonb("answers"), // User's answers
    score: integer("score"),
    timeSpent: integer("time_spent"), // in minutes
    status: text("status").$type<"in_progress" | "completed" | "abandoned">().default("in_progress"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({
    userIdx: index("idx_gre_test_attempts_user").on(t.userId),
    userTypeIdx: index("idx_gre_test_attempts_user_type").on(t.userId, t.testType),
  }),
);

// AI Generated Tests - Persistent storage for AI-generated test content
export const aiGeneratedTests = pgTable(
  "ai_generated_tests",
  {
    id: varchar("id").primaryKey(),
    testType: text("test_type").$type<"toefl" | "gre">().notNull(),
    section: text("section").notNull(), // "reading", "listening", "speaking", "writing", "verbal", "quantitative", "analytical"
    title: text("title").notNull(),
    description: text("description"),
    difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
    testData: jsonb("test_data").notNull(), // Contains passages, questions, and all test content
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeSectionIdx: index("idx_ai_tests_type_section").on(t.testType, t.section),
    activeIdx: index("idx_ai_tests_active").on(t.isActive),
  }),
);

export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiGeneratedTestSchema = createInsertSchema(aiGeneratedTests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSpeakingTestSchema = createInsertSchema(speakingTests).omit({ id: true, createdAt: true });
export const insertSpeakingAttemptSchema = createInsertSchema(speakingAttempts).omit({ id: true, startedAt: true });
export const insertWritingTestSchema = createInsertSchema(writingTests).omit({ id: true, createdAt: true });
export const insertWritingAttemptSchema = createInsertSchema(writingAttempts).omit({ id: true, startedAt: true });

// GRE Insert Schemas
export const insertGreTestSchema = createInsertSchema(greTests).omit({ id: true, createdAt: true });
export const insertGreAnalyticalWritingTestSchema = createInsertSchema(greAnalyticalWritingTests).omit({ id: true, createdAt: true });
export const insertGreVerbalReasoningTestSchema = createInsertSchema(greVerbalReasoningTests).omit({ id: true, createdAt: true });
export const insertGreVerbalQuestionSchema = createInsertSchema(greVerbalQuestions).omit({ id: true, createdAt: true });
export const insertGreQuantitativeReasoningTestSchema = createInsertSchema(greQuantitativeReasoningTests).omit({ id: true, createdAt: true });
export const insertGreQuantitativeQuestionSchema = createInsertSchema(greQuantitativeQuestions).omit({ id: true, createdAt: true });
export const insertGreTestAttemptSchema = createInsertSchema(greTestAttempts).omit({ id: true, startedAt: true });

export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof faqs.$inferSelect;
export type AiGeneratedTest = typeof aiGeneratedTests.$inferSelect;
export type InsertAiGeneratedTest = z.infer<typeof insertAiGeneratedTestSchema>;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type InsertAdminMessage = z.infer<typeof insertAdminMessageSchema>;
export type AdminMessage = typeof adminMessages.$inferSelect;

// 결제 관련 타입
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({ id: true, createdAt: true });

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type UserStudyPlan = typeof userStudyPlans.$inferSelect;
export type InsertUserStudyPlan = z.infer<typeof insertUserStudyPlanSchema>;
export type StudyScheduleItem = typeof studySchedule.$inferSelect;
export type InsertStudySchedule = z.infer<typeof insertStudyScheduleSchema>;
export type StudyProgress = typeof studyProgress.$inferSelect;
export type InsertStudyProgress = z.infer<typeof insertStudyProgressSchema>;

export type SpeakingTest = typeof speakingTests.$inferSelect;
export type InsertSpeakingTest = z.infer<typeof insertSpeakingTestSchema>;
export type SpeakingAttempt = typeof speakingAttempts.$inferSelect;
export type InsertSpeakingAttempt = z.infer<typeof insertSpeakingAttemptSchema>;
export type WritingTest = typeof writingTests.$inferSelect;
export type InsertWritingTest = z.infer<typeof insertWritingTestSchema>;
export type WritingAttempt = typeof writingAttempts.$inferSelect;
export type InsertWritingAttempt = z.infer<typeof insertWritingAttemptSchema>;

// GRE Types
export type GreTest = typeof greTests.$inferSelect;
export type InsertGreTest = z.infer<typeof insertGreTestSchema>;
export type GreAnalyticalWritingTest = typeof greAnalyticalWritingTests.$inferSelect;
export type InsertGreAnalyticalWritingTest = z.infer<typeof insertGreAnalyticalWritingTestSchema>;
export type GreVerbalReasoningTest = typeof greVerbalReasoningTests.$inferSelect;
export type InsertGreVerbalReasoningTest = z.infer<typeof insertGreVerbalReasoningTestSchema>;
export type GreVerbalQuestion = typeof greVerbalQuestions.$inferSelect;
export type InsertGreVerbalQuestion = z.infer<typeof insertGreVerbalQuestionSchema>;
export type GreQuantitativeReasoningTest = typeof greQuantitativeReasoningTests.$inferSelect;
export type InsertGreQuantitativeReasoningTest = z.infer<typeof insertGreQuantitativeReasoningTestSchema>;
export type GreQuantitativeQuestion = typeof greQuantitativeQuestions.$inferSelect;
export type InsertGreQuantitativeQuestion = z.infer<typeof insertGreQuantitativeQuestionSchema>;
export type GreTestAttempt = typeof greTestAttempts.$inferSelect;
export type InsertGreTestAttempt = z.infer<typeof insertGreTestAttemptSchema>;

// SAT Tests - Digital SAT 2024-2025 format
export const satReadingWritingTests = pgTable("sat_reading_writing_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit").default(32), // 32 minutes per module
  module: integer("module").default(1), // 1 or 2 (adaptive)
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const satReadingWritingQuestions = pgTable("sat_reading_writing_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => satReadingWritingTests.id).notNull(),
  questionType: text("question_type").$type<"craft_structure" | "information_ideas" | "expression_ideas" | "standard_english">().notNull(),
  passage: text("passage"), // Short passage (25-150 words)
  passageTitle: text("passage_title"),
  questionText: text("question_text").notNull(),
  options: text("options").array(), // Answer choices A, B, C, D
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  explanationKo: text("explanation_ko"),
  explanationJa: text("explanation_ja"),
  explanationTh: text("explanation_th"),
  domain: text("domain").$type<"craft_structure" | "information_ideas" | "expression_ideas" | "standard_english">(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const satMathTests = pgTable("sat_math_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit").default(35), // 35 minutes per module
  module: integer("module").default(1), // 1 or 2 (adaptive)
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const satMathQuestions = pgTable("sat_math_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => satMathTests.id).notNull(),
  questionType: text("question_type").$type<"multiple_choice" | "student_response">().notNull(),
  questionText: text("question_text").notNull(),
  options: text("options").array(), // For multiple choice
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  explanationKo: text("explanation_ko"),
  explanationJa: text("explanation_ja"),
  explanationTh: text("explanation_th"),
  domain: text("domain").$type<"algebra" | "advanced_math" | "problem_solving" | "geometry_trig">(),
  figures: text("figures").array(), // URLs to mathematical figures
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SAT Test Attempts
export const satTestAttempts = pgTable(
  "sat_test_attempts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id).notNull(),
    testType: text("test_type").$type<"reading_writing" | "math">().notNull(),
    testId: varchar("test_id").notNull(),
    module: integer("module").default(1),
    answers: jsonb("answers"),
    score: integer("score"),
    scaledScore: integer("scaled_score"), // 200-800 range
    timeSpent: integer("time_spent"), // in minutes
    status: text("status").$type<"in_progress" | "completed" | "abandoned">().default("in_progress"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({
    userIdx: index("idx_sat_test_attempts_user").on(t.userId),
  }),
);

// SAT Insert Schemas
export const insertSatReadingWritingTestSchema = createInsertSchema(satReadingWritingTests).omit({ id: true, createdAt: true });
export const insertSatReadingWritingQuestionSchema = createInsertSchema(satReadingWritingQuestions).omit({ id: true, createdAt: true });
export const insertSatMathTestSchema = createInsertSchema(satMathTests).omit({ id: true, createdAt: true });
export const insertSatMathQuestionSchema = createInsertSchema(satMathQuestions).omit({ id: true, createdAt: true });
export const insertSatTestAttemptSchema = createInsertSchema(satTestAttempts).omit({ id: true, startedAt: true });

// SAT Types
export type SatReadingWritingTest = typeof satReadingWritingTests.$inferSelect;
export type InsertSatReadingWritingTest = z.infer<typeof insertSatReadingWritingTestSchema>;
export type SatReadingWritingQuestion = typeof satReadingWritingQuestions.$inferSelect;
export type InsertSatReadingWritingQuestion = z.infer<typeof insertSatReadingWritingQuestionSchema>;
export type SatMathTest = typeof satMathTests.$inferSelect;
export type InsertSatMathTest = z.infer<typeof insertSatMathTestSchema>;
export type SatMathQuestion = typeof satMathQuestions.$inferSelect;
export type InsertSatMathQuestion = z.infer<typeof insertSatMathQuestionSchema>;
export type SatTestAttempt = typeof satTestAttempts.$inferSelect;
export type InsertSatTestAttempt = z.infer<typeof insertSatTestAttemptSchema>;

// Performance Analytics Table
export const performanceAnalytics = pgTable("performance_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  examType: text("exam_type").$type<"toefl" | "gre">().notNull(),
  totalScore: integer("total_score"),
  sectionScores: jsonb("section_scores"), // Store section-specific scores
  percentile: integer("percentile"),
  testDate: timestamp("test_date"),
  targetScore: integer("target_score"),
  improvementAreas: text("improvement_areas").array(),
  studyRecommendations: text("study_recommendations"),
  strengthAreas: text("strength_areas").array(),
  weeklyStudyTime: integer("weekly_study_time"), // hours per week
  studyStreak: integer("study_streak").default(0), // consecutive days studied
  lastAnalysisDate: timestamp("last_analysis_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPerformanceAnalyticsSchema = createInsertSchema(performanceAnalytics).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastAnalysisDate: true
});

export type PerformanceAnalytics = typeof performanceAnalytics.$inferSelect;
export type InsertPerformanceAnalytics = z.infer<typeof insertPerformanceAnalyticsSchema>;





// Success Stories table
export const successStories = pgTable("success_stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  country: varchar("country").notNull(),
  score: varchar("score").notNull(),
  rating: integer("rating").notNull().default(5),
  review: text("review").notNull(),
  backgroundImage: varchar("background_image"),
  videoUrl: varchar("video_url"),
  accent: varchar("accent").notNull().default("from-blue-500 to-purple-600"),
  initials: varchar("initials").notNull(),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Statistics table for the success section
export const successStats = pgTable("success_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  averageRating: decimal("average_rating", { precision: 3, scale: 1 }).notNull().default("4.9"),
  totalSuccessStories: integer("total_success_stories").notNull().default(3),
  averageScoreImprovement: integer("average_score_improvement").notNull().default(25),
  goalAchievementRate: integer("goal_achievement_rate").notNull().default(98),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSuccessStorySchema = createInsertSchema(successStories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSuccessStatsSchema = createInsertSchema(successStats).omit({
  id: true,
  updatedAt: true,
});

export type SuccessStory = typeof successStories.$inferSelect;
export type InsertSuccessStory = z.infer<typeof insertSuccessStorySchema>;
export type SuccessStats = typeof successStats.$inferSelect;
export type InsertSuccessStats = z.infer<typeof insertSuccessStatsSchema>;

// AI Usage Tracking table
export const aiUsage = pgTable("ai_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  feature: varchar("feature").notNull(), // "question_generation", "speaking_feedback", "writing_feedback", etc.
  tokensUsed: integer("tokens_used").default(0),
  requestCount: integer("request_count").default(1),
  sessionDuration: integer("session_duration").default(0), // in seconds
  examType: varchar("exam_type"), // "toefl" or "gre"
  section: varchar("section"), // "reading", "listening", etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Program Management table
export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  examType: varchar("exam_type").notNull(), // "toefl", "gre", "both"
  programType: varchar("program_type").notNull(), // "test_set", "video_course", "speaking_practice", etc.
  duration: integer("duration").default(0), // in minutes
  difficulty: varchar("difficulty").default("medium"), // "easy", "medium", "hard"
  membershipRequired: varchar("membership_required").default("guest"), // "guest", "light", "pro", "max"
  isActive: boolean("is_active").default(true),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00"),
  features: text("features").array(), // JSON array of features
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Program Access table
export const userProgramAccess = pgTable("user_program_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  programId: varchar("program_id").notNull(),
  accessType: varchar("access_type").default("granted"), // "granted", "purchased", "trial"
  expiresAt: timestamp("expires_at"),
  grantedBy: varchar("granted_by"), // admin user ID
  createdAt: timestamp("created_at").defaultNow(),
});

// User Activity Tracking table
export const userActivity = pgTable("user_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  activityType: varchar("activity_type").notNull(), // "test_taken", "video_watched", "ai_used", etc.
  details: jsonb("details"), // Additional details about the activity
  duration: integer("duration").default(0), // in seconds
  score: integer("score"), // if applicable
  createdAt: timestamp("created_at").defaultNow(),
});

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiUsageSchema = createInsertSchema(aiUsage).omit({
  id: true,
  createdAt: true,
});

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProgramAccessSchema = createInsertSchema(userProgramAccess).omit({
  id: true,
  createdAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertVisitorLogSchema = createInsertSchema(visitorLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  id: true,
  createdAt: true,
});

export type AiUsage = typeof aiUsage.$inferSelect;
export type InsertAiUsage = z.infer<typeof insertAiUsageSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type UserProgramAccess = typeof userProgramAccess.$inferSelect;
export type InsertUserProgramAccess = z.infer<typeof insertUserProgramAccessSchema>;
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type VisitorLog = typeof visitorLogs.$inferSelect;
export type InsertVisitorLog = z.infer<typeof insertVisitorLogSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;

// New TOEFL Reading Tests (2026 Format)
export const newToeflReadingTests = pgTable("new_toefl_reading_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  moduleNumber: integer("module_number").notNull(), // 1 or 2
  completeWords: jsonb("complete_words").notNull(), // {paragraph: string, answers: [{word, missingLetters}]}
  comprehensionPassages: jsonb("comprehension_passages").notNull(), // Array of {type, title, content, questions}
  academicPassage: jsonb("academic_passage").notNull(), // {title, content, questions}
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewToeflReadingTestSchema = createInsertSchema(newToeflReadingTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NewToeflReadingTest = typeof newToeflReadingTests.$inferSelect;
export type InsertNewToeflReadingTest = z.infer<typeof insertNewToeflReadingTestSchema>;

// TypeScript interfaces for JSONB fields
export interface CompleteWordsData {
  paragraph: string;
  answers: { word: string; missingLetters: string; blankLength?: number }[];
  blanks?: { hint: string; answer: string; blankLength: number }[];
}

export interface ComprehensionPassageData {
  type: "notice" | "email" | "announcement";
  title: string;
  content: string;
  questions: {
    id: number;
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
}

export interface AcademicPassageData {
  title: string;
  content: string;
  questions: {
    id: number;
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
}

// New TOEFL Listening Tests (2026 Format)
export const newToeflListeningTests = pgTable("new_toefl_listening_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  listenAndChoose: jsonb("listen_and_choose").notNull(), // Array of short dialogue questions
  conversations: jsonb("conversations").notNull(), // Array of conversation passages with questions
  announcements: jsonb("announcements").notNull(), // Array of announcement passages with questions
  academicTalks: jsonb("academic_talks").notNull(), // Array of academic talk passages with questions
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewToeflListeningTestSchema = createInsertSchema(newToeflListeningTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NewToeflListeningTest = typeof newToeflListeningTests.$inferSelect;
export type InsertNewToeflListeningTest = z.infer<typeof insertNewToeflListeningTestSchema>;

// TypeScript interfaces for New TOEFL Listening JSONB fields
export interface ListenAndChooseQuestion {
  id: number;
  dialogue: string;
  options: string[];
  correctAnswer: string;
}

export interface ListeningPassageData {
  type: "conversation" | "announcement" | "academic_talk";
  title: string;
  content: string;
  questions: {
    id: number;
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
}

// New TOEFL Writing Tests (2026 Format)
export const newToeflWritingTests = pgTable("new_toefl_writing_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  buildSentences: jsonb("build_sentences").notNull(), // Array of BuildSentenceQuestion
  emailTask: jsonb("email_task").notNull(), // EmailTaskData
  discussionTask: jsonb("discussion_task").notNull(), // DiscussionTaskData
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewToeflWritingTestSchema = createInsertSchema(newToeflWritingTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NewToeflWritingTest = typeof newToeflWritingTests.$inferSelect;
export type InsertNewToeflWritingTest = z.infer<typeof insertNewToeflWritingTestSchema>;

// TypeScript interfaces for New TOEFL Writing JSONB fields
export interface BuildSentenceQuestion {
  id: number;
  contextSentence: string; // Context sentence before the blanks (e.g., "I just finished reading that novel you recommended.")
  sentenceTemplate: string; // Template with blanks (e.g., "The _____ _____ _____ _____ _____ _____ exciting.")
  words: string[]; // Words to arrange (in display order, will be shuffled for user)
  correctOrder: number[]; // Numeric indices for correct word order (e.g., [0, 1, 2, 3, 4, 5] means words[0] first, words[1] second, etc.)
  isValid?: boolean; // Parsing validation status - false if word mismatch detected
  validationError?: string; // Error message if parsing validation failed
  // Legacy fields for backward compatibility
  originalSentence?: string;
  template?: string;
  scrambledWords?: string[];
}

export interface EmailTaskData {
  instructions: string;
  scenario: string;
  requirements: string[];
  emailTo: string;
  emailSubject: string;
}

export interface DiscussionTaskData {
  instructions: string;
  classContext: string;
  professorName: string;
  professorQuestion: string;
  students: {
    name: string;
    response: string;
  }[];
}

// New TOEFL Speaking Tests (2026 Format)
export const newToeflSpeakingTests = pgTable("new_toefl_speaking_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  listenAndRepeat: jsonb("listen_and_repeat").notNull(), // ListenAndRepeatData
  takeAnInterview: jsonb("take_an_interview").notNull(), // TakeAnInterviewData
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewToeflSpeakingTestSchema = createInsertSchema(newToeflSpeakingTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NewToeflSpeakingTest = typeof newToeflSpeakingTests.$inferSelect;
export type InsertNewToeflSpeakingTest = z.infer<typeof insertNewToeflSpeakingTestSchema>;

// TypeScript interfaces for New TOEFL Speaking JSONB fields
export interface ListenAndRepeatData {
  directions: string;
  context: string;
  statements: {
    id: number;
    statement: string;
  }[];
}

export interface TakeAnInterviewData {
  directions: string;
  context: string;
  opening: string;
  questions: {
    id: number;
    question: string;
  }[];
}

// New TOEFL Feedback Requests (for Speaking/Writing sections)
export const newToeflFeedbackRequests = pgTable("new_toefl_feedback_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  testType: text("test_type").$type<"speaking" | "writing">().notNull(),
  testId: varchar("test_id").notNull(), // Reference to the specific test
  questionType: text("question_type").notNull(), // "interview", "listen_repeat", "complete_sentence", "email", "discussion"
  questionId: integer("question_id").notNull(), // Specific question within the test
  userAnswer: text("user_answer").notNull(), // User's response
  questionContent: text("question_content").notNull(), // Original question for context
  status: text("status").$type<"pending" | "approved" | "rejected">().default("pending"),
  feedback: jsonb("feedback"), // AI-generated feedback
  totalScore: integer("total_score"), // 0-30 for TOEFL speaking/writing
  approvedBy: varchar("approved_by").references(() => users.id), // Admin who approved
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewToeflFeedbackRequestSchema = createInsertSchema(newToeflFeedbackRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NewToeflFeedbackRequest = typeof newToeflFeedbackRequests.$inferSelect;
export type InsertNewToeflFeedbackRequest = z.infer<typeof insertNewToeflFeedbackRequestSchema>;

// TypeScript interfaces for feedback JSONB

// 문장별 교정 피드백 (Speaking/Writing 공통)
export interface SpeakingSentenceCorrection {
  original: string; // 학생이 말한 원래 문장
  corrected: string; // 교정된 문장
  explanation: string; // 왜 이렇게 고쳤는지 설명
}

export interface SpeakingFeedbackData {
  totalScore: number; // 0-30
  overallComment: string; // 총평
  languageUse: { score: number; comment: string }; // 언어 사용
  logic: { score: number; comment: string }; // 논리
  delivery: { score: number; comment: string }; // 발음 및 유창성
  modelAnswer: string; // 개선된 모범답안
  sentenceBysentenceFeedback?: SpeakingSentenceCorrection[]; // 문장별 피드백 (Optional for backward compatibility)
}

export interface WritingCompleteSentenceFeedback {
  correctAnswer: string; // 정답
  explanation: string; // 왜 정답인지
  userMistakes: string; // 틀린 부분과 이유
}

export interface WritingEssayFeedbackData {
  totalScore: number; // 0-30
  overallComment: string; // 총평
  languageUse: { score: number; comment: string }; // 언어 사용
  logic: { score: number; comment: string }; // 논리
  contextFlow: { score: number; comment: string }; // 문맥의 흐름
  modelAnswer: string; // 개선된 모범답안
}

// TOEFL iBT Writing Comprehensive Feedback - ETS 2024 Official Rubric Based
export interface SentenceFeedback {
  original: string; // 원본 문장
  correction: string; // 수정된 문장 (변경 없으면 동일)
  hasError: boolean; // 오류 여부
  errorType?: 'grammar' | 'vocabulary' | 'clarity' | 'logic' | 'style'; // 오류 유형
  feedback: string; // 해당 문장에 대한 피드백
}

export interface EssentialExpression {
  expression: string; // 필수 표현 (영어)
  meaning: string; // 의미 (사용자 언어)
  exampleSentence: string; // 예문 (영어)
}

// Integrated Writing Task Feedback (ETS 0-5 scale)
export interface IntegratedWritingFeedbackData {
  etsScore: number; // 0-5 (ETS official scale)
  totalScore: number; // 0-30 converted score
  overallComment: string; // 총평
  contentAccuracy: { score: number; comment: string }; // 요약 정확도 (0-10) - 읽기/듣기 내용 정확히 요약했는지
  organization: { score: number; comment: string }; // 구성 (0-10) - 논리적 구조와 정보 연결
  languageUse: { score: number; comment: string }; // 언어 사용 (0-10) - 어휘, 문장 구조
  grammar: { score: number; comment: string }; // 문법 (별도 상세 평가)
  sentenceFeedback: SentenceFeedback[]; // 문장별 피드백
  modelAnswer: string; // 개선된 모범답안
  essentialExpressions: EssentialExpression[]; // 필수 표현 5개 (의미 + 예문)
  keyPointsCovered: { point: string; covered: boolean; comment: string }[]; // 주요 포인트 체크
}

// Academic Discussion Task Feedback (ETS 0-5 scale)
export interface DiscussionWritingFeedbackData {
  etsScore: number; // 0-5 (ETS official scale)
  totalScore: number; // 0-30 converted score
  overallComment: string; // 총평
  argumentation: { score: number; comment: string }; // 논리 전개 (0-10) - 주장의 명확성과 깊이
  development: { score: number; comment: string }; // 발전성 (0-10) - 설명, 예시, 세부사항
  languageUse: { score: number; comment: string }; // 언어 사용 (0-10) - 어휘 다양성, 문장 구조
  grammar: { score: number; comment: string }; // 문법 (별도 상세 평가)
  sentenceFeedback: SentenceFeedback[]; // 문장별 피드백
  modelAnswer: string; // 개선된 모범답안
  essentialExpressions: EssentialExpression[]; // 필수 표현 5개 (의미 + 예문)
  topicRelevance: { isRelevant: boolean; comment: string }; // 주제 관련성
}

// 2026 TOEFL Speaking Interview Feedback (0-6 scale with half points)
export interface NewToeflSpeakingInterviewFeedback {
  totalScore: number; // 0-6 (half-point increments: 0, 0.5, 1, 1.5, ... 6)
  overallComment: string; // 총평
  languageUse: { score: number; comment: string }; // 언어 사용 (0-6)
  logic: { score: number; comment: string }; // 논리 (0-6)
  delivery: { score: number; comment: string }; // 발음 및 유창성 (0-6)
  modelAnswer: string; // 개선된 모범답안 (고급과 동일 — 하위 호환용)
  tieredModelAnswers?: { // 수준별 모범답안 (신규)
    beginner: string;      // 초급 (B1, 45-60 words)
    intermediate: string;  // 중급 (B2, 70-90 words)
    advanced: string;      // 고급 (C1+, 100-120 words)
  };
  essentialExpressions: { expression: string; meaning: string }[]; // 필수 표현 5개
}

// 2026 TOEFL Writing Email/Discussion Feedback (1-6 ETS rubric scale + 30-point conversion)
export interface NewToeflWritingFeedback {
  totalScore: number; // 1-6 (half-point increments: 1, 1.5, 2, ... 5.5, 6)
  scaledScore: number; // 0-30 점 환산 (totalScore × 5)
  scoreBand: string; // ETS Score Band (e.g., "Fully Successful", "Generally Successful")
  cefrLevel?: string; // legacy field for backward compat
  overallComment: string; // 총평
  languageUse: { score: number; comment: string }; // 언어 사용 (0-6)
  logic: { score: number; comment: string }; // 논리 (0-6)
  contextFlow: { score: number; comment: string }; // 문맥의 흐름 (0-6)
  sentenceFeedback: { // 문장별 피드백
    sentence: string; // 원본 문장
    correctedSentence: string; // 교정된 문장
    feedback: string; // 피드백 설명
    issueType: string; // 문제 유형 (grammar, vocabulary, style, etc.)
  }[];
  modelAnswer: string; // 개선된 모범답안 (고급과 동일 — 하위 호환용)
  tieredModelAnswers?: { // 수준별 모범답안 (신규)
    beginner: string;      // 초급 (B1)
    intermediate: string;  // 중급 (B2)
    advanced: string;      // 고급 (C1+)
  };
  essentialExpressions: { // 필수 표현 (구문/숙어 단위)
    expression: string; // 영어 표현
    meaning: string; // 의미 설명
    usage: string; // 사용 예문
    category: string; // 카테고리 (formal, transition, opinion, etc.)
  }[];
}

// 2026 TOEFL Speaking Listen & Repeat Feedback
export interface NewToeflListenRepeatFeedback {
  accuracyScore: number; // 0-100 percentage match
  overallComment: string; // 총평
  pronunciation: { score: number; comment: string }; // 발음 (0-6)
  intonation: { score: number; comment: string }; // 억양 (0-6)
  fluency: { score: number; comment: string }; // 유창성 (0-6)
  corrections: { original: string; userSaid: string; tip: string }[]; // 수정 사항
}

// 2026 TOEFL Writing Build a Sentence Feedback
export interface NewToeflBuildSentenceFeedback {
  isCorrect: boolean;
  correctSentence: string;
  userSentence: string;
  correctAnswer?: string; // 정답 단어 순서 (e.g., "ending, that, had, the plot twist, was, incredibly")
  explanation: string; // 문법 설명
  grammarPoints: { point: string; explanation: string }[]; // 문법 포인트들
}

// 2026 NEW TOEFL Full Test (실전 시험 - 4개 섹션 통합)
export const newToeflFullTests = pgTable("new_toefl_full_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  readingTestId: varchar("reading_test_id").references(() => newToeflReadingTests.id),
  listeningTestId: varchar("listening_test_id").references(() => newToeflListeningTests.id),
  speakingTestId: varchar("speaking_test_id").references(() => newToeflSpeakingTests.id),
  writingTestId: varchar("writing_test_id").references(() => newToeflWritingTests.id),
  totalDuration: integer("total_duration").default(75), // minutes (67-85)
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewToeflFullTestSchema = createInsertSchema(newToeflFullTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NewToeflFullTest = typeof newToeflFullTests.$inferSelect;
export type InsertNewToeflFullTest = z.infer<typeof insertNewToeflFullTestSchema>;

// 2026 NEW TOEFL Full Test Attempts (실전 시험 응시 기록)
export const newToeflFullTestAttempts = pgTable("new_toefl_full_test_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fullTestId: varchar("full_test_id").references(() => newToeflFullTests.id),
  currentSection: text("current_section").$type<"reading" | "listening" | "speaking" | "writing" | "completed">().default("reading"),
  currentSectionIndex: integer("current_section_index").default(0), // 0=reading, 1=listening, 2=speaking, 3=writing
  
  // Section-specific data
  readingAnswers: jsonb("reading_answers").default({}),
  listeningAnswers: jsonb("listening_answers").default({}),
  speakingResponses: jsonb("speaking_responses").default({}), // Audio URLs or transcripts
  writingResponses: jsonb("writing_responses").default({}),
  
  // Section scores (0-6 scale for 2026 format)
  readingScore: real("reading_score"),
  listeningScore: real("listening_score"),
  speakingScore: real("speaking_score"),
  writingScore: real("writing_score"),
  totalScore: real("total_score"), // Average of all sections
  
  // CEFR level
  cefrLevel: text("cefr_level").$type<"A1" | "A2" | "B1" | "B2" | "C1" | "C2">(),
  
  // Time tracking
  startedAt: timestamp("started_at").defaultNow().notNull(),
  readingStartedAt: timestamp("reading_started_at"),
  readingCompletedAt: timestamp("reading_completed_at"),
  listeningStartedAt: timestamp("listening_started_at"),
  listeningCompletedAt: timestamp("listening_completed_at"),
  speakingStartedAt: timestamp("speaking_started_at"),
  speakingCompletedAt: timestamp("speaking_completed_at"),
  writingStartedAt: timestamp("writing_started_at"),
  writingCompletedAt: timestamp("writing_completed_at"),
  completedAt: timestamp("completed_at"),
  
  // AI Feedback
  aiFeedback: jsonb("ai_feedback"), // Overall AI feedback for all sections
  sectionFeedback: jsonb("section_feedback"), // Detailed feedback per section
  
  status: text("status").$type<"in_progress" | "completed" | "abandoned">().default("in_progress"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewToeflFullTestAttemptSchema = createInsertSchema(newToeflFullTestAttempts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NewToeflFullTestAttempt = typeof newToeflFullTestAttempts.$inferSelect;
export type InsertNewToeflFullTestAttempt = z.infer<typeof insertNewToeflFullTestAttemptSchema>;

// Full Test AI Feedback Interface
export interface FullTestAIFeedback {
  overallScore: number; // 1-6 (half-point increments)
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  traditionalScore: number; // 0-120 (for transition period)
  overallComment: string; // 종합 평가
  strengths: string[]; // 강점
  weaknesses: string[]; // 약점
  improvementPlan: string; // 개선 계획
  sectionAnalysis: {
    reading: { score: number; comment: string; tips: string[] };
    listening: { score: number; comment: string; tips: string[] };
    speaking: { score: number; comment: string; tips: string[] };
    writing: { score: number; comment: string; tips: string[] };
  };
  studyRecommendations: string[]; // 학습 추천 사항
}

// Test Progress - Stores detailed progress for pause/resume functionality
export const testProgress = pgTable("test_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  testSetAttemptId: varchar("test_set_attempt_id").references(() => testSetAttempts.id),
  testAttemptId: varchar("test_attempt_id").references(() => testAttempts.id),
  testType: text("test_type").$type<"full_test" | "practice">().notNull(),
  examType: text("exam_type").$type<"toefl" | "newToefl" | "gre">().notNull(),
  currentSectionIndex: integer("current_section_index").default(0),
  currentQuestionIndex: integer("current_question_index").default(0),
  timeRemaining: integer("time_remaining"), // in seconds
  answers: jsonb("answers").default({}), // { "section_question_id": "answer" }
  sectionScores: jsonb("section_scores").default({}), // { "reading": 25, "listening": 28 }
  isPaused: boolean("is_paused").default(false),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTestProgressSchema = createInsertSchema(testProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TestProgress = typeof testProgress.$inferSelect;
export type InsertTestProgress = z.infer<typeof insertTestProgressSchema>;

// User Credits - Tracks user's current credit balance
export const userCredits = pgTable("user_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  balance: integer("balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  lifetimeUsed: integer("lifetime_used").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserCreditsSchema = createInsertSchema(userCredits).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type UserCredits = typeof userCredits.$inferSelect;
export type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;

// Credit Transactions - Tracks all credit movements
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").$type<"purchase" | "bonus" | "usage" | "refund" | "admin_adjustment">().notNull(),
  amount: integer("amount").notNull(), // positive for credit, negative for debit
  balanceAfter: integer("balance_after").notNull(),
  description: text("description").notNull(),
  featureType: text("feature_type").$type<"ai_feedback" | "study_plan" | "tts_generation" | "test_generation" | "purchase" | "bonus" | "other">(),
  referenceId: varchar("reference_id"), // ID of related entity (test, feedback, etc.)
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

// Credit costs configuration
export const CREDIT_COSTS = {
  AI_FEEDBACK_SPEAKING: 5,
  AI_FEEDBACK_WRITING: 5,
  AI_STUDY_PLAN: 10,
  TTS_GENERATION: 2,
  AI_TEST_GENERATION: 20,
  AI_EXPLANATION: 1,
} as const;

// Initial credits for new users
export const INITIAL_CREDITS = 50;

// Live Activities - Real-time activity feed for student achievements and milestones
export const liveActivities = pgTable("live_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").$type<"score" | "milestone" | "daily" | "streak">().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  displayName: text("display_name").notNull(), // Masked name like "Kim J."
  avatarUrl: text("avatar_url"),
  scoreValue: real("score_value"), // Score achieved (for score type)
  section: text("section"), // e.g., "reading", "listening", "speaking", "writing"
  examType: text("exam_type").$type<"toefl" | "newToefl" | "gre">(),
  metadata: jsonb("metadata"), // Additional context
  isHighlight: boolean("is_highlight").default(false), // For big achievements (confetti animation)
  expiresAt: timestamp("expires_at"), // When to remove from feed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLiveActivitySchema = createInsertSchema(liveActivities).omit({
  id: true,
  createdAt: true,
});

export type LiveActivity = typeof liveActivities.$inferSelect;
export type InsertLiveActivity = z.infer<typeof insertLiveActivitySchema>;

// Test Audit Logs - Track all admin actions on tests (create, update, delete, approve, reject, restore)
export const testAuditLogs = pgTable("test_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").notNull(),
  testTitle: text("test_title").notNull(),
  testType: text("test_type").$type<"ai_generated" | "manual" | "test_set">().notNull(),
  examType: text("exam_type").$type<"toefl" | "gre" | "sat" | "new-toefl">(),
  section: text("section"),
  action: text("action").$type<"create" | "update" | "delete" | "approve" | "reject" | "restore">().notNull(),
  adminId: varchar("admin_id").references(() => users.id).notNull(),
  adminEmail: text("admin_email").notNull(),
  previousState: jsonb("previous_state"), // State before action (for undo)
  newState: jsonb("new_state"), // State after action
  reason: text("reason"), // Optional reason for action
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestAuditLogSchema = createInsertSchema(testAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type TestAuditLog = typeof testAuditLogs.$inferSelect;
export type InsertTestAuditLog = z.infer<typeof insertTestAuditLogSchema>;

// Learning Feedback table for storing AI-generated student feedback
export const learningFeedback = pgTable("learning_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  feedbackData: jsonb("feedback_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLearningFeedbackSchema = createInsertSchema(learningFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LearningFeedback = typeof learningFeedback.$inferSelect;
export type InsertLearningFeedback = z.infer<typeof insertLearningFeedbackSchema>;

// Saved Explanations & Feedback - persists AI explanations so students can review later
export const savedExplanations = pgTable("saved_explanations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").$type<"explanation" | "feedback">().notNull(),
  section: text("section").$type<"reading" | "listening" | "speaking" | "writing" | "gre-writing" | "sat">().notNull(),
  questionText: text("question_text").notNull(),
  content: jsonb("content").notNull(),
  testId: varchar("test_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedExplanationSchema = createInsertSchema(savedExplanations).omit({
  id: true,
  createdAt: true,
});

export type SavedExplanation = typeof savedExplanations.$inferSelect;
export type InsertSavedExplanation = z.infer<typeof insertSavedExplanationSchema>;

// User Satisfaction Surveys
export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, createdAt: true });
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;

export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  answers: jsonb("answers").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, submittedAt: true });
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;



// Activity Events - Real-time events for the activity feed (separate from liveActivities)
export const activityEvents = pgTable("activity_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  eventType: text("event_type").$type<"test_complete" | "full_test_complete" | "personal_best" | "streak" | "first_test">().notNull(),
  section: text("section"), // reading | listening | speaking | writing
  score: real("score"),
  streakDays: integer("streak_days"),
  displayName: text("display_name").notNull(), // masked e.g. "Kim J."
  isHighlight: boolean("is_highlight").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityEventSchema = createInsertSchema(activityEvents).omit({
  id: true,
  createdAt: true,
});

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;

// Analytics Events - Unified event tracking table
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data"),
  sessionId: varchar("session_id", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  createdAt: true,
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
