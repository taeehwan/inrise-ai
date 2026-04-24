import type { Express } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { resolveAttemptTestData as resolveAttemptTestDataFromStorage } from "../lib/testResolver";
import { storage } from "../storage";

async function resolveAttemptTestData(testId: string) {
  return resolveAttemptTestDataFromStorage(
    {
      getTest: storage.getTest.bind(storage),
      getTestSet: storage.getTestSet.bind(storage),
      getAIGeneratedTest: storage.getAIGeneratedTest.bind(storage),
    },
    testId,
  );
}

export function registerUserUtilityRoutes(app: Express) {
  app.get("/api/performance-analytics/:userId", optionalAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { examType } = req.query;
      const attempts = await storage.getUserTestAttempts(userId);

      const attemptsWithTests = await Promise.all(
        attempts.map(async (attempt) => ({
          ...attempt,
          test: await resolveAttemptTestData(attempt.testId),
        })),
      );

      const filteredAttemptsWithTests = attemptsWithTests.filter((attempt) => attempt.test);
      const filteredAttempts = examType
        ? filteredAttemptsWithTests.filter((attempt) => attempt.test?.examType === examType)
        : filteredAttemptsWithTests;

      if (filteredAttempts.length === 0) {
        return res.json({
          examType: examType || "all",
          totalAttempts: 0,
          averageScore: 0,
          improvement: 0,
          sectionAverages: {},
          recentTests: [],
        });
      }

      const scores = filteredAttempts.map((attempt) => attempt.totalScore || 0);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const sortedAttempts = filteredAttempts.sort(
        (a, b) => new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime(),
      );

      let improvement = 0;
      if (sortedAttempts.length >= 2) {
        improvement = (sortedAttempts[sortedAttempts.length - 1].totalScore || 0) - (sortedAttempts[0].totalScore || 0);
      }

      const sectionPerformance: Record<string, number[]> = {};
      filteredAttempts.forEach((attempt) => {
        if (!attempt.test?.section) return;
        sectionPerformance[attempt.test.section] = sectionPerformance[attempt.test.section] || [];
        sectionPerformance[attempt.test.section].push(attempt.totalScore || 0);
      });

      const sectionAverages: Record<string, number> = {};
      Object.keys(sectionPerformance).forEach((section) => {
        const sectionScores = sectionPerformance[section];
        sectionAverages[section] = sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length;
      });

      res.json({
        examType: examType || "all",
        totalAttempts: filteredAttempts.length,
        averageScore: Math.round(averageScore),
        improvement,
        sectionAverages,
        recentTests: sortedAttempts.slice(-5).map((attempt) => ({
          id: attempt.id,
          testTitle: attempt.test?.title,
          score: attempt.totalScore,
          section: attempt.test?.section,
          completedAt: attempt.completedAt,
        })),
      });
    } catch (error: any) {
      console.error("Performance analytics error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/study-plan-recommendations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { examType } = req.query;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const attempts = await storage.getUserTestAttempts(userId);
      const attemptsWithTests = await Promise.all(
        attempts.map(async (attempt) => ({
          ...attempt,
          test: await resolveAttemptTestData(attempt.testId),
        })),
      );

      const filteredAttemptsWithTests = attemptsWithTests.filter(
        (attempt) => attempt.test && attempt.test.examType === examType,
      );
      const sectionPerformance: Record<string, number[]> = {};
      filteredAttemptsWithTests.forEach((attempt) => {
        if (!attempt.test?.section) return;
        sectionPerformance[attempt.test.section] = sectionPerformance[attempt.test.section] || [];
        sectionPerformance[attempt.test.section].push(attempt.totalScore || 0);
      });

      const sectionAverages: Record<string, number> = {};
      Object.keys(sectionPerformance).forEach((section) => {
        const sectionScores = sectionPerformance[section];
        sectionAverages[section] = sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length;
      });

      const weakSections = Object.entries(sectionAverages)
        .filter(([, average]) => (examType === "toefl" ? average < 18 : average < 150))
        .map(([section]) => section);

      const allTests = await storage.getTests();
      const recommendedTests: any[] = [];
      for (const section of weakSections) {
        recommendedTests.push(
          ...allTests
            .filter((test) => test.examType === examType && test.section === section && test.isActive)
            .slice(0, 3),
        );
      }

      if (weakSections.length === 0) {
        recommendedTests.push(
          ...allTests
            .filter((test) => test.examType === examType && test.difficulty === "hard" && test.isActive)
            .slice(0, 5),
        );
      }

      res.json({
        examType,
        weakSections,
        sectionAverages,
        recommendedTests: recommendedTests.map((test) => ({
          id: test.id,
          title: test.title,
          section: test.section,
          difficulty: test.difficulty,
          duration: test.duration,
          reason: weakSections.includes(test.section || "") ? `${test.section} 섹션 성과 향상 필요` : "고급 연습을 위한 추천",
        })),
      });
    } catch (error: any) {
      console.error("Study plan recommendations error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/test-attempts", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "인증이 필요합니다." });
      }

      const attempts = await storage.getUserTestAttempts(userId);
      const attemptsWithDetails = await Promise.all(
        attempts.map(async (attempt) => {
          const testData = await resolveAttemptTestData(attempt.testId);
          const answers = await storage.getAnswersByAttemptId(attempt.id);
          return {
            ...attempt,
            examType: testData?.examType || "unknown",
            section: testData?.section || "general",
            testTitle: testData?.title || attempt.testId,
            correctAnswers: answers.filter((answer) => answer.isCorrect).length,
            totalQuestions: answers.length,
          };
        }),
      );

      res.json(attemptsWithDetails);
    } catch (error: any) {
      console.error("User test attempts error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/attempts/:attemptId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { attemptId } = req.params;
      if (!userId) {
        return res.status(401).json({ message: "인증이 필요합니다." });
      }

      const attempt = await storage.getTestAttempt(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "테스트 시도를 찾을 수 없습니다." });
      }
      if (attempt.userId !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "접근 권한이 없습니다." });
      }

      const testData = await resolveAttemptTestData(attempt.testId);
      const userAnswers = await storage.getAnswersByAttemptId(attemptId);
      const questions = await storage.getQuestionsByTestId(attempt.testId);
      const isCompleted = attempt.status === "completed";

      const questionsWithAnswers = questions
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((question) => {
          const answer = userAnswers.find((item) => item.questionId === question.id);
          return {
            id: question.id,
            questionText: question.questionText,
            questionType: question.questionType,
            options: question.options,
            correctAnswer: isCompleted ? question.correctAnswer : null,
            explanation: null,
            passage: question.passage,
            orderIndex: question.orderIndex,
            points: question.points,
            userAnswer: answer?.userAnswer ?? null,
            isCorrect: isCompleted ? (answer?.isCorrect ?? null) : null,
            pointsEarned: isCompleted ? (answer?.pointsEarned ?? 0) : 0,
            timeSpent: answer?.timeSpent ?? null,
          };
        });

      res.json({
        id: attempt.id,
        testId: attempt.testId,
        userId: attempt.userId,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        totalScore: attempt.totalScore,
        sectionScores: attempt.sectionScores as Record<string, any> | null,
        timeSpent: attempt.timeSpent,
        status: attempt.status,
        testTitle: testData?.title || attempt.testId,
        examType: testData?.examType || "unknown",
        section: testData?.section || "general",
        questions: questionsWithAnswers,
      });
    } catch (error: any) {
      console.error("Get attempt detail error:", error);
      res.status(500).json({ message: "테스트 결과 조회 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/user/credits", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      let credits = await storage.getUserCredits(userId);
      if (!credits) {
        credits = await storage.initializeUserCredits(userId);
      }

      res.json({
        balance: credits.balance,
        lifetimeEarned: credits.lifetimeEarned,
        lifetimeUsed: credits.lifetimeUsed,
        lastUpdated: credits.lastUpdated,
      });
    } catch (error: any) {
      console.error("Get user credits error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/saved-explanations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const { type, section, limit: limitParam } = req.query;
      const allowedTypes = ["explanation", "feedback"];
      const allowedSections = ["reading", "listening", "speaking", "writing", "gre-writing"];
      if (type && !allowedTypes.includes(type as string)) {
        return res.status(400).json({ message: `Invalid type. Allowed: ${allowedTypes.join(", ")}` });
      }
      if (section && !allowedSections.includes(section as string)) {
        return res.status(400).json({ message: `Invalid section. Allowed: ${allowedSections.join(", ")}` });
      }

      const parsedLimit = parseInt(limitParam as string, 10);
      const limit = Math.min(Math.max(1, Number.isNaN(parsedLimit) ? 100 : parsedLimit), 100);
      const explanations = await storage.getUserSavedExplanations(userId, {
        type: type as string | undefined,
        section: section as string | undefined,
        limit,
      });
      res.json(explanations);
    } catch (error: any) {
      console.error("Get saved explanations error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/credits/transactions", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const transactions = await storage.getCreditTransactions(userId, limit);
      res.json(transactions);
    } catch (error: any) {
      console.error("Get credit transactions error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/credits/add", requireAuth, async (req: any, res) => {
    try {
      const { amount, type, description, userId: targetUserId } = req.body;
      if (!req.user?.id) {
        return res.status(401).json({ message: "User authentication required" });
      }
      if ((type === "bonus" || type === "admin_adjustment") && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = req.user?.role === "admin" && targetUserId ? targetUserId : req.user?.id;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount required" });
      }

      const credits = await storage.addCredits(userId, amount, type || "purchase", description || "Credit purchase", "purchase");
      res.json({
        success: true,
        balance: credits.balance,
        message: `${amount} credits added successfully`,
      });
    } catch (error: any) {
      console.error("Add credits error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/credits/check", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const requiredAmount = parseInt(req.query.amount as string, 10) || 0;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const hasEnough = await storage.hasEnoughCredits(userId, requiredAmount);
      const credits = await storage.getUserCredits(userId);
      res.json({
        hasEnough,
        balance: credits?.balance || 0,
        required: requiredAmount,
      });
    } catch (error: any) {
      console.error("Check credits error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
