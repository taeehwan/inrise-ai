import type { Express } from "express";
import { createServer, type Server } from "http";
import {
  createQuestionGenerationPrompt,
  parseTextWithAI,
  parseUserContentDirectly,
} from "./lib/aiGenerationHelpers";
import { setupLiveActivitySocket } from "./liveActivitySocket";
import { registerAdminStudentResultsRoutes } from "./routes/adminStudentResultsRoutes";
import { registerAdminAiUtilityRoutes } from "./routes/adminAiUtilityRoutes";
import { registerActivityAdminRoutes } from "./routes/activityAdminRoutes";
import { registerAdminAudioMaintenanceRoutes } from "./routes/adminAudioMaintenanceRoutes";
import { registerAdminBillingRoutes } from "./routes/adminBillingRoutes";
import { registerAdminContentRoutes } from "./routes/adminContentRoutes";
import { registerAdminDashboardAnalyticsRoutes } from "./routes/adminDashboardAnalyticsRoutes";
import { registerAdminManagementRoutes } from "./routes/adminManagementRoutes";
import { registerAdminOperationsRoutes } from "./routes/adminOperationsRoutes";
import { registerAchievementRoutes } from "./routes/achievementRoutes";
import { registerAiLearningRoutes } from "./routes/aiLearningRoutes";
import { registerAiTestGenerationRoutes } from "./routes/aiTestGenerationRoutes";
import { registerAiPublicUtilityRoutes } from "./routes/aiPublicUtilityRoutes";
import { registerActivityFeedRoutes } from "./routes/activityFeedRoutes";
import { registerGreContentRoutes } from "./routes/greContentRoutes";
import { registerGreManagementRoutes } from "./routes/greManagementRoutes";
import { registerGreAiRoutes } from "./routes/greAiRoutes";
import { registerLiveActivityRoutes } from "./routes/liveActivityRoutes";
import { registerNewToeflFullTestAttemptRoutes } from "./routes/newToeflFullTestAttemptRoutes";
import { registerNewToeflFeedbackRoutes } from "./routes/newToeflFeedbackRoutes";
import { registerAuthRoutes } from "./routes/authRoutes";
import { registerNewToeflFullTestRoutes } from "./routes/newToeflFullTestRoutes";
import { registerMediaRoutes } from "./routes/mediaRoutes";
import { registerPasswordResetRoutes } from "./routes/passwordResetRoutes";
import { registerPublicTestCatalogRoutes } from "./routes/publicTestCatalogRoutes";
import { registerReviewStudyRoutes } from "./routes/reviewStudyRoutes";
import { registerSatRoutes } from "./routes/satRoutes";
import { registerSpeakingWritingRoutes } from "./routes/speakingWritingRoutes";
import { registerSpeakingAudioRoutes } from "./routes/speakingAudioRoutes";
import { registerStudentInsightRoutes } from "./routes/studentInsightRoutes";
import { registerStudyPlanRoutes } from "./routes/studyPlanRoutes";
import { registerSurveyRoutes } from "./routes/surveyRoutes";
import { registerCoreUserTestRoutes } from "./routes/coreUserTestRoutes";
import { registerTestAttemptRoutes } from "./routes/testAttemptRoutes";
import { registerTestDetailRoutes } from "./routes/testDetailRoutes";
import { registerTestProgressRoutes } from "./routes/testProgressRoutes";
import { registerTestSetAttemptRoutes } from "./routes/testSetAttemptRoutes";
import { registerTestSetRoutes } from "./routes/testSetRoutes";
import { registerUserUtilityRoutes } from "./routes/userUtilityRoutes";
import { registerWritingAiRoutes } from "./routes/writingAiRoutes";
import { configureAuth } from "./auth";
import OpenAI from "openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Environment validation and logging
  const isProduction = process.env.NODE_ENV === 'production';
  console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
  console.log('🔐 Session Secret:', process.env.SESSION_SECRET ? 'Configured' : 'Using default (WARNING)');
  console.log('🗄️  Database URL:', process.env.DATABASE_URL ? 'Configured' : 'MISSING (ERROR)');
  console.log('🔒 Secure Cookies:', isProduction ? 'Enabled (HTTPS)' : 'Disabled (HTTP)');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Liveness probe — registered early so it bypasses session/auth and never depends on DB.
  // Used by platform health checks that only need to know the process is alive.
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
  });

  // Readiness probe — confirms the process can serve real traffic (DB pool reachable).
  // Load balancers should drain this endpoint when it starts returning 503.
  app.get("/ready", async (_req, res) => {
    try {
      const { pool } = await import("./db");
      const started = Date.now();
      await pool.query("select 1");
      res.status(200).json({
        status: "ready",
        uptime: process.uptime(),
        dbLatencyMs: Date.now() - started,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: "not_ready",
        reason: "db_unavailable",
        message: err?.message ?? String(err),
        timestamp: Date.now(),
      });
    }
  });
  
  // Initialize OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Configure authentication
  configureAuth(app);

  registerMediaRoutes(app);

  registerAuthRoutes(app);
  registerAdminAiUtilityRoutes(app);
  registerAdminManagementRoutes(app);
  registerSatRoutes(app);
  registerCoreUserTestRoutes(app);

  // Enhanced performance analytics API that includes AI generated tests
  registerStudentInsightRoutes(app);
  registerUserUtilityRoutes(app);

  // =====================================================
  // User Credits API - Credit balance and transaction management
  // =====================================================

  registerLiveActivityRoutes(app);

  registerTestDetailRoutes(app);
  registerTestAttemptRoutes(app);
  registerGreContentRoutes(app, openai);

  registerReviewStudyRoutes(app);
  registerAchievementRoutes(app);
  registerPasswordResetRoutes(app);

  // ===== ADMIN ROUTES =====
  registerAdminContentRoutes(app);
  registerPublicTestCatalogRoutes(app);

  await registerNewToeflFeedbackRoutes(app);

  registerNewToeflFullTestRoutes(app);

  registerNewToeflFullTestAttemptRoutes(app);

  registerAdminDashboardAnalyticsRoutes(app);

  // Admin student results - fetch all test attempts from all sections
  registerAdminStudentResultsRoutes(app);
  registerSpeakingAudioRoutes(app);

  registerStudyPlanRoutes(app);

  registerAiLearningRoutes(app, openai);
  registerSpeakingWritingRoutes(app);
  registerWritingAiRoutes(app, openai);
  registerGreAiRoutes(app);

  registerGreManagementRoutes(app);

  registerTestSetRoutes(app);

  registerAiTestGenerationRoutes(app, {
    openaiClient: openai,
    computeCorrectOrderFromWords: async (
      words: string[],
      existingContext?: string,
      sentenceTemplate?: string,
    ) => {
      const { computeCorrectOrderFromWords } = await import("./ai-feedback-service");
      return computeCorrectOrderFromWords(words, existingContext, sentenceTemplate);
    },
    createQuestionGenerationPrompt,
    parseTextWithAI,
    parseUserContentDirectly,
  });
  registerTestSetAttemptRoutes(app);

  registerAdminBillingRoutes(app);
  registerAdminOperationsRoutes(app);

  registerSurveyRoutes(app);

  registerAiPublicUtilityRoutes(app);
  registerActivityAdminRoutes(app);

  registerTestProgressRoutes(app);

  const server = createServer(app);

  registerAdminAudioMaintenanceRoutes(app);
  await setupLiveActivitySocket(server);

  registerActivityFeedRoutes(app);

  return server;
}
