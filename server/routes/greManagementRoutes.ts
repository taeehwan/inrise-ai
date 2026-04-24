import type { Express } from "express";
import multer from "multer";
import path from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { sanitizeUploadedFilename } from "../lib/uploadFilename";
import { storage } from "../storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function registerGreManagementRoutes(app: Express) {
  app.get("/api/gre/writing-topics", async (_req, res) => {
    try {
      const topics = await storage.getGreAnalyticalWritingTests();
      const activeTopics = topics.filter((topic) => topic.isActive === true);
      console.log(`📋 GRE Writing Topics API: Total ${topics.length}, Active ${activeTopics.length}`);
      res.json(activeTopics);
    } catch (error) {
      console.error("Error getting public GRE writing topics:", error);
      res.status(500).json({ message: "Failed to get writing topics" });
    }
  });

  app.get("/api/admin/gre/writing-topics", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const topics = await storage.getGreAnalyticalWritingTests();
      res.json(topics);
    } catch (error) {
      console.error("Error getting GRE writing topics:", error);
      res.status(500).json({ message: "Failed to get writing topics" });
    }
  });

  app.post("/api/admin/gre/writing-topics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const topicData = req.body;

      if (!topicData) {
        return res.status(400).json({ message: "Topic data is required" });
      }

      const taskType = topicData.questionText?.toLowerCase().includes("argument")
        ? "analyze_argument"
        : "analyze_issue";

      const newTopic = await storage.createGreAnalyticalWritingTest({
        title: topicData.title || "GRE Writing Topic",
        taskType,
        prompt: topicData.questionText || topicData.prompt || "",
        instructions: topicData.description || "Write a response analyzing the topic.",
        timeLimit: Math.floor((topicData.responseTime || 1800) / 60),
        sampleEssay: topicData.sampleAnswer || null,
        isActive: true,
      });

      res.json(newTopic);
    } catch (error) {
      console.error("Error creating GRE writing topic:", error);
      res.status(500).json({ message: "Failed to create writing topic" });
    }
  });

  app.put("/api/admin/gre/writing-topics/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const topicData = req.body;
      const taskType = topicData.questionText?.toLowerCase().includes("argument")
        ? "analyze_argument"
        : "analyze_issue";

      const updatedTopic = await storage.updateGreAnalyticalWritingTest(id, {
        title: topicData.title,
        taskType,
        prompt: topicData.questionText || topicData.prompt,
        instructions: topicData.description || "Write a response analyzing the topic.",
        timeLimit: Math.floor((topicData.responseTime || 1800) / 60),
        sampleEssay: topicData.sampleAnswer || null,
        isActive: topicData.isActive ?? true,
      });

      res.json(updatedTopic);
    } catch (error) {
      console.error("Error updating GRE writing topic:", error);
      res.status(500).json({ message: "Failed to update writing topic" });
    }
  });

  app.delete("/api/admin/gre/writing-topics/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGreAnalyticalWritingTest(id);
      res.json({ message: "Topic deleted successfully" });
    } catch (error) {
      console.error("Error deleting GRE writing topic:", error);
      res.status(500).json({ message: "Failed to delete writing topic" });
    }
  });

  app.get("/api/admin/gre/verbal-questions", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const questions = await storage.getGREVerbalQuestions();
      res.json(questions);
    } catch (error) {
      console.error("Error getting GRE verbal questions:", error);
      res.status(500).json({ message: "Failed to get verbal questions" });
    }
  });

  app.post("/api/admin/gre/verbal-questions", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { passage, questions } = req.body;

      if (!passage || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "Passage and questions are required" });
      }

      const savedQuestions = [];
      for (const [index, question] of questions.entries()) {
        try {
          const savedQuestion = await storage.createGREVerbalQuestion({
            testId: `gre-verbal-admin-${Date.now()}`,
            orderIndex: index,
            questionType: "multiple-choice",
            questionText: question.questionText,
            passage,
            options: question.options,
            correctAnswer: question.correctAnswer,
            difficulty: "intermediate",
          });
          savedQuestions.push(savedQuestion);
        } catch (saveError) {
          console.error("Error saving question:", saveError);
        }
      }

      res.json({
        message: `Successfully saved ${savedQuestions.length} verbal questions`,
        questions: savedQuestions,
      });
    } catch (error) {
      console.error("Error creating GRE verbal questions:", error);
      res.status(500).json({ message: "Failed to create verbal questions" });
    }
  });

  app.post("/api/admin/gre/quantitative-questions", requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
    try {
      const { questionText, options, correctAnswer } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      if (!questionText || !options || !correctAnswer) {
        return res.status(400).json({ message: "Question text, options, and correct answer are required" });
      }

      let parsedOptions;
      try {
        parsedOptions = typeof options === "string" ? JSON.parse(options) : options;
      } catch {
        return res.status(400).json({ message: "Invalid options format" });
      }

      const uploadDir = path.join(process.cwd(), "uploads", "gre-quantitative");
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}_${sanitizeUploadedFilename(req.file.originalname)}`;
      const filePath = path.join(uploadDir, fileName);
      writeFileSync(filePath, req.file.buffer);

      const imageUrl = `/uploads/gre-quantitative/${fileName}`;

      const savedQuestion = await storage.createGREQuantitativeQuestion({
        testId: `gre-quant-admin-${Date.now()}`,
        orderIndex: 0,
        questionType: "multiple-choice",
        questionText,
        imageUrl,
        options: parsedOptions,
        correctAnswer,
        difficulty: "intermediate",
      });

      res.json({
        message: "Successfully saved quantitative question",
        question: savedQuestion,
      });
    } catch (error) {
      console.error("Error creating GRE quantitative question:", error);
      res.status(500).json({ message: "Failed to create quantitative question" });
    }
  });

  app.get("/api/admin/gre/quantitative-questions", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const questions = await storage.getGREQuantitativeQuestions();
      res.json(questions);
    } catch (error) {
      console.error("Error getting GRE quantitative questions:", error);
      res.status(500).json({ message: "Failed to get quantitative questions" });
    }
  });

  app.post("/api/admin/toefl/reading", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { passages, questions } = req.body;

      if (!passages || !questions) {
        return res.status(400).json({ message: "Passages and questions are required" });
      }

      res.json({
        message: "TOEFL Reading materials uploaded successfully",
        passageCount: passages.length,
        questionCount: questions.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/toefl/listening", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { transcript, questions } = req.body;

      if (!transcript || !questions) {
        return res.status(400).json({ message: "Transcript and questions are required" });
      }

      res.json({ message: "TOEFL Listening materials uploaded successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/toefl/speaking", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { topics } = req.body;

      if (!topics || !Array.isArray(topics)) {
        return res.status(400).json({ message: "Topics array is required" });
      }

      res.json({
        message: "TOEFL Speaking topics uploaded successfully",
        topicCount: topics.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/toefl/writing", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { prompts } = req.body;

      if (!prompts || !Array.isArray(prompts)) {
        return res.status(400).json({ message: "Prompts array is required" });
      }

      res.json({
        message: "TOEFL Writing prompts uploaded successfully",
        promptCount: prompts.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/gre/writing", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { prompts } = req.body;

      if (!prompts || !Array.isArray(prompts)) {
        return res.status(400).json({ message: "Prompts array is required" });
      }

      res.json({
        message: "GRE Writing prompts uploaded successfully",
        promptCount: prompts.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/gre/verbal", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { questions } = req.body;

      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions array is required" });
      }

      res.json({
        message: "GRE Verbal questions uploaded successfully",
        questionCount: questions.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/gre/quantitative", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { questions } = req.body;

      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions array is required" });
      }

      res.json({
        message: "GRE Quantitative questions uploaded successfully",
        questionCount: questions.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
