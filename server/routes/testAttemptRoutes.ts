import type { Express } from "express";
import { insertAnswerSchema, insertTestAttemptSchema } from "@shared/schema";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { storage } from "../storage";

export function registerTestAttemptRoutes(app: Express) {
  app.get("/api/tests/:id/questions", optionalAuth, async (req, res) => {
    try {
      const questions = await storage.getQuestionsByTestId(req.params.id);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/test-attempts", requireAuth, async (req, res) => {
    try {
      // Always bind attempts to the authenticated user — never trust body.userId.
      const user = req.user as any;
      const validatedData = insertTestAttemptSchema.parse({
        ...req.body,
        userId: user.id,
      });
      const attempt = await storage.createTestAttempt(validatedData);

      if (validatedData.userId) {
        try {
          await storage.createUserActivity({
            userId: validatedData.userId,
            activityType: "test_start",
            details: { testId: validatedData.testId, attemptId: attempt.id },
          });
        } catch (activityError) {
          console.error("Activity tracking error (non-blocking):", activityError);
        }
      }

      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/test-attempts/:id", optionalAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      const currentUser = req.user as any;
      // If attempt has an owner, require same user or admin.
      if (attempt.userId) {
        if (!currentUser || (currentUser.id !== attempt.userId && currentUser.role !== "admin")) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      res.json(attempt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/test-attempts/:id", optionalAuth, async (req, res) => {
    try {
      const existing = await storage.getTestAttempt(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      const currentUser = req.user as any;
      if (existing.userId) {
        if (!currentUser || (currentUser.id !== existing.userId && currentUser.role !== "admin")) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const { userId: _ignoredUserId, ...safeBody } = req.body ?? {};
      const attempt = await storage.updateTestAttempt(req.params.id, safeBody);
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/test-attempts", optionalAuth, async (req, res) => {
    try {
      const currentUser = req.user as any;
      if (currentUser && currentUser.id !== req.params.id) {
        return res.status(403).json({ message: "Not authorized to access this data" });
      }

      const attempts = await storage.getUserTestAttempts(req.params.id);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/answers", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAnswerSchema.parse(req.body);
      const attempt = await storage.getTestAttempt(validatedData.attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      const user = req.user as any;
      if (attempt.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const answer = await storage.createAnswer(validatedData);
      res.status(201).json(answer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/test-attempts/:id/answers", optionalAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      const currentUser = req.user as any;
      if (attempt.userId) {
        if (!currentUser || (currentUser.id !== attempt.userId && currentUser.role !== "admin")) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const answers = await storage.getAnswersByAttemptId(req.params.id);
      res.json(answers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/score-test", optionalAuth, async (req, res) => {
    try {
      const { attemptId } = req.body;
      const attempt = await storage.getTestAttempt(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      const currentUser = req.user as any;
      if (attempt.userId) {
        if (!currentUser || (currentUser.id !== attempt.userId && currentUser.role !== "admin")) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const answers = await storage.getAnswersByAttemptId(attemptId);
      const test = await storage.getTest(attempt.testId);
      const questions = await storage.getQuestionsByTestId(attempt.testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      let totalPoints = 0;
      let earnedPoints = 0;
      const sectionScores: Record<string, number> = {};

      for (const question of questions) {
        totalPoints += question.points || 1;
        const answer = answers.find((item) => item.questionId === question.id);
        if (answer && answer.isCorrect) {
          earnedPoints += question.points || 1;
        }
      }

      let finalScore = 0;
      if (test.examType === "toefl") {
        finalScore = Math.round((earnedPoints / totalPoints) * 30);
        sectionScores[test.section] = finalScore;
      } else if (test.examType === "gre") {
        finalScore =
          test.section === "analytical"
            ? Math.round((earnedPoints / totalPoints) * 6)
            : Math.round(130 + (earnedPoints / totalPoints) * 40);
        sectionScores[test.section] = finalScore;
      }

      const updatedAttempt = await storage.updateTestAttempt(attemptId, {
        totalScore: finalScore,
        sectionScores,
        completedAt: new Date(),
        status: "completed",
      });

      res.json({
        totalScore: finalScore,
        sectionScores,
        earnedPoints,
        totalPoints,
        percentage: Math.round((earnedPoints / totalPoints) * 100),
        attempt: updatedAttempt,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
