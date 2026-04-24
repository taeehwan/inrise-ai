import type { Express } from "express";
import { insertTestSetAttemptSchema, insertTestSetComponentSchema, insertTestSetSchema } from "@shared/schema";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { storage } from "../storage";

function calculatePercentile(score: number, examType: string): number {
  if (examType === "toefl") {
    if (score >= 110) return 95;
    if (score >= 100) return 80;
    if (score >= 90) return 60;
    if (score >= 80) return 40;
    return 20;
  }

  if (score >= 320) return 90;
  if (score >= 310) return 70;
  if (score >= 300) return 50;
  if (score >= 290) return 30;
  return 10;
}

export function registerTestSetAttemptRoutes(app: Express) {
  app.get("/api/test-set-attempts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const attempts = await storage.getTestSetAttempts(user.id);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/test-set-attempts/my", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const attempts = await storage.getTestSetAttempts(user.id);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/test-set-attempts/active/:testSetId", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const attempts = await storage.getTestSetAttempts(user.id);
      const activeAttempt = attempts.find((attempt: any) => attempt.testSetId === req.params.testSetId && attempt.status === "in_progress");
      res.json(activeAttempt || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/test-set-attempts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertTestSetAttemptSchema.parse({
        ...req.body,
        userId: user.id,
      });
      const attempt = await storage.createTestSetAttempt(validatedData);
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/test-set-attempts/:id", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestSetAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "테스트 세트 시도를 찾을 수 없습니다" });
      }

      const user = req.user as any;
      if (attempt.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "접근 권한이 없습니다" });
      }

      res.json(attempt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/test-set-attempts/:id", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestSetAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "테스트 세트 시도를 찾을 수 없습니다" });
      }

      const user = req.user as any;
      if (attempt.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "접근 권한이 없습니다" });
      }

      const updatedAttempt = await storage.updateTestSetAttempt(req.params.id, req.body);
      res.json(updatedAttempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/test-sets", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { testSet, components } = req.body;
      if (!testSet || !components || !Array.isArray(components)) {
        return res.status(400).json({ message: "테스트 세트와 구성 요소 정보가 필요합니다." });
      }

      const validatedTestSet = insertTestSetSchema.parse(testSet);
      const createdTestSet = await storage.createTestSet(validatedTestSet);

      const createdComponents = [];
      for (const component of components) {
        const validatedComponent = insertTestSetComponentSchema.parse({
          ...component,
          testSetId: createdTestSet.id,
        });
        createdComponents.push(await storage.createTestSetComponent(validatedComponent));
      }

      res.status(201).json({
        testSet: createdTestSet,
        components: createdComponents,
      });
    } catch (error: any) {
      console.error("Error creating test set:", error);
      res.status(500).json({ message: "풀테스트 생성에 실패했습니다." });
    }
  });

  app.post("/api/full-test-attempts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertTestSetAttemptSchema.parse({
        ...req.body,
        userId: user.id,
      });
      const attempt = await storage.createTestSetAttempt(validatedData);
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/full-test-attempts/:id", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestSetAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "풀테스트 시도를 찾을 수 없습니다" });
      }

      const user = req.user as any;
      if (attempt.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "접근 권한이 없습니다" });
      }

      res.json(attempt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/full-test-attempts/:id", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestSetAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "풀테스트 시도를 찾을 수 없습니다" });
      }

      const user = req.user as any;
      if (attempt.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "접근 권한이 없습니다" });
      }

      const updatedAttempt = await storage.updateTestSetAttempt(req.params.id, req.body);
      res.json(updatedAttempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/score-integration", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { testSetAttemptId, sectionScores, totalScore, recommendations } = req.body;

      const scoreData = {
        userId: user.id,
        testSetAttemptId,
        sectionScores,
        totalScore,
        percentile: calculatePercentile(totalScore, req.body.examType),
        recommendations: recommendations || [],
        analysisDate: new Date(),
      };

      const performanceUpdate = {
        userId: user.id,
        examType: req.body.examType,
        totalScore,
        sectionScores,
        percentageScore: (totalScore / 120) * 100,
        strengths: req.body.strengths || [],
        weaknesses: req.body.weaknesses || [],
        studyRecommendations: recommendations,
      };

      await storage.updateUserPerformance(user.id, performanceUpdate);
      res.json({
        message: "성적 연동 완료",
        scoreData,
        nextRecommendations: recommendations,
      });
    } catch (error: any) {
      console.error("Score integration error:", error);
      res.status(500).json({ message: "성적 연동에 실패했습니다" });
    }
  });

  app.post("/api/full-test-attempts", requireAuth, async (req, res) => {
    try {
      const { testSetId } = req.body;
      const userId = (req.session as any).userId;

      const existingAttempt = await storage.getInProgressTestSetAttempt(userId, testSetId);
      if (existingAttempt) {
        return res.json(existingAttempt);
      }

      const attempt = await storage.createTestSetAttempt({
        userId,
        testSetId,
        status: "in_progress",
        currentTestIndex: 0,
      });

      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/full-test-attempts/:id", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestSetAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }

      if (attempt.userId !== (req.session as any).userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(attempt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/full-test-attempts/:id", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestSetAttempt(req.params.id);
      if (!attempt || attempt.userId !== (req.session as any).userId) {
        return res.status(404).json({ message: "Test attempt not found" });
      }

      const updatedAttempt = await storage.updateTestSetAttempt(req.params.id, req.body);
      res.json(updatedAttempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
}
