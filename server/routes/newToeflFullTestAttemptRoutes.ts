import type { Express } from "express";
import { createActivityEvent } from "../activity-service";
import { generateFullTestFeedback } from "../ai-feedback-service";
import { requireAdvancedAI } from "../middleware/subscription";
import { requireAuth } from "../middleware/auth";
import { aiFeedbackLimiter } from "../middleware/rateLimit";
import { storage } from "../storage";

export function registerNewToeflFullTestAttemptRoutes(app: Express) {
  app.post("/api/new-toefl/full-test-attempts", requireAuth, async (req: any, res) => {
    try {
      const attempt = await storage.createNewToeflFullTestAttempt({ ...req.body, userId: req.user.id });
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/new-toefl/full-test-attempts/:id", requireAuth, async (req: any, res) => {
    try {
      const attempt = await storage.getNewToeflFullTestAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      if (attempt.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(attempt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/new-toefl/full-test-attempts", requireAuth, async (req: any, res) => {
    try {
      const attempts = await storage.getUserNewToeflFullTestAttempts(req.user.id);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/new-toefl/full-test-attempts/:id", requireAuth, async (req: any, res) => {
    try {
      const attempt = await storage.getNewToeflFullTestAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      if (attempt.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.updateNewToeflFullTestAttempt(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/new-toefl/feedback/full-test", requireAuth, requireAdvancedAI, aiFeedbackLimiter, async (req: any, res) => {
    try {
      const { sectionScores, totalScore, language } = req.body;
      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const feedback = await generateFullTestFeedback(sectionScores, totalScore, feedbackLanguage);
      const user = req.user;

      if (user) {
        try {
          await storage.createUserActivity({
            userId: user.id,
            activityType: "full_test_complete",
            details: { totalScore },
            duration: 0,
          });
        } catch {}
      }

      if (user) {
        try {
          const displayName =
            user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email?.split("@")[0] || "익명";
          await createActivityEvent({
            userId: user.id,
            displayName,
            eventType: "full_test_complete",
            score: totalScore,
            isHighlight: true,
          });
        } catch {}
      }

      res.json(feedback);
    } catch (error) {
      console.error("Error generating full test feedback:", error);
      res.status(500).json({ message: "Failed to generate full test feedback" });
    }
  });
}
