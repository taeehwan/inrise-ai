import { db } from "../db";
import {
  adminLogs as adminLogsTable,
  adminMessages as adminMessagesTable,
  answers as answersTable,
  creditTransactions as creditTransactionsTable,
  greTestAttempts as greTestAttemptsTable,
  learningFeedback as learningFeedbackTable,
  listeningAttempts as listeningAttemptsTable,
  liveActivities as liveActivitiesTable,
  newToeflFeedbackRequests as newToeflFeedbackRequestsTable,
  newToeflFullTestAttempts as newToeflFullTestAttemptsTable,
  newToeflFullTests as newToeflFullTestsTable,
  passwordResetTokens as passwordResetTokensTable,
  payments as paymentsTable,
  performanceAnalytics as performanceAnalyticsTable,
  reviews as reviewsTable,
  savedExplanations as savedExplanationsTable,
  satTestAttempts as satTestAttemptsTable,
  speakingAttempts as speakingAttemptsTable,
  studyProgress as studyProgressTable,
  studySchedule as studyScheduleTable,
  subscriptions as subscriptionsTable,
  testAttempts as testAttemptsTable,
  testAuditLogs as testAuditLogsTable,
  testProgress as testProgressTable,
  testSetAttempts,
  userActivity as userActivityTable,
  userCredits as userCreditsTable,
  userPerformanceHistory as userPerformanceHistoryTable,
  userProgramAccess as userProgramAccessTable,
  userStudyPlans as userStudyPlansTable,
  userStudyProgress as userStudyProgressTable,
  users as usersTable,
  visitorLogs,
  writingAttempts as writingAttemptsTable,
} from "@shared/schema";
import { eq, or } from "drizzle-orm";

