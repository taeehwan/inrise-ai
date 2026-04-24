import express, { type Express } from "express";
import multer from "multer";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { insertAdminMessageSchema, insertFaqSchema } from "@shared/schema";
import {
  extractTextFromImage,
  generateGREWritingTopics,
  generateImageBasedQuestion,
  generateSpeakingQuestions,
  generateTestQuestions,
} from "../openai";
import { getOpenAIModel, OPENAI_TTS_MODEL } from "../openaiModels";
import { stripSpeakerLabels } from "../lib/audioText";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { aiGenerationLimiter, aiTtsLimiter } from "../middleware/rateLimit";
import { storage } from "../storage";
import { generateTTSAudio } from "../lib/ttsAudio";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function registerAdminAiUtilityRoutes(app: Express) {
  app.post("/api/admin/messages", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertAdminMessageSchema.parse(req.body);
      const message = await storage.createAdminMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/ai-draft-message", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { studentName, section, examType, score, feedback, transcription, essayText } = req.body;

      const contextParts = [];
      if (section) contextParts.push(`섹션: ${section}`);
      if (examType) contextParts.push(`시험 유형: ${examType.toUpperCase()}`);
      if (score !== undefined && score !== null) contextParts.push(`점수: ${score}`);
      if (transcription) contextParts.push(`스피킹 내용:\n${transcription.slice(0, 400)}`);
      if (essayText) contextParts.push(`에세이 내용:\n${essayText.slice(0, 400)}`);
      if (feedback) contextParts.push(`AI 피드백 요약:\n${feedback.slice(0, 500)}`);

      const prompt = `당신은 인라이즈(INRISE) TOEFL/GRE 준비 학원의 선생님입니다.
아래 학생의 시험 결과를 보고, 격려와 구체적인 개선 피드백이 담긴 짧은 한국어 메시지를 작성해주세요.

학생 이름: ${studentName || "학생"}
${contextParts.join("\n")}

요구사항:
- 따뜻하고 격려하는 톤으로 작성
- 구체적인 개선 방향 1-2가지 포함
- 200자 이내의 간결한 메시지
- 제목(subject)과 본문(message) 모두 작성

JSON 형식으로 응답:
{
  "subject": "메시지 제목",
  "message": "메시지 본문"
}`;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_completion_tokens: 400,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ subject: result.subject || "시험 결과 피드백", message: result.message || "" });
    } catch (error: any) {
      console.error("AI draft message error:", error);
      res.status(500).json({ message: "AI 초안 생성에 실패했습니다." });
    }
  });

  app.get("/api/admin/messages", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const messages = await storage.getAdminMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const messages = await storage.getUserMessages(user.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Larger body ceiling for routes that accept inline base64 images (up to ~15MB raw).
  const largeJson = express.json({ limit: "20mb" });

  app.post("/api/admin/extract-text", largeJson, requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
    try {
      let base64Image: string;

      if (req.file) {
        base64Image = req.file.buffer.toString("base64");
      } else if (req.body.imageBase64) {
        base64Image = req.body.imageBase64;
      } else if (req.body.image) {
        base64Image = req.body.image.replace(/^data:image\/[a-z]+;base64,/, "");
      } else {
        return res.status(400).json({ message: "이미지 파일이나 base64 데이터가 필요합니다." });
      }

      const extractedText = await extractTextFromImage(base64Image);
      res.json({ extractedText });
    } catch (error: any) {
      console.error("Text extraction error:", error);
      res.status(500).json({ message: "텍스트 추출에 실패했습니다." });
    }
  });

  app.post("/api/admin/generate-speech", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { text, voiceType = "narrator" } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "텍스트가 필요합니다." });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const voiceTypeMap: Record<string, string> = {
        narrator: "nova",
        professor: "onyx",
        lecturer: "onyx",
        student: "nova",
        student1: "nova",
        student2: "onyx",
        male: "onyx",
        female: "nova",
      };
      const cleanText = stripSpeakerLabels(typeof text === "string" ? text : JSON.stringify(text));
      const truncatedText = cleanText.substring(0, 4096);
      const mp3 = await openai.audio.speech.create({
        model: OPENAI_TTS_MODEL,
        voice: (voiceTypeMap[voiceType] || "nova") as any,
        input: truncatedText,
        speed: 1.0,
      });
      const audioBuffer = Buffer.from(await mp3.arrayBuffer());

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", 'attachment; filename="audio.mp3"');
      res.send(audioBuffer);
    } catch (error: any) {
      console.error("Speech generation error:", error);
      res.status(500).json({ message: "음성 생성에 실패했습니다." });
    }
  });

  app.post("/api/ai/parse-listening-passages", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { pastedText, examType, difficulty, setTitle } = req.body;

      if (!pastedText || !examType || !difficulty) {
        return res.status(400).json({ message: "붙여넣은 텍스트, 시험 유형, 난이도가 필요합니다." });
      }

      const { parseListeningPassages } = await import("../openai");
      const passages = await parseListeningPassages(pastedText, examType, difficulty);

      for (let i = 0; i < passages.length; i++) {
        const passage = passages[i];
        const scriptText =
          typeof passage.script === "string"
            ? passage.script
            : passage.script.map((line: any) => `${line.speaker}: ${line.text}`).join(" ");
        const truncatedScript = scriptText.length > 4000 ? `${scriptText.substring(0, 4000)}...` : scriptText;

        try {
          const audioBuffer = await generateTTSAudio(truncatedScript, "nova");
          const audioFileName = `listening_passage_${i + 1}_${Date.now()}.mp3`;
          const { uploadAudioToStorage } = await import("../audioStorage");
          passage.audioUrl = await uploadAudioToStorage(Buffer.from(audioBuffer), audioFileName);
        } catch (error) {
          console.error(`Audio generation failed for passage ${i + 1}:`, error);
          passage.audioUrl = null;
        }
      }

      const testId = `ai-toefl-listening-${randomUUID()}`;
      const testData = {
        id: testId,
        title: setTitle || `TOEFL Listening Practice - ${passages.length} Passages`,
        examType: "toefl",
        section: "listening",
        difficulty,
        passages,
        questionCount: passages.reduce((total: number, passage: any) => total + passage.questions.length, 0),
        createdAt: new Date(),
        isActive: false,
      };

      await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: true });
      res.json({
        testId,
        testData,
        passageCount: passages.length,
        totalQuestions: testData.questionCount,
      });
    } catch (error: any) {
      console.error("Listening passages parsing error:", error);
      res.status(500).json({ message: `리스닝 지문 파싱에 실패했습니다: ${error.message}` });
    }
  });

  app.post("/api/ai/generate-reading-section", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { examType, difficulty, questionCount, topic, setTitle, passageContent, passageTitle } = req.body;

      if (!examType || !difficulty) {
        return res.status(400).json({ message: "시험 유형과 난이도가 필요합니다." });
      }

      const { generateReadingSection, generateQuestionsFromPassage } = await import("../openai");
      const sectionData = passageContent
        ? await generateQuestionsFromPassage(
            examType,
            passageContent,
            passageTitle || "Reading Passage",
            difficulty,
            questionCount || 5,
          )
        : await generateReadingSection(examType, difficulty, questionCount || 10, topic);

      const testId = `ai-${examType}-reading-${randomUUID()}`;
      const testData = {
        id: testId,
        title: setTitle || `${examType.toUpperCase()} Reading Practice - ${sectionData.passages.length} Passages`,
        examType,
        section: "reading",
        difficulty,
        passages: sectionData.passages,
        questionCount: sectionData.totalQuestions,
        timeLimit: sectionData.timeLimit,
        createdAt: new Date(),
        isActive: true,
      };

      await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: true });
      res.json({
        testId,
        testData,
        passageCount: sectionData.passages.length,
        totalQuestions: sectionData.totalQuestions,
      });
    } catch (error: any) {
      console.error("Reading section generation error:", error);
      res.status(500).json({ message: `리딩 섹션 생성에 실패했습니다: ${error.message}` });
    }
  });

  app.post("/api/ai/generate-speaking-section", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { examType, difficulty, questionCount, topic, setTitle } = req.body;
      if (!examType || !difficulty) {
        return res.status(400).json({ message: "시험 유형과 난이도가 필요합니다." });
      }

      const { generateSpeakingSection } = await import("../openai");
      const sectionData = await generateSpeakingSection(examType, difficulty, questionCount || 4, topic);
      const testId = `ai-${examType}-speaking-${randomUUID()}`;
      const testData = {
        id: testId,
        title: setTitle || `${examType.toUpperCase()} Speaking Practice - ${sectionData.totalTasks} Tasks`,
        examType,
        section: "speaking",
        difficulty,
        tasks: sectionData.tasks,
        taskCount: sectionData.totalTasks,
        timeLimit: sectionData.totalTime,
        createdAt: new Date(),
        isActive: true,
      };

      await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: true });
      res.json({ testId, testData, taskCount: sectionData.totalTasks, totalTime: sectionData.totalTime });
    } catch (error: any) {
      console.error("Speaking section generation error:", error);
      res.status(500).json({ message: `스피킹 섹션 생성에 실패했습니다: ${error.message}` });
    }
  });

  app.post("/api/ai/generate-writing-section", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { examType, difficulty, questionCount, topic, setTitle } = req.body;
      if (!examType || !difficulty) {
        return res.status(400).json({ message: "시험 유형과 난이도가 필요합니다." });
      }

      const { generateWritingSection } = await import("../openai");
      const sectionData = await generateWritingSection(examType, difficulty, questionCount || 2, topic);
      const testId = `ai-${examType}-writing-${randomUUID()}`;
      const testData = {
        id: testId,
        title: setTitle || `${examType.toUpperCase()} Writing Practice - ${sectionData.totalTasks} Tasks`,
        examType,
        section: "writing",
        difficulty,
        tasks: sectionData.tasks,
        taskCount: sectionData.totalTasks,
        timeLimit: sectionData.totalTime,
        createdAt: new Date(),
        isActive: true,
      };

      await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: true });
      res.json({ testId, testData, taskCount: sectionData.totalTasks, totalTime: sectionData.totalTime });
    } catch (error: any) {
      console.error("Writing section generation error:", error);
      res.status(500).json({ message: `라이팅 섹션 생성에 실패했습니다: ${error.message}` });
    }
  });

  app.post("/api/ai/generate-listening-section", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { examType, difficulty, questionCount, topic, setTitle } = req.body;
      if (!examType || !difficulty) {
        return res.status(400).json({ message: "시험 유형과 난이도가 필요합니다." });
      }

      const { generateListeningSection } = await import("../openai");
      const sectionData = await generateListeningSection(examType, difficulty, questionCount || 6, topic);
      const testId = `ai-${examType}-listening-${randomUUID()}`;
      const testData = {
        id: testId,
        title: setTitle || `${examType.toUpperCase()} Listening Practice - ${sectionData.totalPassages} Passages`,
        examType,
        section: "listening",
        difficulty,
        passages: sectionData.passages,
        passageCount: sectionData.totalPassages,
        questionCount: sectionData.totalQuestions,
        timeLimit: sectionData.timeLimit,
        createdAt: new Date(),
        isActive: true,
      };

      await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: true });
      res.json({
        testId,
        testData,
        passageCount: sectionData.totalPassages,
        totalQuestions: sectionData.totalQuestions,
      });
    } catch (error: any) {
      console.error("Listening section generation error:", error);
      res.status(500).json({ message: `리스닝 섹션 생성에 실패했습니다: ${error.message}` });
    }
  });

  app.post("/api/ai/generate-quantitative-section", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { difficulty, questionCount, topic, setTitle } = req.body;
      if (!difficulty) {
        return res.status(400).json({ message: "난이도가 필요합니다." });
      }

      const { generateQuantitativeSection } = await import("../openai");
      const sectionData = await generateQuantitativeSection(difficulty, questionCount || 20, topic);
      const testId = `ai-gre-quantitative-${randomUUID()}`;
      const testData = {
        id: testId,
        title: setTitle || `GRE Quantitative Practice - ${sectionData.totalQuestions} Questions`,
        examType: "gre",
        section: "quantitative",
        difficulty,
        questions: sectionData.questions,
        questionCount: sectionData.totalQuestions,
        timeLimit: sectionData.timeLimit,
        createdAt: new Date(),
        isActive: true,
      };

      await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: true });
      res.json({ testId, testData, questionCount: sectionData.totalQuestions, timeLimit: sectionData.timeLimit });
    } catch (error: any) {
      console.error("Quantitative section generation error:", error);
      res.status(500).json({ message: `수리 추론 섹션 생성에 실패했습니다: ${error.message}` });
    }
  });

  app.post("/api/ai/solve-reading-questions", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { questions, language } = req.body;
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "문제 목록이 필요합니다." });
      }

      const { solveReadingQuestions } = await import("../openai");
      const solutions = await solveReadingQuestions({ questions, language: language || "ko" });
      res.json({ success: true, solutions });
    } catch (error) {
      console.error("Error solving reading questions:", error);
      res.status(500).json({ message: "AI 문제 풀이에 실패했습니다." });
    }
  });

  app.post("/api/ai/generate-sat-math-section", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { difficulty, questionCount, topic, setTitle } = req.body;
      if (!difficulty) {
        return res.status(400).json({ message: "난이도가 필요합니다." });
      }

      const { generateSATMathSection } = await import("../openai");
      const sectionData = await generateSATMathSection(difficulty, questionCount || 22, topic);
      const testId = `ai-sat-math-${randomUUID()}`;
      const testData = {
        id: testId,
        title: setTitle || `SAT Math Practice Test - ${sectionData.totalQuestions} Questions`,
        examType: "sat",
        section: "math",
        difficulty,
        questions: sectionData.questions,
        questionCount: sectionData.totalQuestions,
        timeLimit: sectionData.timeLimit,
        module: sectionData.module,
        createdAt: new Date(),
        isActive: true,
      };

      await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: true });
      res.json({ testId, testData, questionCount: sectionData.totalQuestions, timeLimit: sectionData.timeLimit });
    } catch (error: any) {
      console.error("SAT Math section generation error:", error);
      res.status(500).json({ message: `SAT Math 섹션 생성에 실패했습니다: ${error.message}` });
    }
  });

  app.post("/api/admin/generate-questions", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { examType, section, difficulty, count, topic } = req.body;

      if (!examType || !section || !difficulty || !count) {
        return res.status(400).json({ message: "시험 유형, 섹션, 난이도, 문제 개수가 필요합니다." });
      }
      if (count < 1 || count > 100) {
        return res.status(400).json({ message: "문제 개수는 1개에서 100개 사이여야 합니다." });
      }

      const questions = await generateTestQuestions(examType, section, difficulty, count, topic);
      res.json({ questions });
    } catch (error: any) {
      console.error("Question generation error:", error);
      res.status(500).json({ message: `문제 생성에 실패했습니다: ${error.message}` });
    }
  });

  app.post("/api/admin/generate-image-question", requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "이미지 파일이 필요합니다." });
      }

      const { examType, section, difficulty } = req.body;
      if (!examType || !section || !difficulty) {
        return res.status(400).json({ message: "시험 유형, 섹션, 난이도가 필요합니다." });
      }

      const base64Image = req.file.buffer.toString("base64");
      const question = await generateImageBasedQuestion(base64Image, examType, section, difficulty);
      res.json({ question });
    } catch (error: any) {
      console.error("Image question generation error:", error);
      res.status(500).json({ message: `이미지 기반 문제 생성에 실패했습니다: ${error.message}` });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markMessageAsRead(req.params.id);
      res.json({ message: "Message marked as read" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/performance-analytics", async (_req, res) => {
    try {
      const sampleAnalytics = [
        {
          id: "analytics_1",
          userId: "demo-user",
          examType: "toefl" as const,
          totalScore: 88,
          sectionScores: { reading: 22, listening: 24, speaking: 20, writing: 22 },
          percentile: 50,
          testDate: new Date("2024-01-15"),
          targetScore: 100,
          improvementAreas: ["speaking", "writing"],
          studyRecommendations: "Focus on speaking fluency and essay structure. Practice daily conversations and write timed essays.",
          strengthAreas: ["listening", "reading"],
          weeklyStudyTime: 15,
          studyStreak: 12,
          lastAnalysisDate: new Date(),
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date(),
        },
        {
          id: "analytics_2",
          userId: "demo-user",
          examType: "gre" as const,
          totalScore: 309,
          sectionScores: { verbal: 151, quantitative: 158, writing: 3.5 },
          percentile: 60,
          testDate: new Date("2024-02-01"),
          targetScore: 330,
          improvementAreas: ["verbal", "writing"],
          studyRecommendations: "Build vocabulary with flashcards and practice analytical writing tasks. Focus on reading comprehension strategies.",
          strengthAreas: ["quantitative"],
          weeklyStudyTime: 20,
          studyStreak: 8,
          lastAnalysisDate: new Date(),
          createdAt: new Date("2024-02-01"),
          updatedAt: new Date(),
        },
      ];
      res.json(sampleAnalytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/faqs", async (_req, res) => {
    try {
      const faqs = await storage.getFaqs();
      res.json(faqs);
    } catch {
      res.status(500).json({ error: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/faqs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const result = insertFaqSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      const faq = await storage.createFaq(result.data);
      res.status(201).json(faq);
    } catch {
      res.status(500).json({ error: "Failed to create FAQ" });
    }
  });

  app.put("/api/faqs/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const faq = await storage.updateFaq(req.params.id, req.body);
      res.json(faq);
    } catch {
      res.status(500).json({ error: "Failed to update FAQ" });
    }
  });

  app.delete("/api/faqs/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteFaq(req.params.id);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  });

  app.get("/api/admin/speaking-topics", requireAuth, requireAdmin, async (req, res) => {
    storage
      .getAllSpeakingTopics()
      .then((topics) => res.json(topics))
      .catch((error) => {
        console.error("Error getting speaking topics:", error);
        res.status(500).json({ message: "Failed to get speaking topics" });
      });
  });

  app.post("/api/admin/speaking-topics", requireAuth, requireAdmin, async (req, res) => {
    storage
      .createSpeakingTopic(req.body)
      .then((newTopic) => res.status(201).json(newTopic))
      .catch((error) => {
        console.error("Error creating speaking topic:", error);
        res.status(500).json({ message: "Failed to create speaking topic" });
      });
  });

  app.put("/api/admin/speaking-topics/:id", requireAuth, requireAdmin, async (req, res) => {
    storage
      .updateSpeakingTopic(req.params.id, req.body)
      .then((updatedTopic) => res.json(updatedTopic))
      .catch((error) => {
        console.error("Error updating speaking topic:", error);
        res.status(404).json({ message: "Speaking topic not found" });
      });
  });

  app.delete("/api/admin/speaking-topics/:id", requireAuth, requireAdmin, async (req, res) => {
    storage
      .deleteSpeakingTopic(req.params.id)
      .then((deleted) => {
        if (deleted) {
          res.json({ message: "Speaking topic deleted successfully" });
        } else {
          res.status(404).json({ message: "Speaking topic not found" });
        }
      })
      .catch((error) => {
        console.error("Error deleting speaking topic:", error);
        res.status(500).json({ message: "Failed to delete speaking topic" });
      });
  });

  app.post("/api/ai/generate-topics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { topics, examType, section } = req.body;

      if (!topics || !Array.isArray(topics) || topics.length === 0) {
        return res.status(400).json({ message: "Topics array is required" });
      }
      if (!examType || !section) {
        return res.status(400).json({ message: "Exam type and section are required" });
      }

      let savedItems = [];
      if (examType === "toefl" && section === "speaking") {
        const batchSize = 8;
        const totalBatches = Math.ceil(topics.length / batchSize);
        let allGeneratedQuestions: any[] = [];

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const start = batchIndex * batchSize;
          const end = Math.min(start + batchSize, topics.length);
          const batchTopics = topics.slice(start, end);
          try {
            const batchQuestions = await generateSpeakingQuestions(batchTopics);
            allGeneratedQuestions = allGeneratedQuestions.concat(batchQuestions);
            if (batchIndex < totalBatches - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (batchError) {
            console.error(`Batch ${batchIndex + 1} failed:`, batchError);
          }
        }

        for (let i = 0; i < allGeneratedQuestions.length; i++) {
          const question = allGeneratedQuestions[i];
          try {
            const savedQuestion = await storage.createSpeakingTopic({
              type: question.type || "independent",
              title: question.title || `Speaking Topic ${i + 1}`,
              questionText: question.questionText || question.question || question.prompt || "",
              readingPassage: question.readingPassage || null,
              listeningScript: question.listeningScript || null,
              preparationTime: question.preparationTime || 15,
              responseTime: question.responseTime || 45,
              readingTime: question.readingTime || null,
              isActive: false,
            });
            savedItems.push(savedQuestion);
          } catch (saveError) {
            console.error(`Error saving TOEFL speaking question ${i + 1}:`, saveError);
          }
        }
      } else if (examType === "gre" && section === "writing") {
        const taskType = (req.body.taskType || "issue") as "issue" | "argument";
        const generatedTopics = await generateGREWritingTopics(topics, taskType);

        for (const topic of generatedTopics) {
          try {
            const dbTaskType = topic.type === "argument" ? "analyze_argument" : "analyze_issue";
            const savedTopic = await storage.createGreAnalyticalWritingTest({
              title: topic.title || "GRE Writing Topic",
              taskType: dbTaskType,
              prompt: topic.questionText || "",
              instructions: topic.instructions || "Write a response analyzing the topic.",
              timeLimit: topic.timeLimit || 30,
              sampleEssay: null,
              isActive: true,
            });
            savedItems.push(savedTopic);
          } catch (saveError) {
            console.error("Error saving GRE writing topic:", saveError);
          }
        }
      } else {
        return res.status(400).json({ message: "Unsupported exam type and section combination" });
      }

      res.json({ message: `Successfully generated and saved ${savedItems.length} topics`, items: savedItems });
    } catch (error) {
      console.error("Error generating topics:", error);
      res.status(500).json({ message: "Failed to generate topics" });
    }
  });

  app.post("/api/admin/speaking-topics/generate", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { topics } = req.body;
      if (!topics || !Array.isArray(topics) || topics.length === 0) {
        return res.status(400).json({ message: "Topics array is required" });
      }

      const generatedQuestions = await generateSpeakingQuestions(topics);
      const savedQuestions = [];
      for (const question of generatedQuestions) {
        try {
          const savedQuestion = await storage.createSpeakingTopic({
            type: question.type,
            title: question.title,
            questionText: question.questionText,
            readingPassage: question.readingPassage || null,
            listeningScript: question.listeningScript || null,
            preparationTime: question.preparationTime,
            responseTime: question.responseTime,
            readingTime: question.readingTime || null,
          });
          savedQuestions.push(savedQuestion);
        } catch (saveError) {
          console.error("Error saving question:", saveError);
        }
      }

      res.json({
        message: `Successfully generated and saved ${savedQuestions.length} speaking questions`,
        questions: savedQuestions,
      });
    } catch (error) {
      console.error("Error generating speaking topics:", error);
      res.status(500).json({ message: "Failed to generate speaking topics" });
    }
  });

  app.post("/api/admin/speaking-topics/bulk-generate", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { count = 50 } = req.body;
      const targetCount = Math.min(count, 100);
      const topicCategories = [
        "online learning vs classroom", "homework benefits", "study abroad advantages", "teacher vs self-learning", "technology in education",
        "group projects vs individual work", "extracurricular activities importance", "gap year benefits", "university major choice", "learning a new language",
        "remote work benefits", "job satisfaction vs salary", "career change advantages", "teamwork vs independence", "mentorship importance",
        "work-life balance", "entrepreneurship vs employment", "internship value", "leadership qualities", "job interview tips",
        "social media impact", "smartphones in daily life", "artificial intelligence future", "digital privacy concerns", "video games benefits",
        "e-books vs printed books", "online shopping vs stores", "technology addiction", "automation impact", "virtual reality uses",
        "environmental protection", "renewable energy importance", "recycling habits", "public transportation", "urban vs rural living",
        "climate change solutions", "community volunteering", "cultural diversity benefits", "government responsibility", "charity donations",
        "family traditions importance", "friendship qualities", "travel experiences", "hobbies benefits", "time management tips",
        "healthy lifestyle choices", "stress management", "goal setting importance", "personal growth", "communication skills",
        "morning vs night person", "city life advantages", "pet ownership benefits", "cooking at home vs eating out", "sports participation",
        "music influence on mood", "reading habits", "vacation preferences", "home decoration styles", "shopping habits",
      ];

      const allSavedQuestions = [];
      const batchSize = 10;
      const batches = Math.ceil(targetCount / batchSize);

      for (let i = 0; i < batches && allSavedQuestions.length < targetCount; i++) {
        const batchTopics = [];
        for (let j = 0; j < batchSize; j++) {
          batchTopics.push(topicCategories[Math.floor(Math.random() * topicCategories.length)]);
        }

        try {
          const generatedQuestions = await generateSpeakingQuestions(batchTopics);
          for (const question of generatedQuestions) {
            if (allSavedQuestions.length >= targetCount) break;
            try {
              const savedQuestion = await storage.createSpeakingTopic({
                type: question.type || "independent",
                title: question.title,
                questionText: question.questionText,
                readingPassage: null,
                listeningScript: null,
                preparationTime: question.preparationTime || 15,
                responseTime: question.responseTime || 45,
                readingTime: null,
              });
              allSavedQuestions.push(savedQuestion);
            } catch (saveError) {
              console.error("Error saving question:", saveError);
            }
          }

          if (i < batches - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (batchError) {
          console.error(`Error generating batch ${i + 1}:`, batchError);
        }
      }

      res.json({
        message: `Successfully generated and saved ${allSavedQuestions.length} speaking questions`,
        count: allSavedQuestions.length,
        questions: allSavedQuestions.slice(0, 20),
      });
    } catch (error) {
      console.error("Error bulk generating speaking topics:", error);
      res.status(500).json({ message: "Failed to bulk generate speaking topics" });
    }
  });
}
