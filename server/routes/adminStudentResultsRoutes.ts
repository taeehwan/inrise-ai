import type { Express } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { storage } from "../storage";
import { detectAttemptExamType, detectAttemptSection } from "../lib/routeTransforms";

export function registerAdminStudentResultsRoutes(app: Express) {
  app.get("/api/admin/student-results", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { section, examType: examTypeFilter } = req.query;

      const [
        testAttempts,
        speakingAttempts,
        writingAttempts,
        listeningAttempts,
        greTestAttempts,
        satTestAttempts,
        feedbackRequests,
        users,
      ] = await Promise.all([
        storage.getAllAttempts(),
        storage.getAllSpeakingAttempts(),
        storage.getAllWritingAttempts(),
        storage.getAllListeningAttempts(),
        storage.getAllGreTestAttempts(),
        storage.getAllSatTestAttempts(),
        storage.getAllFeedbackRequests(),
        storage.getAllUsers(),
      ]);

      console.log(
        `[StudentResults] Fetched attempts: test=${testAttempts.length}, speaking=${speakingAttempts.length}, writing=${writingAttempts.length}, listening=${listeningAttempts.length}, gre=${greTestAttempts.length}, sat=${satTestAttempts.length}, feedback=${feedbackRequests.length}`,
      );

      const userMap = new Map(users.map((user) => [user.id, user]));
      const enrichAttempt = (attempt: any, sectionType: string, examType: string) => {
        const user = userMap.get(attempt.userId);
        return {
          ...attempt,
          score: attempt.score ?? attempt.totalScore ?? null,
          section: sectionType,
          examType,
          userName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : "Unknown User",
          userEmail: user?.email || "Unknown",
        };
      };

      const results: any[] = [];
      const includeToefl = !examTypeFilter || examTypeFilter === "toefl" || examTypeFilter === "new-toefl";
      const includeGre = !examTypeFilter || examTypeFilter === "gre";
      const includeSat = !examTypeFilter || examTypeFilter === "sat";

      for (const attempt of testAttempts) {
        const attemptSection = detectAttemptSection(attempt.testId, attempt.sectionScores);
        const attemptExamType = detectAttemptExamType(attempt.testId, attempt.sectionScores);
        const matchesExamType =
          !examTypeFilter ||
          examTypeFilter === "all" ||
          (examTypeFilter === "toefl" && (attemptExamType === "toefl" || attemptExamType === "new-toefl")) ||
          (examTypeFilter === "new-toefl" && (attemptExamType === "toefl" || attemptExamType === "new-toefl")) ||
          examTypeFilter === attemptExamType;
        const matchesSection = !section || section === "all" || section === attemptSection;

        if (matchesExamType && matchesSection) {
          results.push(enrichAttempt(attempt, attemptSection, attemptExamType));
        }
      }

      if (includeToefl && (!section || section === "all" || section === "speaking")) {
        results.push(...speakingAttempts.map((attempt) => enrichAttempt(attempt, "speaking", "toefl")));
      }
      if (includeToefl && (!section || section === "all" || section === "writing")) {
        results.push(...writingAttempts.map((attempt) => enrichAttempt(attempt, "writing", "toefl")));
      }
      if (includeToefl && (!section || section === "all" || section === "listening")) {
        results.push(...listeningAttempts.map((attempt) => enrichAttempt(attempt, "listening", "new-toefl")));
      }
      if (
        includeGre &&
        (!section || section === "all" || section === "verbal" || section === "quantitative" || section === "analytical")
      ) {
        results.push(...greTestAttempts.map((attempt) => enrichAttempt(attempt, attempt.testType || "gre", "gre")));
      }
      if (includeSat && (!section || section === "all" || section === "reading_writing" || section === "math")) {
        const enrichedSatAttempts = satTestAttempts.map((attempt) =>
          enrichAttempt(attempt, attempt.testType === "math" ? "math" : "reading_writing", "sat"),
        );
        results.push(...(section && section !== "all" ? enrichedSatAttempts.filter((attempt) => attempt.section === section) : enrichedSatAttempts));
      }

      if (includeToefl) {
        for (const feedbackRequest of feedbackRequests) {
          const feedbackSection = feedbackRequest.testType || "feedback";
          const matchesFeedbackSection =
            !section || section === "all" || section === "feedback" || section === feedbackSection;
          if (!matchesFeedbackSection) continue;
          const user = userMap.get(feedbackRequest.userId);
          results.push({
            ...feedbackRequest,
            score: feedbackRequest.totalScore ?? null,
            section: feedbackSection,
            examType: "new-toefl",
            resultType: "feedback-request",
            testType: feedbackRequest.testType,
            userName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : "Unknown User",
            userEmail: user?.email || "Unknown",
          });
        }
      }

      results.sort((a, b) => {
        const dateA = new Date(a.completedAt || a.startedAt || a.createdAt || 0);
        const dateB = new Date(b.completedAt || b.startedAt || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching student results:", error);
      res.status(500).json({ message: error.message || "Failed to fetch student results" });
    }
  });
}