export async function deleteUserCascadeRecord(usersCache: Map<string, unknown>, id: string): Promise<void> {
  const safeDelete = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === "42P01") {
        console.warn(`⚠️ deleteUser: table not found for "${label}", skipping`);
      } else {
        throw err;
      }
    }
  };

  try {
    await safeDelete("answers", async () => {
      const userAttempts = await db
        .select({ id: testAttemptsTable.id })
        .from(testAttemptsTable)
        .where(eq(testAttemptsTable.userId, id));
      for (const attempt of userAttempts) {
        await db.delete(answersTable).where(eq(answersTable.attemptId, attempt.id));
      }
    });

    await safeDelete("study_schedule+study_progress", async () => {
      const userPlans = await db
        .select({ id: userStudyPlansTable.id })
        .from(userStudyPlansTable)
        .where(eq(userStudyPlansTable.userId, id));
      for (const plan of userPlans) {
        await db.delete(studyScheduleTable).where(eq(studyScheduleTable.userStudyPlanId, plan.id));
        await db.delete(studyProgressTable).where(eq(studyProgressTable.userStudyPlanId, plan.id));
      }
    });

    await safeDelete("new_toefl_feedback_requests (approvedBy)", () =>
      db
        .update(newToeflFeedbackRequestsTable)
        .set({ approvedBy: null })
        .where(eq(newToeflFeedbackRequestsTable.approvedBy, id)),
    );
    await safeDelete("new_toefl_full_tests (createdBy)", () =>
      db.update(newToeflFullTestsTable).set({ createdBy: null }).where(eq(newToeflFullTestsTable.createdBy, id)),
    );

    await safeDelete("user_performance_history", () =>
      db.delete(userPerformanceHistoryTable).where(eq(userPerformanceHistoryTable.userId, id)),
    );
    await safeDelete("test_progress", () =>
      db.delete(testProgressTable).where(eq(testProgressTable.userId, id)),
    );
    await safeDelete("test_attempts", () =>
      db.delete(testAttemptsTable).where(eq(testAttemptsTable.userId, id)),
    );
    await safeDelete("reviews", () => db.delete(reviewsTable).where(eq(reviewsTable.userId, id)));
    await safeDelete("test_set_attempts", () =>
      db.delete(testSetAttempts).where(eq(testSetAttempts.userId, id)),
    );
    await safeDelete("user_study_progress", () =>
      db.delete(userStudyProgressTable).where(eq(userStudyProgressTable.userId, id)),
    );
    await safeDelete("admin_messages", () =>
      db
        .delete(adminMessagesTable)
        .where(or(eq(adminMessagesTable.fromUserId, id), eq(adminMessagesTable.toUserId, id))),
    );
    await safeDelete("user_study_plans", () =>
      db.delete(userStudyPlansTable).where(eq(userStudyPlansTable.userId, id)),
    );
    await safeDelete("listening_attempts", () =>
      db.delete(listeningAttemptsTable).where(eq(listeningAttemptsTable.userId, id)),
    );
    await safeDelete("payments", () => db.delete(paymentsTable).where(eq(paymentsTable.userId, id)));
    await safeDelete("subscriptions", () =>
      db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, id)),
    );
    await safeDelete("admin_logs", () =>
      db
        .delete(adminLogsTable)
        .where(or(eq(adminLogsTable.adminId, id), eq(adminLogsTable.targetUserId, id))),
    );
    await safeDelete("speaking_attempts", () =>
      db.delete(speakingAttemptsTable).where(eq(speakingAttemptsTable.userId, id)),
    );
    await safeDelete("writing_attempts", () =>
      db.delete(writingAttemptsTable).where(eq(writingAttemptsTable.userId, id)),
    );
    await safeDelete("gre_test_attempts", () =>
      db.delete(greTestAttemptsTable).where(eq(greTestAttemptsTable.userId, id)),
    );
    await safeDelete("sat_test_attempts", () =>
      db.delete(satTestAttemptsTable).where(eq(satTestAttemptsTable.userId, id)),
    );
    await safeDelete("performance_analytics", () =>
      db.delete(performanceAnalyticsTable).where(eq(performanceAnalyticsTable.userId, id)),
    );
    await safeDelete("password_reset_tokens", () =>
      db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, id)),
    );
    await safeDelete("new_toefl_feedback_requests", () =>
      db.delete(newToeflFeedbackRequestsTable).where(eq(newToeflFeedbackRequestsTable.userId, id)),
    );
    await safeDelete("new_toefl_full_test_attempts", () =>
      db.delete(newToeflFullTestAttemptsTable).where(eq(newToeflFullTestAttemptsTable.userId, id)),
    );
    await safeDelete("user_credits", () =>
      db.delete(userCreditsTable).where(eq(userCreditsTable.userId, id)),
    );
    await safeDelete("credit_transactions", () =>
      db.delete(creditTransactionsTable).where(eq(creditTransactionsTable.userId, id)),
    );
    await safeDelete("live_activities", () =>
      db.delete(liveActivitiesTable).where(eq(liveActivitiesTable.userId, id)),
    );
    await safeDelete("test_audit_logs", () =>
      db.delete(testAuditLogsTable).where(eq(testAuditLogsTable.adminId, id)),
    );
    await safeDelete("learning_feedback", () =>
      db.delete(learningFeedbackTable).where(eq(learningFeedbackTable.userId, id)),
    );
    await safeDelete("visitor_logs", () => db.delete(visitorLogs).where(eq(visitorLogs.userId, id)));
    await safeDelete("user_program_access", () =>
      db.delete(userProgramAccessTable).where(eq(userProgramAccessTable.userId, id)),
    );
    await safeDelete("user_activity", () =>
      db.delete(userActivityTable).where(eq(userActivityTable.userId, id)),
    );
    await safeDelete("saved_explanations", () =>
      db.delete(savedExplanationsTable).where(eq(savedExplanationsTable.userId, id)),
    );

    await db.delete(usersTable).where(eq(usersTable.id, id));

    usersCache.delete(id);
    console.log("✅ User deleted (cascade):", { id });
  } catch (error) {
    console.error("❌ Failed to delete user:", error);
    throw error;
  }
}
