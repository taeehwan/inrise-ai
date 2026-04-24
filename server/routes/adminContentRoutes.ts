import type { Express } from "express";
import {
  insertNewToeflListeningTestSchema,
  insertNewToeflReadingTestSchema,
  insertNewToeflSpeakingTestSchema,
  insertNewToeflWritingTestSchema,
  insertQuestionSchema,
  insertTestSchema,
} from "@shared/schema";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { storage } from "../storage";

export function registerAdminContentRoutes(app: Express) {
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const speakingTests = await storage.getAllSpeakingTopics();
      const users = await storage.getAllUsers();

      const stats = {
        reading: { total: 0, active: 0, inactive: 0 },
        listening: { total: 0, active: 0, inactive: 0 },
        speaking: {
          total: speakingTests.length,
          active: speakingTests.filter((test) => test.isActive).length,
          inactive: speakingTests.filter((test) => !test.isActive).length,
        },
        writing: { total: 0, active: 0, inactive: 0 },
        users: users.length,
        totalAttempts: 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/reading-tests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tests = await storage.getTests();
      const readingTests = tests.filter((test) => test.examType === "toefl" && test.section === "reading");
      res.json(readingTests);
    } catch (error) {
      console.error("Error fetching reading tests:", error);
      res.status(500).json({ message: "Failed to fetch reading tests" });
    }
  });

  app.delete("/api/admin/reading-tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTest(req.params.id);
      res.json({ message: "Reading test deleted successfully" });
    } catch (error) {
      console.error("Error deleting reading test:", error);
      res.status(500).json({ message: "Failed to delete reading test" });
    }
  });

  app.get("/api/admin/ai-tests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allTests = await storage.getAllTests();
      const aiTests = allTests.filter((test) => test.id.includes("ai-"));

      const testsWithDetails = await Promise.all(
        aiTests.map(async (test) => {
          const questions = await storage.getQuestionsByTestId(test.id);
          const hasTemplateData = questions.some(
            (question) =>
              question.options?.includes("첫 번째 선택지") ||
              question.options?.includes("두 번째 선택지") ||
              question.options?.includes("세 번째 선택지") ||
              question.questionText?.includes("이 지문의 주요 내용은 무엇입니까?"),
          );

          return {
            ...test,
            questionCount: questions.length,
            hasTemplateData,
            createdAt: test.createdAt,
            status: hasTemplateData ? "needs_regeneration" : "valid",
          };
        }),
      );

      res.json(testsWithDetails);
    } catch (error) {
      console.error("Error fetching AI tests:", error);
      res.status(500).json({ message: "Failed to fetch AI tests" });
    }
  });

  app.delete("/api/admin/ai-tests/:testId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { testId } = req.params;
      console.log(`🗑️ AI Test deletion requested: ${testId} by admin`);

      try {
        await storage.deleteQuestionsByTestId(testId);
        console.log(`✅ Deleted questions for test: ${testId}`);
      } catch {
        console.log(`ℹ️ No questions to delete for test: ${testId}`);
      }

      try {
        await storage.deleteTest(testId);
        console.log(`✅ Deleted test from tests table: ${testId}`);
      } catch {
        console.log(`ℹ️ Test not found in tests table: ${testId}`);
      }

      try {
        await storage.deleteAIGeneratedTest(testId);
        console.log(`✅ Deleted from ai_generated_tests table: ${testId}`);
      } catch {
        console.log(`ℹ️ Test not found in ai_generated_tests table: ${testId}`);
      }

      console.log(`❌ AI test completely deleted: ${testId}`);
      res.json({ message: "테스트가 성공적으로 삭제되었습니다." });
    } catch (error) {
      console.error("Error deleting AI test:", error);
      res.status(500).json({ message: "AI 테스트 삭제 실패" });
    }
  });

  app.patch("/api/admin/ai-tests/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const admin = req.user;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean value" });
      }

      const previousTest = await storage.getAIGeneratedTest(id);
      await storage.updateAITestStatus(id, isActive);

      if (admin && previousTest) {
        await storage.createTestAuditLog({
          testId: id,
          testTitle: previousTest.title,
          testType: "ai_generated",
          examType: previousTest.examType as any,
          section: previousTest.section,
          action: isActive ? "approve" : "reject",
          adminId: admin.id,
          adminEmail: admin.email,
          previousState: { isActive: previousTest.isActive },
          newState: { isActive },
          metadata: { timestamp: new Date().toISOString() },
        });
      }

      console.log(`✅ Admin ${isActive ? "approved" : "rejected"} AI test: ${id}`);
      res.json({
        message: `AI test ${isActive ? "approved" : "rejected"} successfully`,
        testId: id,
        isActive,
      });
    } catch (error) {
      console.error("Error updating AI test status:", error);
      res.status(500).json({ message: "Failed to update AI test status" });
    }
  });

  app.patch("/api/admin/speaking-topics/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean value" });
      }

      await storage.updateSpeakingTopic(id, { isActive });

      console.log(`✅ Admin ${isActive ? "approved" : "rejected"} speaking topic: ${id}`);
      res.json({
        message: `Speaking topic ${isActive ? "approved" : "rejected"} successfully`,
        topicId: id,
        isActive,
      });
    } catch (error) {
      console.error("Error updating speaking topic status:", error);
      res.status(500).json({ message: "Failed to update speaking topic status" });
    }
  });

  app.get("/api/admin/all-ai-tests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allTests = await storage.getAllAIGeneratedTestsAdmin();
      res.json(allTests);
    } catch (error) {
      console.error("Error fetching all AI tests:", error);
      res.status(500).json({ message: "Failed to fetch all AI tests" });
    }
  });

  app.get("/api/admin/all-speaking-topics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allTopics = await storage.getAllSpeakingTopics();
      res.json(allTopics);
    } catch (error) {
      console.error("Error fetching all speaking topics:", error);
      res.status(500).json({ message: "Failed to fetch all speaking topics" });
    }
  });

  app.get("/api/admin/new-toefl-reading", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tests = await storage.getNewToeflReadingTests();
      res.json(tests);
    } catch (error) {
      console.error("Error fetching new TOEFL reading tests:", error);
      res.status(500).json({ message: "Failed to fetch new TOEFL reading tests" });
    }
  });

  app.get("/api/admin/new-toefl-reading/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const test = await storage.getNewToeflReadingTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      console.error("Error fetching new TOEFL reading test:", error);
      res.status(500).json({ message: "Failed to fetch new TOEFL reading test" });
    }
  });

  app.post("/api/admin/new-toefl-reading", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertNewToeflReadingTestSchema.parse(req.body);
      const newTest = await storage.createNewToeflReadingTest({
        ...validatedData,
        difficulty: validatedData.difficulty || "medium",
        isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
      });

      console.log(`✅ Admin created new TOEFL reading test: ${newTest.id}`);
      res.status(201).json(newTest);
    } catch (error: any) {
      console.error("Error creating new TOEFL reading test:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create new TOEFL reading test" });
    }
  });

  app.patch("/api/admin/new-toefl-reading/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedUpdates = insertNewToeflReadingTestSchema.partial().parse(req.body);
      const existingTest = await storage.getNewToeflReadingTest(id);
      if (!existingTest) {
        return res.status(404).json({ message: "Test not found" });
      }

      const updatedTest = await storage.updateNewToeflReadingTest(id, validatedUpdates);
      console.log(`✅ Admin updated new TOEFL reading test: ${id}`);
      res.json(updatedTest);
    } catch (error: any) {
      console.error("Error updating new TOEFL reading test:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update new TOEFL reading test" });
    }
  });

  app.delete("/api/admin/new-toefl-reading/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const existingTest = await storage.getNewToeflReadingTest(id);
      if (!existingTest) {
        return res.status(404).json({ message: "Test not found" });
      }

      await storage.deleteNewToeflReadingTest(id);
      console.log(`✅ Admin deleted new TOEFL reading test: ${id}`);
      res.json({ message: "Test deleted successfully" });
    } catch (error) {
      console.error("Error deleting new TOEFL reading test:", error);
      res.status(500).json({ message: "Failed to delete new TOEFL reading test" });
    }
  });

  app.get("/api/admin/new-toefl-listening", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tests = await storage.getNewToeflListeningTests();
      res.json(tests);
    } catch (error) {
      console.error("Error fetching new TOEFL listening tests:", error);
      res.status(500).json({ message: "Failed to fetch new TOEFL listening tests" });
    }
  });

  app.get("/api/admin/new-toefl-listening/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const test = await storage.getNewToeflListeningTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      console.error("Error fetching new TOEFL listening test:", error);
      res.status(500).json({ message: "Failed to fetch new TOEFL listening test" });
    }
  });

  app.post("/api/admin/new-toefl-listening", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertNewToeflListeningTestSchema.parse(req.body);
      const newTest = await storage.createNewToeflListeningTest({
        ...validatedData,
        difficulty: validatedData.difficulty || "medium",
        isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
      });

      console.log(`✅ Admin created new TOEFL listening test: ${newTest.id}`);
      res.status(201).json(newTest);
    } catch (error: any) {
      console.error("Error creating new TOEFL listening test:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create new TOEFL listening test" });
    }
  });

  app.patch("/api/admin/new-toefl-listening/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedUpdates = insertNewToeflListeningTestSchema.partial().parse(req.body);
      const existingTest = await storage.getNewToeflListeningTest(id);
      if (!existingTest) {
        return res.status(404).json({ message: "Test not found" });
      }

      const updatedTest = await storage.updateNewToeflListeningTest(id, validatedUpdates);
      console.log(`✅ Admin updated new TOEFL listening test: ${id}`);
      res.json(updatedTest);
    } catch (error: any) {
      console.error("Error updating new TOEFL listening test:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update new TOEFL listening test" });
    }
  });

  app.delete("/api/admin/new-toefl-listening/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const existingTest = await storage.getNewToeflListeningTest(id);
      if (!existingTest) {
        return res.status(404).json({ message: "Test not found" });
      }

      await storage.deleteNewToeflListeningTest(id);
      console.log(`✅ Admin deleted new TOEFL listening test: ${id}`);
      res.json({ message: "Test deleted successfully" });
    } catch (error) {
      console.error("Error deleting new TOEFL listening test:", error);
      res.status(500).json({ message: "Failed to delete new TOEFL listening test" });
    }
  });

  app.get("/api/admin/new-toefl-writing", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tests = await storage.getNewToeflWritingTests();
      res.json(tests);
    } catch (error) {
      console.error("Error fetching new TOEFL writing tests:", error);
      res.status(500).json({ message: "Failed to fetch new TOEFL writing tests" });
    }
  });

  app.get("/api/admin/new-toefl-writing/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const test = await storage.getNewToeflWritingTest(id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      console.error("Error fetching new TOEFL writing test:", error);
      res.status(500).json({ message: "Failed to fetch new TOEFL writing test" });
    }
  });

  app.post("/api/admin/new-toefl-writing", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertNewToeflWritingTestSchema.parse(req.body);
      const newTest = await storage.createNewToeflWritingTest(validatedData);
      console.log(`✅ Admin created new TOEFL writing test: ${newTest.id}`);
      res.status(201).json(newTest);
    } catch (error: any) {
      console.error("Error creating new TOEFL writing test:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create new TOEFL writing test" });
    }
  });

  app.patch("/api/admin/new-toefl-writing/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedUpdates = insertNewToeflWritingTestSchema.partial().parse(req.body);
      const existingTest = await storage.getNewToeflWritingTest(id);
      if (!existingTest) {
        return res.status(404).json({ message: "Test not found" });
      }

      const updatedTest = await storage.updateNewToeflWritingTest(id, validatedUpdates);
      console.log(`✅ Admin updated new TOEFL writing test: ${id}`);
      res.json(updatedTest);
    } catch (error: any) {
      console.error("Error updating new TOEFL writing test:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update new TOEFL writing test" });
    }
  });

  app.delete("/api/admin/new-toefl-writing/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const existingTest = await storage.getNewToeflWritingTest(id);
      if (!existingTest) {
        return res.status(404).json({ message: "Test not found" });
      }

      await storage.deleteNewToeflWritingTest(id);
      console.log(`✅ Admin deleted new TOEFL writing test: ${id}`);
      res.json({ message: "Test deleted successfully" });
    } catch (error) {
      console.error("Error deleting new TOEFL writing test:", error);
      res.status(500).json({ message: "Failed to delete new TOEFL writing test" });
    }
  });

  app.get("/api/admin/new-toefl-speaking", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tests = await storage.getNewToeflSpeakingTests();
      res.json(tests);
    } catch (error) {
      console.error("Error fetching new TOEFL speaking tests:", error);
      res.status(500).json({ message: "Failed to fetch new TOEFL speaking tests" });
    }
  });

  app.get("/api/admin/new-toefl-speaking/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const test = await storage.getNewToeflSpeakingTest(id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      console.error("Error fetching new TOEFL speaking test:", error);
      res.status(500).json({ message: "Failed to fetch new TOEFL speaking test" });
    }
  });

  app.post("/api/admin/new-toefl-speaking", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertNewToeflSpeakingTestSchema.parse(req.body);
      const newTest = await storage.createNewToeflSpeakingTest(validatedData);
      console.log(`✅ Admin created new TOEFL speaking test: ${newTest.id}`);
      res.status(201).json(newTest);
    } catch (error: any) {
      console.error("Error creating new TOEFL speaking test:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create new TOEFL speaking test" });
    }
  });

  app.patch("/api/admin/new-toefl-speaking/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedUpdates = insertNewToeflSpeakingTestSchema.partial().parse(req.body);
      const existingTest = await storage.getNewToeflSpeakingTest(id);
      if (!existingTest) {
        return res.status(404).json({ message: "Test not found" });
      }

      const updatedTest = await storage.updateNewToeflSpeakingTest(id, validatedUpdates);
      console.log(`✅ Admin updated new TOEFL speaking test: ${id}`);
      res.json(updatedTest);
    } catch (error: any) {
      console.error("Error updating new TOEFL speaking test:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update new TOEFL speaking test" });
    }
  });

  app.delete("/api/admin/new-toefl-speaking/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const existingTest = await storage.getNewToeflSpeakingTest(id);
      if (!existingTest) {
        return res.status(404).json({ message: "Test not found" });
      }

      await storage.deleteNewToeflSpeakingTest(id);
      console.log(`✅ Admin deleted new TOEFL speaking test: ${id}`);
      res.json({ message: "Test deleted successfully" });
    } catch (error) {
      console.error("Error deleting new TOEFL speaking test:", error);
      res.status(500).json({ message: "Failed to delete new TOEFL speaking test" });
    }
  });

  app.get("/api/admin/tests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tests = await storage.getTests();
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/questions/:testId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const questions = await storage.getQuestionsByTestId(req.params.testId);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/tests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { questions, ...testData } = req.body;
      const admin = req.user;
      const questionCount = questions && Array.isArray(questions) ? questions.length : 0;
      const validatedTestData = insertTestSchema.parse({
        ...testData,
        questionCount,
      });
      const test = await storage.createTest(validatedTestData);

      if (questions && Array.isArray(questions)) {
        for (let index = 0; index < questions.length; index++) {
          const questionData = {
            ...questions[index],
            testId: test.id,
            orderIndex: questions[index].orderIndex || index + 1,
          };

          try {
            const validatedQuestionData = insertQuestionSchema.parse(questionData);
            await storage.createQuestion(validatedQuestionData);
          } catch (questionError) {
            console.error(`Failed to create question ${index + 1}:`, questionError);
          }
        }
      }

      if (admin) {
        await storage.createTestAuditLog({
          testId: test.id,
          testTitle: test.title,
          testType: "manual",
          examType: test.examType as any,
          section: test.section,
          action: "create",
          adminId: admin.id,
          adminEmail: admin.email,
          previousState: null,
          newState: test,
          metadata: { questionCount },
        });
      }

      res.status(201).json(test);
    } catch (error: any) {
      console.error("Test creation error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = req.user;
      const testId = req.params.id;

      let test: any = null;
      let previousTest: any = null;
      let testType: "ai_generated" | "manual" | "test_set" = "manual";
      let examType: string | undefined;
      let section: string | undefined;

      if (testId.startsWith("nr-")) {
        previousTest = await storage.getNewToeflReadingTest(testId);
        test = await storage.updateNewToeflReadingTest(testId, req.body);
        examType = "new-toefl";
        section = "reading";
      } else if (testId.startsWith("nl-")) {
        previousTest = await storage.getNewToeflListeningTest(testId);
        test = await storage.updateNewToeflListeningTest(testId, req.body);
        examType = "new-toefl";
        section = "listening";
      } else if (testId.startsWith("ns-")) {
        previousTest = await storage.getNewToeflSpeakingTest(testId);
        test = await storage.updateNewToeflSpeakingTest(testId, req.body);
        examType = "new-toefl";
        section = "speaking";
      } else if (testId.startsWith("nw-")) {
        previousTest = await storage.getNewToeflWritingTest(testId);
        test = await storage.updateNewToeflWritingTest(testId, req.body);
        examType = "new-toefl";
        section = "writing";
      } else if (testId.startsWith("ai-")) {
        previousTest = await storage.getAIGeneratedTest(testId);
        test = await storage.updateAIGeneratedTest(testId, req.body);
        testType = "ai_generated";
        examType = previousTest?.examType;
        section = previousTest?.section;
      } else if (testId.startsWith("testset-")) {
        previousTest = await storage.getTestSet(testId.replace("testset-", ""));
        test = await storage.updateTestSet(testId.replace("testset-", ""), req.body);
        testType = "test_set";
        examType = previousTest?.examType;
      } else {
        previousTest = await storage.getTest(testId);
        test = await storage.updateTest(testId, req.body);
        examType = test.examType;
        section = test.section;
      }

      if (admin && previousTest) {
        await storage.createTestAuditLog({
          testId,
          testTitle: test?.title || previousTest?.title || "Unknown",
          testType,
          examType: examType as any,
          section,
          action: "update",
          adminId: admin.id,
          adminEmail: admin.email,
          previousState: previousTest,
          newState: test,
          metadata: { changes: Object.keys(req.body) },
        });
      }

      res.json(test);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/tests/bulk-delete", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { testIds } = req.body;
      const admin = req.user;
      if (!Array.isArray(testIds) || testIds.length === 0) {
        return res.status(400).json({ message: "삭제할 테스트 ID 목록이 필요합니다." });
      }
      console.log(`Admin bulk soft-deleting ${testIds.length} tests`);
      let deletedCount = 0;

      for (const testId of testIds) {
        try {
          let testTitle = "Unknown Test";
          let testType: "ai_generated" | "manual" | "test_set" = "manual";
          let examType: string | undefined;
          let section: string | undefined;
          let previousState: any = null;
          let found = false;

          if (testId.startsWith("nr-")) {
            const test = await storage.getNewToeflReadingTest(testId);
            if (test) {
              testTitle = test.title;
              examType = "new-toefl";
              section = "reading";
              previousState = { ...test, isActive: true };
              await storage.updateNewToeflReadingTest(testId, { isActive: false });
              found = true;
            }
          } else if (testId.startsWith("nl-")) {
            const test = await storage.getNewToeflListeningTest(testId);
            if (test) {
              testTitle = test.title;
              examType = "new-toefl";
              section = "listening";
              previousState = { ...test, isActive: true };
              await storage.updateNewToeflListeningTest(testId, { isActive: false });
              found = true;
            }
          } else if (testId.startsWith("ns-")) {
            const test = await storage.getNewToeflSpeakingTest(testId);
            if (test) {
              testTitle = test.title;
              examType = "new-toefl";
              section = "speaking";
              previousState = { ...test, isActive: true };
              await storage.updateNewToeflSpeakingTest(testId, { isActive: false });
              found = true;
            }
          } else if (testId.startsWith("nw-")) {
            const test = await storage.getNewToeflWritingTest(testId);
            if (test) {
              testTitle = test.title;
              examType = "new-toefl";
              section = "writing";
              previousState = { ...test, isActive: true };
              await storage.updateNewToeflWritingTest(testId, { isActive: false });
              found = true;
            }
          }

          if (!found) {
            const aiTest = await storage.getAIGeneratedTest(testId);
            if (aiTest) {
              testTitle = aiTest.title;
              testType = "ai_generated";
              examType = aiTest.examType;
              section = aiTest.section;
              previousState = { ...aiTest, isActive: true };
              await storage.updateAIGeneratedTest(testId, { isActive: false });
              found = true;
            }
          }
          if (!found) {
            const test = await storage.getTest(testId);
            if (test) {
              testTitle = test.title;
              testType = "manual";
              examType = test.examType;
              section = test.section;
              previousState = { ...test, isActive: true };
              await storage.updateTest(testId, { isActive: false });
              found = true;
            }
          }
          if (!found) {
            const testSet = await storage.getTestSet(testId.replace("testset-", ""));
            if (testSet) {
              testTitle = testSet.title;
              testType = "test_set";
              examType = testSet.examType;
              previousState = { ...testSet, isActive: true };
              await storage.updateTestSet(testId.replace("testset-", ""), { isActive: false });
              found = true;
            }
          }

          if (found) {
            deletedCount++;
            if (admin) {
              await storage.createTestAuditLog({
                testId,
                testTitle,
                testType,
                examType: examType as any,
                section,
                action: "delete",
                adminId: admin.id,
                adminEmail: admin.email,
                previousState,
                newState: { isActive: false },
                reason: req.body?.reason || "bulk delete",
                metadata: { timestamp: new Date().toISOString(), bulkDelete: true },
              });
            }
          }
        } catch (error) {
          console.error(`Error deleting test ${testId} in bulk:`, error);
        }
      }

      res.json({ message: `${deletedCount}개 테스트가 삭제되었습니다.`, deletedCount });
    } catch (error: any) {
      console.error("Error in bulk delete:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const testId = req.params.id;
      const admin = req.user;
      console.log(`Admin soft-deleting test: ${testId}`);

      let testTitle = "Unknown Test";
      let testType: "ai_generated" | "manual" | "test_set" = "manual";
      let examType: string | undefined;
      let section: string | undefined;
      let previousState: any = null;
      let found = false;

      if (testId.startsWith("nr-")) {
        const test = await storage.getNewToeflReadingTest(testId);
        if (test) {
          testTitle = test.title;
          examType = "new-toefl";
          section = "reading";
          previousState = { ...test, isActive: true };
          await storage.updateNewToeflReadingTest(testId, { isActive: false });
          console.log(`NEW TOEFL Reading soft-deleted: ${testId}`);
          found = true;
        }
      } else if (testId.startsWith("nl-")) {
        const test = await storage.getNewToeflListeningTest(testId);
        if (test) {
          testTitle = test.title;
          examType = "new-toefl";
          section = "listening";
          previousState = { ...test, isActive: true };
          await storage.updateNewToeflListeningTest(testId, { isActive: false });
          console.log(`NEW TOEFL Listening soft-deleted: ${testId}`);
          found = true;
        }
      } else if (testId.startsWith("ns-")) {
        const test = await storage.getNewToeflSpeakingTest(testId);
        if (test) {
          testTitle = test.title;
          examType = "new-toefl";
          section = "speaking";
          previousState = { ...test, isActive: true };
          await storage.updateNewToeflSpeakingTest(testId, { isActive: false });
          console.log(`NEW TOEFL Speaking soft-deleted: ${testId}`);
          found = true;
        }
      } else if (testId.startsWith("nw-")) {
        const test = await storage.getNewToeflWritingTest(testId);
        if (test) {
          testTitle = test.title;
          examType = "new-toefl";
          section = "writing";
          previousState = { ...test, isActive: true };
          await storage.updateNewToeflWritingTest(testId, { isActive: false });
          console.log(`NEW TOEFL Writing soft-deleted: ${testId}`);
          found = true;
        }
      }

      if (!found) {
        const aiTest = await storage.getAIGeneratedTest(testId);
        if (aiTest) {
          testTitle = aiTest.title;
          testType = "ai_generated";
          examType = aiTest.examType;
          section = aiTest.section;
          previousState = { ...aiTest, isActive: true };
          await storage.updateAIGeneratedTest(testId, { isActive: false });
          console.log(`AI test soft-deleted: ${testId}`);
          found = true;
        }
      }

      if (!found) {
        const test = await storage.getTest(testId);
        if (test) {
          testTitle = test.title;
          testType = "manual";
          examType = test.examType;
          section = test.section;
          previousState = { ...test, isActive: true };
          await storage.updateTest(testId, { isActive: false });
          console.log(`Test soft-deleted: ${testId}`);
          found = true;
        }
      }

      if (!found) {
        const testSet = await storage.getTestSet(testId.replace("testset-", ""));
        if (testSet) {
          testTitle = testSet.title;
          testType = "test_set";
          examType = testSet.examType;
          previousState = { ...testSet, isActive: true };
          await storage.updateTestSet(testId.replace("testset-", ""), { isActive: false });
          console.log(`Test set soft-deleted: ${testId}`);
          found = true;
        }
      }

      if (admin) {
        await storage.createTestAuditLog({
          testId,
          testTitle,
          testType,
          examType: examType as any,
          section,
          action: "delete",
          adminId: admin.id,
          adminEmail: admin.email,
          previousState,
          newState: { isActive: false },
          reason: req.body?.reason || null,
          metadata: { timestamp: new Date().toISOString() },
        });
      }

      res.json({ message: "테스트가 성공적으로 삭제되었습니다 (복구 가능)" });
    } catch (error: any) {
      console.error(`Error soft-deleting test ${req.params.id}:`, error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/tests/:id/restore", requireAuth, requireAdmin, async (req, res) => {
    try {
      const testId = req.params.id;
      const admin = req.user;
      console.log(`Admin restoring test: ${testId}`);

      let testTitle = "Unknown Test";
      let testType: "ai_generated" | "manual" | "test_set" = "manual";
      let examType: string | undefined;
      let section: string | undefined;
      let restoredTest: any = null;
      let found = false;

      if (testId.startsWith("nr-")) {
        const test = await storage.getNewToeflReadingTest(testId);
        if (test) {
          testTitle = test.title;
          examType = "new-toefl";
          section = "reading";
          restoredTest = await storage.updateNewToeflReadingTest(testId, { isActive: true });
          console.log(`NEW TOEFL Reading restored: ${testId}`);
          found = true;
        }
      } else if (testId.startsWith("nl-")) {
        const test = await storage.getNewToeflListeningTest(testId);
        if (test) {
          testTitle = test.title;
          examType = "new-toefl";
          section = "listening";
          restoredTest = await storage.updateNewToeflListeningTest(testId, { isActive: true });
          console.log(`NEW TOEFL Listening restored: ${testId}`);
          found = true;
        }
      } else if (testId.startsWith("ns-")) {
        const test = await storage.getNewToeflSpeakingTest(testId);
        if (test) {
          testTitle = test.title;
          examType = "new-toefl";
          section = "speaking";
          restoredTest = await storage.updateNewToeflSpeakingTest(testId, { isActive: true });
          console.log(`NEW TOEFL Speaking restored: ${testId}`);
          found = true;
        }
      } else if (testId.startsWith("nw-")) {
        const test = await storage.getNewToeflWritingTest(testId);
        if (test) {
          testTitle = test.title;
          examType = "new-toefl";
          section = "writing";
          restoredTest = await storage.updateNewToeflWritingTest(testId, { isActive: true });
          console.log(`NEW TOEFL Writing restored: ${testId}`);
          found = true;
        }
      }

      if (!found) {
        const aiTest = await storage.getAIGeneratedTest(testId);
        if (aiTest) {
          testTitle = aiTest.title;
          testType = "ai_generated";
          examType = aiTest.examType;
          section = aiTest.section;
          restoredTest = await storage.updateAIGeneratedTest(testId, { isActive: true });
          console.log(`AI test restored: ${testId}`);
          found = true;
        }
      }

      if (!found) {
        const test = await storage.getTest(testId);
        if (test) {
          testTitle = test.title;
          testType = "manual";
          examType = test.examType;
          section = test.section;
          restoredTest = await storage.updateTest(testId, { isActive: true });
          console.log(`Test restored: ${testId}`);
          found = true;
        }
      }

      if (!found) {
        const testSet = await storage.getTestSet(testId.replace("testset-", ""));
        if (testSet) {
          testTitle = testSet.title;
          testType = "test_set";
          examType = testSet.examType;
          restoredTest = await storage.updateTestSet(testId.replace("testset-", ""), { isActive: true });
          console.log(`Test set restored: ${testId}`);
          found = true;
        }
      }

      if (admin) {
        await storage.createTestAuditLog({
          testId,
          testTitle,
          testType,
          examType: examType as any,
          section,
          action: "restore",
          adminId: admin.id,
          adminEmail: admin.email,
          previousState: { isActive: false },
          newState: { isActive: true },
          reason: req.body?.reason || null,
          metadata: { timestamp: new Date().toISOString() },
        });
      }

      res.json({ message: "테스트가 성공적으로 복구되었습니다", test: restoredTest });
    } catch (error: any) {
      console.error(`Error restoring test ${req.params.id}:`, error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/test-audit-logs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { limit, action, testId } = req.query;
      let logs;
      if (testId) {
        logs = await storage.getTestAuditLogsByTestId(testId as string);
      } else if (action) {
        logs = await storage.getTestAuditLogsByAction(action as string);
      } else {
        logs = await storage.getTestAuditLogs(limit ? parseInt(limit as string, 10) : 100);
      }

      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching test audit logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/deleted-tests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allAiTests = await storage.getAllAIGeneratedTests();
      const deletedAiTests = allAiTests.filter((test) => test.isActive === false);
      const allTests = await storage.getTests();
      const deletedTests = allTests.filter((test) => test.isActive === false);
      const allTestSets = await storage.getTestSets();
      const deletedTestSets = allTestSets.filter((test) => test.isActive === false);

      res.json([
        ...deletedAiTests.map((test) => ({ ...test, type: "ai_generated" })),
        ...deletedTests.map((test) => ({ ...test, type: "manual" })),
        ...deletedTestSets.map((test) => ({ ...test, type: "test_set" })),
      ]);
    } catch (error: any) {
      console.error("Error fetching deleted tests:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/questions", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(validatedData);
      res.status(201).json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/questions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const question = await storage.updateQuestion(req.params.id, req.body);
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/questions/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteQuestion(req.params.id);
      res.json({ message: "Question deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
}
