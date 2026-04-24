import type { Express } from "express";
import OpenAI from "openai";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { requireAdvancedAI } from "../middleware/subscription";
import { aiFeedbackLimiter, aiGenerationLimiter } from "../middleware/rateLimit";
import { storage } from "../storage";
import { getOpenAIModel } from "../openaiModels";
import { parseGREQuantitativeText } from "../openai";

export function registerGreAiRoutes(app: Express) {
  app.post("/api/gre/analytical-writing/feedback", requireAuth, requireAdvancedAI, aiFeedbackLimiter, async (req, res) => {
    try {
      const { essay, prompt, language = "ko" } = req.body;
      if (!essay || !prompt) {
        return res.status(400).json({ message: "Essay and prompt are required" });
      }

      const { getLanguageConfig } = await import("../lang/promptConfig");
      const { langNative } = getLanguageConfig(language);
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const feedbackResponse = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: `You are an official GRE Analytical Writing expert evaluator following the 2024-2025 ETS scoring rubric. Return JSON in ${langNative}.`,
          },
          { role: "user", content: `Analyze this GRE Issue essay:\n\nPrompt: ${prompt}\n\nStudent Essay:\n${essay}` },
        ],
        response_format: { type: "json_object" },
      });

      const feedbackData = JSON.parse(feedbackResponse.choices[0].message.content || "{}");
      if ((req as any).user?.id) {
        storage.createSavedExplanation({
          userId: (req as any).user.id,
          type: "feedback",
          section: "gre-writing",
          questionText: prompt,
          content: feedbackData,
        }).catch((err) => console.warn("⚠️ Failed to save GRE writing feedback:", err));
      }

      res.json({ feedback: feedbackData, model: getOpenAIModel("premium") });
    } catch (error) {
      console.error("Error generating GRE writing feedback:", error);
      res.status(500).json({ message: "Failed to generate AI feedback" });
    }
  });

  app.post("/api/gre/analytical-writing/model-answers", requireAuth, requireAdvancedAI, aiFeedbackLimiter, async (req, res) => {
    try {
      const { prompt, task } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const modelAnswersResponse = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: "You are a GRE writing expert. Generate THREE model essays for the given prompt at intermediate, advanced, expert levels in JSON.",
          },
          { role: "user", content: `Task: ${task}\nPrompt: ${prompt}` },
        ],
        response_format: { type: "json_object" },
      });

      res.json({ modelAnswers: JSON.parse(modelAnswersResponse.choices[0].message.content || "{}") });
    } catch (error) {
      console.error("Error generating GRE model answers:", error);
      res.status(500).json({ message: "모범답안 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/gre/quant/parse", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "텍스트 내용이 필요합니다." });
      }

      const parsedQuestions = parseGREQuantitativeText(content);
      if (parsedQuestions.length === 0) {
        return res.status(400).json({
          message: 'GRE Quantitative 문제를 찾을 수 없습니다. "Question 1" 형식으로 문제를 입력해주세요.',
        });
      }

      res.json({
        success: true,
        questions: parsedQuestions,
        totalQuestions: parsedQuestions.length,
        message: `${parsedQuestions.length}개의 문제가 파싱되었습니다.`,
      });
    } catch (error: any) {
      console.error("Error parsing GRE Quantitative text:", error);
      res.status(500).json({ message: "파싱 중 오류가 발생했습니다.", error: error.message });
    }
  });

  app.post("/api/gre/quant/create", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { title, questions } = req.body;
      if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "제목과 문제 배열이 필요합니다." });
      }

      const timestamp = Date.now();
      const testId = `gre-quant-test-${timestamp}`;
      const testSetId = `gre-quant-set-${timestamp}`;

      await storage.createTest({
        id: testId,
        title,
        description: `GRE Quantitative Reasoning - ${questions.length} questions`,
        examType: "gre" as const,
        section: "quantitative" as const,
        difficulty: "medium" as const,
        duration: Math.ceil(questions.length * 1.75),
        questionCount: questions.length,
        isActive: true,
        createdAt: new Date(),
      });

      for (const question of questions) {
        await storage.createQuestion({
          testId,
          questionText: question.questionText,
          questionType: question.questionType,
          options: question.options || null,
          quantityA: question.quantityA || null,
          quantityB: question.quantityB || null,
          imageUrl: question.imageUrl || null,
          requiresImage: question.requiresImage || false,
          correctAnswer: "",
          explanation: "",
          orderIndex: question.orderIndex,
          points: 1,
          difficulty: "medium" as const,
        });
      }

      await storage.createTestSet({
        id: testSetId,
        title,
        examType: "gre" as const,
        description: `GRE Quantitative Reasoning - ${questions.length} questions`,
        totalDuration: Math.ceil(questions.length * 1.75),
        isActive: true,
        createdAt: new Date(),
      });

      await storage.createTestSetComponent({
        testSetId,
        testId,
        orderIndex: 1,
        isRequired: true,
      });

      res.json({
        success: true,
        testId,
        testSetId,
        message: `${questions.length}개 문제로 테스트가 생성되었습니다. Test Sets 페이지에서 확인하세요.`,
      });
    } catch (error: any) {
      console.error("Error creating GRE Quantitative test:", error);
      res.status(500).json({ message: "테스트 생성 중 오류가 발생했습니다.", error: error.message });
    }
  });
}
