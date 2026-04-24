import type { Express } from "express";
import OpenAI from "openai";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { aiFeedbackLimiter, aiSttLimiter } from "../middleware/rateLimit";
import { storage } from "../storage";
import { OPENAI_TTS_MODEL } from "../openaiModels";
import { generateSolutionExplanation } from "../openai";
import { parseDialogueSegments, stripSpeakerLabels } from "../lib/audioText";
import { generateMultiVoiceConversationAudio } from "../lib/ttsAudio";
import { sanitizeUploadedFilename } from "../lib/uploadFilename";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function registerSpeakingAudioRoutes(app: Express) {
  const isQaMock = () => process.env.QA_MOCK_EXTERNALS === "1";

  app.get("/api/speaking-tests", async (_req, res) => {
    try {
      res.json(await storage.getSpeakingTests());
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/speaking-tests/:id", async (req, res) => {
    try {
      let test: any = await storage.getSpeakingTestById(req.params.id);
      if (!test) {
        const aiTest = await storage.getAIGeneratedTestById(req.params.id);
        if (aiTest && aiTest.section === "speaking") {
          const question = aiTest.questions?.[0] || {};
          test = {
            id: aiTest.id,
            title: aiTest.title,
            type: question.speakingType || "integrated",
            questionType: "speaking",
            description: aiTest.description || `AI-generated ${question.speakingType || "integrated"} speaking task`,
            topic: question.readingPassageTitle || aiTest.title,
            readingPassage: question.readingPassage,
            readingPassageTitle: question.readingPassageTitle,
            readingTime: question.readingTime || 45,
            listeningAudioUrl: question.listeningAudioUrl,
            listeningScript: question.listeningScript,
            questionText: question.questionText,
            questionAudioUrl: question.questionAudioUrl,
            preparationTime: question.preparationTime || 30,
            responseTime: question.responseTime || 60,
            sampleAnswer: question.sampleAnswer,
            isActive: aiTest.isActive !== false,
            createdAt: aiTest.createdAt,
          };
        }
      }
      if (!test) {
        return res.status(404).json({ message: "Speaking test not found" });
      }

      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }

      if (test.listeningScript && !test.listeningAudioUrl) {
        const audioFileName = `listening_${test.id}.mp3`;
        const audioFilePath = path.join(uploadsDir, audioFileName);
        if (existsSync(audioFilePath)) {
          test.listeningAudioUrl = `/uploads/${audioFileName}`;
        } else {
          try {
            const rawListeningScript = typeof test.listeningScript === "string" ? test.listeningScript : JSON.stringify(test.listeningScript);
            const hasMultiSpeaker = parseDialogueSegments(rawListeningScript).length > 1;
            let audioBuffer: Buffer;
            if (hasMultiSpeaker) {
              audioBuffer = await generateMultiVoiceConversationAudio(rawListeningScript);
            } else {
              const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
              const mp3 = await openaiClient.audio.speech.create({
                model: OPENAI_TTS_MODEL,
                voice: "nova" as any,
                input: stripSpeakerLabels(rawListeningScript).substring(0, 4096),
                speed: 1.0,
              });
              audioBuffer = Buffer.from(await mp3.arrayBuffer());
            }
            await fs.writeFile(audioFilePath, audioBuffer);
            test.listeningAudioUrl = `/uploads/${audioFileName}`;
          } catch (error) {
            console.error(`Failed to generate listening audio for ${test.id}:`, error);
          }
        }
      }

      if (test.questionText && !test.questionAudioUrl) {
        const audioFileName = `question_${test.id}.mp3`;
        const audioFilePath = path.join(uploadsDir, audioFileName);
        if (existsSync(audioFilePath)) {
          test.questionAudioUrl = `/uploads/${audioFileName}`;
        } else {
          try {
            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const cleanQuestion = typeof test.questionText === "string" ? test.questionText : JSON.stringify(test.questionText);
            const mp3 = await openaiClient.audio.speech.create({
              model: OPENAI_TTS_MODEL,
              voice: "nova" as any,
              input: cleanQuestion.substring(0, 4096),
              speed: 1.0,
            });
            await fs.writeFile(audioFilePath, Buffer.from(await mp3.arrayBuffer()));
            test.questionAudioUrl = `/uploads/${audioFileName}`;
          } catch (error) {
            console.error(`Failed to generate question audio for ${test.id}:`, error);
          }
        }
      }

      res.json(test);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/speaking-attempts", requireAuth, upload.single("audio"), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { testId, transcription, feedback } = req.body;
      let recordingUrl = null;
      if (req.file) {
        recordingUrl = `/uploads/audio/${Date.now()}_${sanitizeUploadedFilename(req.file.originalname, ".webm")}`;
      }

      res.status(201).json(
        await storage.createSpeakingAttempt({
          userId,
          testId,
          recordingUrl,
          transcription: transcription || null,
          feedback: feedback || null,
        }),
      );
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/speaking-analysis", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const { transcription, question, readingPassage, listeningScript } = req.body;
      if (!transcription || !question) {
        return res.status(400).json({ message: "Transcription and question are required" });
      }

      const feedbackPrompt = `
        You are an expert TOEFL Speaking assessor. Analyze this integrated speaking response and provide detailed feedback.
        Question: ${question}
        Reading Passage: ${readingPassage || "N/A"}
        Listening Script: ${listeningScript || "N/A"}
        Student Response: ${transcription}
      `;

      const modelAnswerPrompt = `
        Provide a high-scoring model answer for this TOEFL integrated speaking question:
        Question: ${question}
        Reading Passage: ${readingPassage || "N/A"}
        Listening Script: ${listeningScript || "N/A"}
      `;

      const feedback = await generateSolutionExplanation(feedbackPrompt, question, transcription, "integrated");
      const modelAnswer = await generateSolutionExplanation(modelAnswerPrompt, question, "", "integrated");
      res.json({
        feedback: feedback || "Feedback is being generated...",
        modelAnswer: modelAnswer || "Model answer is being generated...",
        score: Math.floor(Math.random() * 5) + 20,
      });
    } catch (error: any) {
      console.error("Speaking analysis error:", error);
      res.status(500).json({ message: "Failed to analyze response" });
    }
  });

  app.post("/api/speech-to-text", requireAuth, aiSttLimiter, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      if (isQaMock()) {
        return res.json({
          transcript: "QA mock transcript generated for smoke verification.",
          confidence: 0.99,
          success: true,
        });
      }

      const useEnhanced = req.body?.enhanced === "true" || req.query?.enhanced === "true";
      if (useEnhanced) {
        const { generateSpeechToTextWithAnalysis } = await import("../openai");
        const speechMetrics = await generateSpeechToTextWithAnalysis(req.file.buffer);
        return res.json({
          transcript: speechMetrics.transcript,
          confidence: speechMetrics.pronunciationConfidence,
          success: true,
          speechMetrics: {
            duration: speechMetrics.duration,
            wordCount: speechMetrics.wordCount,
            wordsPerMinute: speechMetrics.wordsPerMinute,
            pauseCount: speechMetrics.pauseCount,
            avgPauseDuration: speechMetrics.avgPauseDuration,
            longestPause: speechMetrics.longestPause,
            hesitationMarkers: speechMetrics.hesitationMarkers,
            selfCorrections: speechMetrics.selfCorrections,
            speechRate: speechMetrics.speechRate,
            fluencyScore: speechMetrics.fluencyScore,
            pronunciationConfidence: speechMetrics.pronunciationConfidence,
          },
        });
      }

      const { generateSpeechToText } = await import("../openai");
      const transcript = await generateSpeechToText(req.file.buffer);
      res.json({ transcript, confidence: 0.95, success: true });
    } catch (error: any) {
      console.error("Speech to text error:", error);
      res.json({
        transcript:
          "I believe that working in a team environment offers significant advantages over individual work. Team collaboration allows for the sharing of diverse perspectives and ideas, which often leads to more creative and comprehensive solutions. Additionally, when facing complex challenges, team members can pool their knowledge and skills to overcome obstacles more efficiently than a single person working alone.",
        confidence: 0.85,
        success: false,
        note: "Using fallback transcript due to service issues",
      });
    }
  });

  app.post("/api/speech-to-text-enhanced", requireAuth, aiSttLimiter, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

       if (isQaMock()) {
        return res.json({
          success: true,
          transcript: "QA mock enhanced transcript generated for smoke verification.",
          speechMetrics: {
            transcript: "QA mock enhanced transcript generated for smoke verification.",
            duration: 6.5,
            wordCount: 9,
            wordsPerMinute: 83,
            pauseCount: 1,
            avgPauseDuration: 0.3,
            longestPause: 0.3,
            hesitationMarkers: 0,
            selfCorrections: 0,
            speechRate: "steady",
            fluencyScore: 4,
            pronunciationConfidence: 0.98,
          },
        });
      }

      const { generateSpeechToTextWithAnalysis } = await import("../openai");
      const speechMetrics = await generateSpeechToTextWithAnalysis(req.file.buffer);
      res.json({ success: true, transcript: speechMetrics.transcript, speechMetrics });
    } catch (error: any) {
      console.error("Enhanced speech to text error:", error);
      res.status(500).json({ success: false, error: "Failed to analyze audio", message: error.message });
    }
  });

  app.post("/api/speaking/feedback", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const { questionText, transcript, testType, speechMetrics } = req.body;
      if (!questionText || !transcript) {
        return res.status(400).json({ error: "Question text and transcript are required" });
      }

      if (isQaMock()) {
        return res.json({
          overallAssessment: "QA mock feedback generated successfully.",
          delivery: { score: 4, feedback: "Delivery is stable in the QA mock flow." },
          languageUse: { score: 4, feedback: "Language use is sufficient in the QA mock flow." },
          topicDevelopment: { score: 4, feedback: "Topic development is coherent in the QA mock flow." },
          sentenceBysentenceFeedback: [
            {
              original: transcript,
              corrected: transcript,
              explanation: "QA mock flow keeps the transcript unchanged.",
            },
          ],
          improvedModelAnswer: "This is a QA mock improved model answer.",
          scores: {
            delivery: 4,
            languageUse: 4,
            topicDevelopment: 4,
            overall: 4,
            predictedToeflScore: 24,
          },
          speechMetrics: speechMetrics || null,
          error: false,
          testType: testType || "independent",
        });
      }

      const { generateSpeakingFeedback } = await import("../openai");
      res.json(await generateSpeakingFeedback(questionText, transcript, testType || "independent", speechMetrics));
    } catch (error: any) {
      console.error("Speaking feedback error:", error);
      res.json({
        overallAssessment: "피드백 생성 중 일시적인 오류가 발생했습니다. 이 점수는 기본값이며, 실제 응답과 관련이 없습니다. 다시 시도해주세요.",
        delivery: {
          score: 2,
          feedback: "Delivery(발화) 평가: 일시적 오류로 피드백을 생성할 수 없습니다.",
        },
        languageUse: {
          score: 2,
          feedback: "Language Use(언어 사용) 평가: 일시적 오류로 피드백을 생성할 수 없습니다.",
        },
        topicDevelopment: {
          score: 2,
          feedback: "Topic Development(내용 전개) 평가: 일시적 오류로 피드백을 생성할 수 없습니다.",
        },
        sentenceBysentenceFeedback: [
          {
            original: "(일시적 오류로 문장별 피드백을 제공할 수 없습니다)",
            corrected: "(다시 시도해주세요)",
            explanation: "네트워크 또는 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          },
        ],
        improvedModelAnswer: "일시적 오류로 모범 답안을 생성할 수 없습니다. 다시 시도해주세요.",
        scores: {
          delivery: 2,
          languageUse: 2,
          topicDevelopment: 2,
          overall: 2,
          predictedToeflScore: 15,
        },
        error: true,
        errorMessage: error.message || "Unknown error",
      });
    }
  });
}
