import type { Express } from "express";
import OpenAI from "openai";
import multer from "multer";
import {
  insertSpeakingAttemptSchema,
  insertSpeakingTestSchema,
  insertWritingAttemptSchema,
  insertWritingTestSchema,
} from "@shared/schema";
import { requireAuth, requireAdmin, optionalAuth } from "../middleware/auth";
import { requireAIAccess, requireAdvancedAI } from "../middleware/subscription";
import { aiFeedbackLimiter } from "../middleware/rateLimit";
import { storage } from "../storage";
import { getOpenAIModel } from "../openaiModels";

export function registerSpeakingWritingRoutes(app: Express) {
  app.get("/api/speaking-tests", async (_req, res) => {
    try {
      const tests = await storage.getSpeakingTests();
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/speaking-tests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertSpeakingTestSchema.parse(req.body);
      const test = await storage.createSpeakingTest(validatedData);
      res.status(201).json(test);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/speaking-tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const test = await storage.updateSpeakingTest(req.params.id, req.body);
      res.json(test);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/speaking-tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteSpeakingTest(req.params.id);
      res.json({ message: "Speaking test deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/speaking-attempts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertSpeakingAttemptSchema.parse({
        ...req.body,
        userId: user.id,
      });
      const attempt = await storage.createSpeakingAttempt(validatedData);
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/speaking-attempts/:id", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getSpeakingAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "Speaking attempt not found" });
      }
      const user = req.user as any;
      if (attempt.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(attempt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/speaking-attempts/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getSpeakingAttempt(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Speaking attempt not found" });
      }
      const user = req.user as any;
      if (existing.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      // Prevent ownership transfer via PATCH body
      const { userId: _ignoredUserId, ...safeBody } = req.body ?? {};
      const attempt = await storage.updateSpeakingAttempt(req.params.id, safeBody);
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId/speaking-attempts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.id !== req.params.userId && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const attempts = await storage.getUserSpeakingAttempts(req.params.userId);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/writing-tests", async (_req, res) => {
    try {
      const tests = await storage.getWritingTests();
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/writing/full-test", optionalAuth, async (_req, res) => {
    try {
      const writingTests = await storage.getWritingTests();
      const integratedTests = writingTests.filter((t: any) => t.type === "integrated");
      const discussionTests = writingTests.filter((t: any) => t.type === "discussion");
      const getRandomItem = (arr: any[]) => (arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null);

      const tasks: any[] = [];
      const integratedSource = getRandomItem(integratedTests);
      if (integratedSource) {
        tasks.push({
          taskNumber: 1,
          type: "integrated",
          id: integratedSource.id,
          title: integratedSource.title || "Integrated Writing Task",
          readingPassage: integratedSource.readingPassage,
          readingTime: integratedSource.readingTime || 180,
          listeningScript: integratedSource.listeningScript,
          listeningAudioUrl: integratedSource.listeningAudioUrl,
          questionText: integratedSource.questionText,
          writingTime: integratedSource.writingTime || 1200,
          wordLimit: integratedSource.wordLimit || 300,
        });
      }

      const discussionSource = getRandomItem(discussionTests);
      if (discussionSource) {
        tasks.push({
          taskNumber: 2,
          type: "discussion",
          id: discussionSource.id,
          title: discussionSource.title || "Academic Discussion Task",
          discussionTopic: discussionSource.discussionTopic,
          student1Opinion: discussionSource.student1Opinion,
          student2Opinion: discussionSource.student2Opinion,
          questionText: discussionSource.questionText,
          writingTime: discussionSource.writingTime || 600,
          wordLimit: discussionSource.wordLimit || 150,
        });
      }

      if (tasks.length === 0) {
        return res.status(404).json({
          message: "충분한 문제가 없습니다. Writing 문제를 먼저 생성해주세요.",
          availableTasks: 0,
        });
      }

      res.json({
        id: `writing-full-test-${Date.now()}`,
        title: "TOEFL Writing Full Test",
        tasks,
        totalTasks: tasks.length,
        estimatedTime: tasks.length === 2 ? 30 : 20,
      });
    } catch (error: any) {
      console.error("Error fetching writing full test:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/writing-tests/:id", async (req, res) => {
    try {
      const test = await storage.getWritingTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Writing test not found" });
      }
      res.json(test);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/writing-tests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertWritingTestSchema.parse(req.body);
      const test = await storage.createWritingTest(validatedData);
      res.status(201).json(test);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/writing-tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const test = await storage.updateWritingTest(req.params.id, req.body);
      res.json(test);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/writing-tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteWritingTest(req.params.id);
      res.json({ message: "Writing test deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/writing-attempts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertWritingAttemptSchema.parse({
        ...req.body,
        userId: user.id,
      });
      const attempt = await storage.createWritingAttempt(validatedData);
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/writing-attempts/:id", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getWritingAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "Writing attempt not found" });
      }
      const user = req.user as any;
      if (attempt.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(attempt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/writing-attempts/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getWritingAttempt(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Writing attempt not found" });
      }
      const user = req.user as any;
      if (existing.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const { userId: _ignoredUserId, ...safeBody } = req.body ?? {};
      const attempt = await storage.updateWritingAttempt(req.params.id, safeBody);
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId/writing-attempts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.id !== req.params.userId && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const attempts = await storage.getUserWritingAttempts(req.params.userId);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/speaking/tests", optionalAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const isAdmin = user && (user.role === "admin" || user.username === "superadmin");
      const [speakingTopics, allAiTests] = await Promise.all([
        isAdmin ? storage.getAllSpeakingTopics() : storage.getSpeakingTests(),
        storage.getAllAIGeneratedTestsAdmin(),
      ]);

      const formattedTopics = speakingTopics.map((test) => ({
        id: test.id,
        title: test.title,
        type: test.type,
        questionType: test.questionType,
        description: test.description,
        topic: test.topic,
        readingPassage: test.readingPassage,
        readingPassageTitle: test.readingPassageTitle,
        readingTime: test.readingTime,
        listeningAudioUrl: test.listeningAudioUrl,
        listeningScript: test.listeningScript,
        questionText: test.questionText,
        preparationTime: test.preparationTime,
        responseTime: test.responseTime,
        sampleAnswer: test.sampleAnswer,
        isActive: test.isActive,
        createdAt: test.createdAt,
        source: "topics",
      }));

      const aiSpeakingTests = allAiTests
        .filter((record: any) => {
          const testData = record.testData || record;
          return testData.section === "speaking" && (isAdmin || record.isActive === true);
        })
        .map((record: any) => {
          const testData = record.testData || record;
          const question = testData.questions?.[0] || {};
          return {
            id: record.id,
            title: testData.title || record.title,
            type: question.speakingType || "integrated",
            questionType: "speaking",
            description: testData.description || `AI-generated ${question.speakingType || "integrated"} speaking task`,
            topic: question.readingPassageTitle || testData.title,
            readingPassage: question.readingPassage,
            readingPassageTitle: question.readingPassageTitle,
            readingTime: question.readingTime || 45,
            listeningAudioUrl: question.listeningAudioUrl,
            listeningScript: question.listeningScript,
            questionText: question.questionText,
            preparationTime: question.preparationTime || 30,
            responseTime: question.responseTime || 60,
            sampleAnswer: question.sampleAnswer,
            isActive: record.isActive,
            createdAt: record.createdAt,
            source: "ai",
          };
        });

      res.json([...formattedTopics, ...aiSpeakingTests]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/speaking/full-test", optionalAuth, async (_req, res) => {
    try {
      const speakingTopics = await storage.getSpeakingTests();
      const independentTests = speakingTopics.filter((t: any) => t.type === "independent");
      const integratedTests = speakingTopics.filter((t: any) => t.type === "integrated");
      const integratedTask2 = integratedTests.filter((t: any) => t.questionType === "2");
      const integratedTask3 = integratedTests.filter((t: any) => t.questionType === "3");
      const integratedTask4 = integratedTests.filter((t: any) => t.questionType === "4");
      const getRandomItem = (arr: any[]) => (arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null);

      const tasks: any[] = [];
      const task1Source = getRandomItem(independentTests);
      if (task1Source) {
        tasks.push({
          taskNumber: 1,
          type: "independent",
          id: task1Source.id,
          title: task1Source.title || "Independent Speaking Task",
          topic: task1Source.topic,
          questionText: task1Source.questionText || task1Source.topic,
          preparationTime: 15,
          responseTime: 45,
        });
      }

      const task2Source = getRandomItem(integratedTask2) || getRandomItem(integratedTests);
      if (task2Source) {
        tasks.push({
          taskNumber: 2,
          type: "integrated",
          id: task2Source.id,
          title: task2Source.title || "Integrated Speaking Task 2",
          readingPassage: task2Source.readingPassage,
          readingPassageTitle: task2Source.readingPassageTitle,
          readingTime: task2Source.readingTime || 45,
          listeningScript: task2Source.listeningScript,
          listeningAudioUrl: task2Source.listeningAudioUrl,
          questionText: task2Source.questionText,
          preparationTime: 30,
          responseTime: 60,
        });
      }

      const task3Source =
        getRandomItem(integratedTask3) || getRandomItem(integratedTests.filter((t: any) => t.id !== task2Source?.id));
      if (task3Source) {
        tasks.push({
          taskNumber: 3,
          type: "integrated",
          id: task3Source.id,
          title: task3Source.title || "Integrated Speaking Task 3",
          readingPassage: task3Source.readingPassage,
          readingPassageTitle: task3Source.readingPassageTitle,
          readingTime: task3Source.readingTime || 45,
          listeningScript: task3Source.listeningScript,
          listeningAudioUrl: task3Source.listeningAudioUrl,
          questionText: task3Source.questionText,
          preparationTime: 30,
          responseTime: 60,
        });
      }

      const task4Source =
        getRandomItem(integratedTask4) ||
        getRandomItem(integratedTests.filter((t: any) => t.id !== task2Source?.id && t.id !== task3Source?.id));
      if (task4Source) {
        tasks.push({
          taskNumber: 4,
          type: "integrated",
          id: task4Source.id,
          title: task4Source.title || "Integrated Speaking Task 4",
          listeningScript: task4Source.listeningScript,
          listeningAudioUrl: task4Source.listeningAudioUrl,
          questionText: task4Source.questionText,
          preparationTime: 20,
          responseTime: 60,
        });
      }

      if (tasks.length < 2) {
        return res.status(404).json({
          message: "충분한 문제가 없습니다. Speaking 문제를 먼저 생성해주세요.",
          availableTasks: tasks.length,
        });
      }

      res.json({
        id: `full-test-${Date.now()}`,
        title: "TOEFL Speaking Full Test",
        tasks,
        totalTasks: tasks.length,
        estimatedTime: 17,
      });
    } catch (error: any) {
      console.error("Error fetching speaking full test:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // NOTE: /api/speech-to-text is registered in speakingAudioRoutes.ts (first-wins);
  // the duplicate handler that used to live here has been removed as dead code.

  app.post("/api/ai/speaking-feedback", requireAuth, requireAIAccess, aiFeedbackLimiter, async (req, res) => {
    try {
      const { transcript, questionText, readingPassage, listeningText, type, speechMetrics } = req.body;

      if (!transcript || !questionText) {
        return res.status(400).json({ error: "Transcript and question text are required" });
      }

      const { generateSpeakingFeedback, generateIntegratedSpeakingFeedback } = await import("../openai");
      let result;
      if (type === "integrated" && (readingPassage || listeningText)) {
        result = await generateIntegratedSpeakingFeedback(
          questionText,
          transcript,
          readingPassage,
          listeningText,
          speechMetrics,
        );
      } else {
        result = await generateSpeakingFeedback(questionText, transcript, type || "independent", speechMetrics);
      }

      if ((req as any).user?.id) {
        storage
          .createSavedExplanation({
            userId: (req as any).user.id,
            type: "feedback",
            section: "speaking",
            questionText,
            content: result,
          })
          .catch((err) => console.warn("⚠️ Failed to save ai/speaking-feedback:", err));
      }

      res.json(result);
    } catch (error: any) {
      console.error("AI Speaking feedback error:", error);
      res.json({
        overallAssessment: "예상 TOEFL Speaking 점수: 18/30점. 기본적인 의사소통은 가능하지만 개선이 필요합니다.",
        strengths: "기본적인 문법 구조를 사용하여 의견을 전달할 수 있습니다. 발음이 비교적 명확합니다.",
        areasForImprovement: "리딩과 리스닝의 주요 정보를 더 정확히 포함하세요. 두 자료 간의 연결성을 강화하고, 구체적인 예시를 추가하세요.",
        modelAnswerScript: `According to the reading passage, [main point from reading]. However, the lecturer challenges this view by arguing that [counterpoint from listening].`,
        modelAnswerAnalysis: "모범 답안은 리딩과 리스닝의 핵심 내용을 균형있게 통합합니다.",
        scores: { delivery: 3.5, languageUse: 3.2, topicDevelopment: 3.0, overall: 3.2, predictedToeflScore: 19 },
        success: false,
        note: "Using fallback feedback due to service issues",
      });
    }
  });

  app.post("/api/speaking-feedback-legacy", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const { transcript, questionText, readingPassage, listeningText, type } = req.body;

      if (!transcript || !questionText) {
        return res.status(400).json({ error: "Transcript and question text are required" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const systemPrompt =
        type === "integrated"
          ? "You are an expert TOEFL Speaking assessor. Evaluate this integrated speaking response based on the reading passage, listening content, and question. Provide detailed feedback and scores."
          : "You are an expert TOEFL Speaking assessor. Evaluate this independent speaking response based on the question. Provide detailed feedback and scores.";

      const userPrompt =
        type === "integrated"
          ? `Reading Passage: ${readingPassage}\n\nListening Content: ${listeningText}\n\nQuestion: ${questionText}\n\nStudent Response: ${transcript}`
          : `Question: ${questionText}\n\nStudent Response: ${transcript}`;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      res.json(JSON.parse(response.choices[0].message.content || "{}"));
    } catch (error) {
      console.error("AI feedback error:", error);
      res.status(500).json({ error: "Failed to generate AI feedback" });
    }
  });

  app.post("/api/speaking-feedback", requireAuth, requireAdvancedAI, aiFeedbackLimiter, async (req, res) => {
    try {
      const { questionText, transcript, testType, speechMetrics } = req.body;
      if (!transcript || !questionText) {
        return res.status(400).json({ error: "Transcript and question text are required" });
      }

      const { generateSpeakingFeedback } = await import("../openai");
      const result = await generateSpeakingFeedback(questionText, transcript, testType, speechMetrics);

      if ((req as any).user?.id) {
        storage
          .createSavedExplanation({
            userId: (req as any).user.id,
            type: "feedback",
            section: "speaking",
            questionText,
            content: result,
          })
          .catch((err) => console.warn("⚠️ Failed to save speaking feedback:", err));
      }

      res.json(result);
    } catch (error: any) {
      console.error("Speaking feedback error:", error);
      res.json({
        overallAssessment: "예상 TOEFL Speaking 점수: 18/30점. 기본적인 의사소통은 가능하지만 개선이 필요합니다.",
        strengths: "기본적인 문법 구조를 사용하여 의견을 전달할 수 있습니다. 발음이 비교적 명확합니다.",
        areasForImprovement: "논리적 연결성을 강화하고, 더 다양한 어휘를 사용하며, 구체적인 예시를 추가하세요.",
        modelAnswerScript: `In my opinion, I strongly believe that [main position].`,
        modelAnswerAnalysis: "모범 답안은 명확한 도입, 근거, 예시, 결론으로 구성됩니다.",
        scores: {
          coherence: 3,
          clarity: 4,
          logicalStructure: 3,
          languageUse: 3,
          pronunciation: 4,
          overall: 3.4,
          predictedToeflScore: 18,
        },
        success: false,
        note: "Using fallback feedback due to service issues",
      });
    }
  });

  const uploadMemory = multer({ storage: multer.memoryStorage() });
  app.post("/api/convert-audio-mp3", uploadMemory.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      res.setHeader("Content-Type", "audio/webm");
      res.setHeader("Content-Disposition", 'attachment; filename="recording.webm"');
      res.send(req.file.buffer);
    } catch (error: any) {
      console.error("Audio conversion error:", error);
      res.status(500).json({ error: "Failed to convert audio" });
    }
  });
}
