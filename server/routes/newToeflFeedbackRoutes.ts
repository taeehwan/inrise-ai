import type { Express } from "express";
import { createActivityEvent } from "../activity-service";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { requireAIAccess } from "../middleware/subscription";
import { aiFeedbackLimiter } from "../middleware/rateLimit";
import { storage } from "../storage";

const buildSentenceFeedbackCache = new Map<string, any>();

const createFeedbackCacheKey = (
  correctSentence: string,
  language: string,
  context?: string,
  correctBlanks?: string,
) => {
  const normalizedSentence = correctSentence.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,!?;:'"]/g, "");
  const normalizedContext = (context || "").toLowerCase().trim().substring(0, 50);
  const normalizedBlanks = (correctBlanks || correctSentence)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:'"]/g, "")
    .substring(0, 100);
  return `build-sentence:${normalizedSentence}:${language}:${normalizedContext}:${normalizedBlanks}`;
};

export async function registerNewToeflFeedbackRoutes(app: Express) {
  const {
    generateSpeakingFeedback,
    generateWritingCompleteSentenceFeedback,
    generateWritingEssayFeedback,
    generateReadingFeedback,
    generateListeningFeedback,
    generateNewToeflSpeakingInterviewFeedback,
    generateNewToeflWritingEmailFeedback,
    generateNewToeflWritingDiscussionFeedback,
    generateNewToeflListenRepeatFeedback,
    generateNewToeflBuildSentenceFeedback,
    computeCorrectOrderFromWords,
  } = await import("../ai-feedback-service");

  app.post("/api/new-toefl/feedback/request", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { testType, testId, questionType, questionId, userAnswer, questionContent, language } = req.body;
      if (!testType || !testId || !questionType || !userAnswer || !questionContent) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const isMasterOrAdmin = user.role === "admin" || user.membershipTier === "master";

      if (isMasterOrAdmin) {
        const { CREDIT_COSTS } = await import("@shared/schema");
        const creditCost = testType === "speaking" ? CREDIT_COSTS.AI_FEEDBACK_SPEAKING : CREDIT_COSTS.AI_FEEDBACK_WRITING;
        const creditResult = await storage.deductCredits(user.id, creditCost, `AI ${testType} feedback - ${questionType}`, "ai_feedback");
        if (!creditResult.success) {
          return res.status(402).json({ message: "Insufficient credits", error: creditResult.error, required: creditCost });
        }

        let feedback;
        let totalScore = 0;
        if (testType === "speaking") {
          feedback = await generateSpeakingFeedback(questionContent, userAnswer, questionType, feedbackLanguage);
          totalScore = Math.round(feedback.totalScore || 0);
        } else if (questionType === "complete_sentence" || questionType === "build_sentence") {
          feedback = await generateWritingCompleteSentenceFeedback(questionContent, userAnswer, "", feedbackLanguage);
        } else {
          feedback = await generateWritingEssayFeedback(questionType, questionContent, userAnswer, feedbackLanguage);
          totalScore = Math.round(feedback.totalScore || 0);
        }

        const feedbackRequest = await storage.createFeedbackRequest({
          userId: user.id,
          testType,
          testId,
          questionType,
          questionId: questionId || 0,
          userAnswer,
          questionContent,
          status: "approved",
          feedback,
          totalScore,
          approvedBy: user.id,
          approvedAt: new Date(),
        });

        return res.json({ immediate: true, feedback, requestId: feedbackRequest.id });
      }

      const feedbackRequest = await storage.createFeedbackRequest({
        userId: user.id,
        testType,
        testId,
        questionType,
        questionId: questionId || 0,
        userAnswer,
        questionContent,
      });

      res.status(201).json({
        immediate: false,
        message: "피드백 요청이 접수되었습니다. 관리자 승인 후 피드백을 확인할 수 있습니다.",
        requestId: feedbackRequest.id,
      });
    } catch (error) {
      console.error("Error creating feedback request:", error);
      res.status(500).json({ message: "피드백 요청 생성에 실패했습니다" });
    }
  });

  app.get("/api/new-toefl/feedback/my-requests", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      res.json(await storage.getUserFeedbackRequests(user.id));
    } catch (error) {
      console.error("Error fetching user feedback requests:", error);
      res.status(500).json({ message: "Failed to fetch feedback requests" });
    }
  });

  app.get("/api/new-toefl/feedback/check", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { testType, testId, questionId } = req.query;
      const requests = await storage.getUserFeedbackRequests(user.id);
      const match = requests.find((r) => {
        const qIdMatch = questionId !== undefined ? String(r.questionId) === String(questionId) : true;
        const testIdMatch = testId ? r.testId === testId : true;
        const typeMatch = testType ? r.testType === testType : true;
        return qIdMatch && testIdMatch && typeMatch;
      });
      if (!match) return res.json({ exists: false });
      res.json({
        exists: true,
        status: match.status,
        feedback: match.status === "approved" ? match.feedback : null,
        totalScore: match.totalScore,
      });
    } catch (error) {
      console.error("Error checking feedback status:", error);
      res.status(500).json({ message: "Failed to check feedback status" });
    }
  });

  app.get("/api/new-toefl/feedback/approved", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      res.json(await storage.getApprovedFeedbackForUser(user.id));
    } catch (error) {
      console.error("Error fetching approved feedback:", error);
      res.status(500).json({ message: "Failed to fetch approved feedback" });
    }
  });

  app.get("/api/user/recent-feedbacks", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { section, testType, limit: limitParam } = req.query;
      let filteredFeedback = await storage.getApprovedFeedbackForUser(user.id);
      if (section && typeof section === "string") {
        filteredFeedback = filteredFeedback.filter((fb) => (fb.questionType ?? "").toLowerCase().includes(section.toLowerCase()));
      }
      if (testType && typeof testType === "string") {
        filteredFeedback = filteredFeedback.filter((fb) => (fb.testType ?? "").toLowerCase() === testType.toLowerCase());
      }

      const limit = limitParam ? parseInt(limitParam as string) : 50;
      const recentFeedbacks = filteredFeedback
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
        .map((fb) => {
          let feedbackSummary = "";
          if (fb.feedback && typeof fb.feedback === "object") {
            const feedbackData = fb.feedback as any;
            feedbackSummary =
              feedbackData.overallComment ||
              feedbackData.explanation ||
              feedbackData.languageUse?.comment ||
              "인라이즈 피드백이 제공되었습니다.";
          }

          const qType = (fb.questionType || "").toLowerCase();
          let sectionCategory = "other";
          if (qType.includes("speaking") || qType.includes("interview") || qType.includes("listen-repeat") || qType.includes("build-sentence")) {
            sectionCategory = "speaking";
          } else if (qType.includes("writing") || qType.includes("integrated") || qType.includes("discussion") || qType.includes("essay") || qType.includes("email")) {
            sectionCategory = "writing";
          } else if (qType.includes("reading")) {
            sectionCategory = "reading";
          } else if (qType.includes("listening") || qType === "listening") {
            sectionCategory = "listening";
          }

          return {
            id: fb.id,
            testType: fb.testType,
            section: fb.questionType,
            sectionCategory,
            score: fb.totalScore || 0,
            feedback: feedbackSummary,
            questionContent: fb.questionContent,
            userAnswer: fb.userAnswer,
            createdAt: fb.createdAt,
          };
        });

      res.json(recentFeedbacks);
    } catch (error) {
      console.error("Error fetching recent feedbacks:", error);
      res.status(500).json({ message: "Failed to fetch recent feedbacks" });
    }
  });

  app.get("/api/admin/feedback/pending", requireAuth, requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getPendingFeedbackRequests());
    } catch (error) {
      console.error("Error fetching pending feedback requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.post("/api/admin/feedback/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const admin = req.user as any;
      const request = await storage.getFeedbackRequest(id);
      if (!request) return res.status(404).json({ message: "Feedback request not found" });
      if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

      let feedback;
      let totalScore = 0;
      if (process.env.QA_MOCK_EXTERNALS === "1") {
        if (request.testType === "speaking") {
          feedback = {
            totalScore: 24,
            overallComment: "QA mock speaking feedback approved successfully.",
            languageUse: { score: 4, comment: "Language use is clear and sufficient for the mock flow." },
            logic: { score: 4, comment: "Reasoning is coherent in the mock scenario." },
            delivery: { score: 4, comment: "Delivery is stable in the mock scenario." },
            modelAnswer: "This is a QA mock model answer.",
            sentenceBysentenceFeedback: [],
          };
          totalScore = 24;
        } else if (request.questionType === "complete_sentence" || request.questionType === "build_sentence") {
          feedback = {
            correctAnswer: request.questionContent,
            explanation: "QA mock complete-sentence feedback approved successfully.",
            userMistakes: "No additional mock mistakes.",
          };
        } else {
          feedback = {
            totalScore: 26,
            overallComment: "QA mock writing feedback approved successfully.",
            taskAchievement: { score: 4, comment: "Task achievement looks good in the mock scenario." },
            languageUse: { score: 4, comment: "Language use is adequate in the mock scenario." },
            coherence: { score: 4, comment: "Coherence is acceptable in the mock scenario." },
            modelAnswer: "This is a QA mock writing model answer.",
          };
          totalScore = 26;
        }
      } else if (request.testType === "speaking") {
        feedback = await generateSpeakingFeedback(request.questionContent, request.userAnswer, request.questionType);
        totalScore = Math.round(feedback.totalScore || 0);
      } else if (request.questionType === "complete_sentence" || request.questionType === "build_sentence") {
        feedback = await generateWritingCompleteSentenceFeedback(request.questionContent, request.userAnswer, "");
      } else {
        feedback = await generateWritingEssayFeedback(request.questionType, request.questionContent, request.userAnswer);
        totalScore = Math.round(feedback.totalScore || 0);
      }

      res.json(await storage.approveFeedbackRequest(id, admin.id, feedback, totalScore));
    } catch (error) {
      console.error("Error approving feedback request:", error);
      res.status(500).json({ message: "Failed to approve feedback request" });
    }
  });

  app.post("/api/admin/feedback/:id/reject", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const admin = req.user as any;
      const request = await storage.getFeedbackRequest(id);
      if (!request) return res.status(404).json({ message: "Feedback request not found" });
      res.json(await storage.rejectFeedbackRequest(id, admin.id));
    } catch (error) {
      console.error("Error rejecting feedback request:", error);
      res.status(500).json({ message: "Failed to reject feedback request" });
    }
  });

  app.post("/api/new-toefl/feedback/reading", requireAuth, requireAIAccess, aiFeedbackLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { question, options, userAnswer, correctAnswer, passage, language, testId, questionId } = req.body;
      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const feedback = await generateReadingFeedback(question, options, userAnswer, correctAnswer, passage, feedbackLanguage);

      try {
        await storage.createFeedbackRequest({
          userId: user.id,
          testType: "writing",
          testId: testId || `reading-${Date.now()}`,
          questionType: "reading",
          questionId: questionId || `q-${Date.now()}`,
          userAnswer,
          questionContent: question,
          status: "approved",
          feedback,
          totalScore: feedback.isCorrect ? 1 : 0,
          approvedBy: "system",
          approvedAt: new Date(),
        });
      } catch (saveError) {
        console.error("Warning: Failed to save reading feedback to collection:", saveError);
      }
      try {
        await storage.createUserActivity({ userId: user.id, activityType: "ai_feedback_reading", details: { testId, questionId }, duration: 0 });
      } catch {}
      try {
        const uName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email?.split("@")[0] || "익명";
        await createActivityEvent({ userId: user.id, displayName: uName, eventType: "test_complete", section: "reading", score: feedback.isCorrect ? 100 : 0 });
      } catch {}
      res.json(feedback);
    } catch (error) {
      console.error("Error generating reading feedback:", error);
      res.status(500).json({ message: "Failed to generate reading feedback" });
    }
  });

  app.post("/api/new-toefl/feedback/listening", requireAuth, requireAIAccess, aiFeedbackLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { question, options, userAnswer, correctAnswer, dialogue, language, testId, questionId } = req.body;
      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const feedback = await generateListeningFeedback(question, options, userAnswer, correctAnswer, dialogue, feedbackLanguage);

      try {
        await storage.createFeedbackRequest({
          userId: user.id,
          testType: "writing",
          testId: testId || `listening-${Date.now()}`,
          questionType: "listening",
          questionId: questionId || `q-${Date.now()}`,
          userAnswer,
          questionContent: question,
          status: "approved",
          feedback,
          totalScore: feedback.isCorrect ? 1 : 0,
          approvedBy: "system",
          approvedAt: new Date(),
        });
      } catch (saveError) {
        console.error("Warning: Failed to save listening feedback to collection:", saveError);
      }
      try {
        await storage.createUserActivity({ userId: user.id, activityType: "ai_feedback_listening", details: { testId, questionId }, duration: 0 });
      } catch {}
      try {
        const uName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email?.split("@")[0] || "익명";
        await createActivityEvent({ userId: user.id, displayName: uName, eventType: "test_complete", section: "listening", score: feedback.isCorrect ? 100 : 0 });
      } catch {}
      res.json(feedback);
    } catch (error) {
      console.error("Error generating listening feedback:", error);
      res.status(500).json({ message: "Failed to generate listening feedback" });
    }
  });

  app.post("/api/new-toefl/feedback/speaking-interview", requireAuth, requireAIAccess, aiFeedbackLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { question, userAnswer, language, speechMetrics, testId, questionId } = req.body;
      if (!question || !userAnswer) {
        return res.status(400).json({ message: "Missing required fields: question and userAnswer" });
      }
      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const feedback = await generateNewToeflSpeakingInterviewFeedback(question, userAnswer, feedbackLanguage, speechMetrics);

      try {
        await storage.createFeedbackRequest({
          userId: user.id,
          testType: "speaking",
          testId: testId || `speaking-interview-${Date.now()}`,
          questionType: "speaking-interview",
          questionId: questionId || `q-${Date.now()}`,
          userAnswer,
          questionContent: question,
          status: "approved",
          feedback,
          totalScore: Math.round(feedback.totalScore || 0),
          approvedBy: "system",
          approvedAt: new Date(),
        });
      } catch (saveError) {
        console.error("Warning: Failed to save feedback to collection:", saveError);
      }
      try {
        await storage.createUserActivity({ userId: user.id, activityType: "ai_feedback_speaking", details: { testId, questionId }, duration: 0 });
      } catch {}
      try {
        const uName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email?.split("@")[0] || "익명";
        await createActivityEvent({ userId: user.id, displayName: uName, eventType: "test_complete", section: "speaking", score: Math.round(feedback.totalScore ?? 0) });
      } catch {}
      res.json(feedback);
    } catch (error) {
      console.error("Error generating 2026 TOEFL speaking interview feedback:", error);
      res.status(500).json({ message: "Failed to generate speaking interview feedback" });
    }
  });

  app.post("/api/new-toefl/feedback/writing-email", requireAuth, requireAIAccess, aiFeedbackLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { scenario, recipient, keyPoints, userSubject, userBody, language, testId, questionId } = req.body;
      if (!scenario || !recipient || !userBody) {
        return res.status(400).json({ message: "Missing required fields: scenario, recipient, and userBody" });
      }
      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")), 65000),
      );
      const feedback = await Promise.race([
        generateNewToeflWritingEmailFeedback(scenario, recipient, keyPoints || [], userSubject || "", userBody, feedbackLanguage),
        timeoutPromise,
      ]);

      try {
        const fullUserAnswer = userSubject ? `Subject: ${userSubject}\n\n${userBody}` : userBody;
        await storage.createFeedbackRequest({
          userId: user.id,
          testType: "writing",
          testId: testId || `writing-email-${Date.now()}`,
          questionType: "writing-email",
          questionId: typeof questionId === "number" ? questionId : 0,
          userAnswer: fullUserAnswer,
          questionContent: `Scenario: ${scenario}\nRecipient: ${recipient}\nKey Points: ${(keyPoints || []).join(", ")}`,
          status: "approved",
          feedback,
          totalScore: Math.round((feedback as any).totalScore || 0),
          approvedBy: "system",
          approvedAt: new Date(),
        });
      } catch (saveError) {
        console.error("Warning: Failed to save feedback to collection:", saveError);
      }
      try {
        await storage.createUserActivity({ userId: user.id, activityType: "ai_feedback_writing", details: { testId, questionId, type: "email" }, duration: 0 });
      } catch {}
      try {
        const uName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email?.split("@")[0] || "익명";
        await createActivityEvent({ userId: user.id, displayName: uName, eventType: "test_complete", section: "writing", score: Math.round((feedback as any).totalScore ?? 0) });
      } catch {}
      res.json(feedback);
    } catch (error: any) {
      console.error("Error generating 2026 TOEFL writing email feedback:", error);
      const message = error?.message?.includes("시간이 초과") || error?.message?.includes("timeout")
        ? "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
        : "피드백 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
      res.status(500).json({ message });
    }
  });

  app.post("/api/new-toefl/feedback/writing-discussion", requireAuth, requireAIAccess, aiFeedbackLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { topic, professorPrompt, otherPosts, userResponse, language, testId, questionId } = req.body;
      if (!topic || !professorPrompt || !userResponse) {
        return res.status(400).json({ message: "Missing required fields: topic, professorPrompt, and userResponse" });
      }
      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")), 65000),
      );
      const feedback = await Promise.race([
        generateNewToeflWritingDiscussionFeedback(topic, professorPrompt, otherPosts || [], userResponse, feedbackLanguage),
        timeoutPromise,
      ]);

      try {
        await storage.createFeedbackRequest({
          userId: user.id,
          testType: "writing",
          testId: testId || `writing-discussion-${Date.now()}`,
          questionType: "writing-discussion",
          questionId: typeof questionId === "number" ? questionId : 0,
          userAnswer: userResponse,
          questionContent: `Topic: ${topic}\n\nProfessor: ${professorPrompt}`,
          status: "approved",
          feedback,
          totalScore: Math.round((feedback as any).totalScore || 0),
          approvedBy: "system",
          approvedAt: new Date(),
        });
      } catch (saveError) {
        console.error("Warning: Failed to save feedback to collection:", saveError);
      }
      try {
        await storage.createUserActivity({ userId: user.id, activityType: "ai_feedback_writing", details: { testId, questionId, type: "discussion" }, duration: 0 });
      } catch {}
      try {
        const uName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email?.split("@")[0] || "익명";
        await createActivityEvent({ userId: user.id, displayName: uName, eventType: "test_complete", section: "writing", score: Math.round((feedback as any).totalScore ?? 0) });
      } catch {}
      res.json(feedback);
    } catch (error: any) {
      console.error("Error generating 2026 TOEFL writing discussion feedback:", error);
      const message = error?.message?.includes("시간이 초과") || error?.message?.includes("timeout")
        ? "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
        : "피드백 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
      res.status(500).json({ message });
    }
  });

  app.post("/api/new-toefl/feedback/listen-repeat", requireAuth, requireAIAccess, aiFeedbackLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { originalSentence, userSpeech, language, testId, questionId } = req.body;
      if (!originalSentence || !userSpeech) {
        return res.status(400).json({ message: "Missing required fields: originalSentence and userSpeech" });
      }
      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const feedback = await generateNewToeflListenRepeatFeedback(originalSentence, userSpeech, feedbackLanguage);

      try {
        await storage.createFeedbackRequest({
          userId: user.id,
          testType: "speaking",
          testId: testId || `listen-repeat-${Date.now()}`,
          questionType: "listen-repeat",
          questionId: typeof questionId === "number" ? questionId : 0,
          userAnswer: userSpeech,
          questionContent: `Listen & Repeat: ${originalSentence}`,
          status: "approved",
          feedback,
          totalScore: Math.round((feedback as any).accuracyScore || 0),
          approvedBy: "system",
          approvedAt: new Date(),
        });
      } catch (saveError) {
        console.error("Warning: Failed to save feedback to collection:", saveError);
      }
      res.json(feedback);
    } catch (error) {
      console.error("Error generating Listen & Repeat feedback:", error);
      res.status(500).json({ message: "Failed to generate Listen & Repeat feedback" });
    }
  });

  app.post("/api/new-toefl/feedback/build-sentence", requireAuth, requireAIAccess, aiFeedbackLimiter, async (req, res) => {
    try {
      const user = req.user as any;
      const { correctSentence, userSentence, context, language, correctBlanks, userBlanks, useCache, testId, questionId } = req.body;
      if (!correctSentence || !userSentence) {
        return res.status(400).json({ message: "Missing required fields: correctSentence and userSentence" });
      }
      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const cacheKey = createFeedbackCacheKey(correctSentence, feedbackLanguage, context, correctBlanks);
      const cachedFeedback = buildSentenceFeedbackCache.get(cacheKey);

      if (cachedFeedback && useCache !== false) {
        const normalizeBlankText = (text: string) => text.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,!?;:]/g, "");
        const correctBlankNormalized = correctBlanks ? normalizeBlankText(correctBlanks) : normalizeBlankText(correctSentence);
        const userBlankNormalized = userBlanks ? normalizeBlankText(userBlanks) : normalizeBlankText(userSentence);
        const isCorrect = correctBlankNormalized === userBlankNormalized;

        try {
          await storage.createFeedbackRequest({
            userId: user.id,
            testType: "speaking",
            testId: testId || `build-sentence-${Date.now()}`,
            questionType: "build-sentence",
            questionId: typeof questionId === "number" ? questionId : 0,
            userAnswer: userSentence,
            questionContent: `Build a Sentence: ${correctSentence}`,
            status: "approved",
            feedback: { ...cachedFeedback, isCorrect },
            totalScore: isCorrect ? 1 : 0,
            approvedBy: "system",
            approvedAt: new Date(),
          });
        } catch (saveError) {
          console.error("Warning: Failed to save cached feedback to collection:", saveError);
        }

        return res.json({ ...cachedFeedback, isCorrect, userSentence });
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")), 65000),
      );
      const feedback = await Promise.race([
        generateNewToeflBuildSentenceFeedback(correctSentence, userSentence, context || "", feedbackLanguage, correctBlanks || "", userBlanks || ""),
        timeoutPromise,
      ]);

      buildSentenceFeedbackCache.set(cacheKey, {
        correctSentence: (feedback as any).correctSentence,
        explanation: (feedback as any).explanation,
        grammarPoints: (feedback as any).grammarPoints,
      });

      try {
        await storage.createFeedbackRequest({
          userId: user.id,
          testType: "speaking",
          testId: testId || `build-sentence-${Date.now()}`,
          questionType: "build-sentence",
          questionId: typeof questionId === "number" ? questionId : 0,
          userAnswer: userSentence,
          questionContent: `Build a Sentence: ${correctSentence}`,
          status: "approved",
          feedback,
          totalScore: (feedback as any).isCorrect ? 1 : 0,
          approvedBy: "system",
          approvedAt: new Date(),
        });
      } catch (saveError) {
        console.error("Warning: Failed to save feedback to collection:", saveError);
      }
      res.json(feedback);
    } catch (error: any) {
      console.error("Error generating Build a Sentence feedback:", error);
      const message = error?.message?.includes("시간이 초과") || error?.message?.includes("timeout")
        ? "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
        : "피드백 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
      res.status(500).json({ message });
    }
  });

  app.post("/api/new-toefl/auto-solve/build-sentence", requireAuth, async (req, res) => {
    try {
      const { words, correctOrder, context, language } = req.body;
      if (!words || !Array.isArray(words) || !correctOrder || !Array.isArray(correctOrder)) {
        return res.status(400).json({ message: "Missing required fields: words and correctOrder arrays" });
      }
      if (words.length !== correctOrder.length) {
        return res.status(400).json({ message: "words and correctOrder arrays must have the same length" });
      }
      for (const idx of correctOrder) {
        if (typeof idx !== "number" || idx < 0 || idx >= words.length) {
          return res.status(400).json({ message: `Invalid index in correctOrder: ${idx}. Must be 0-${words.length - 1}` });
        }
      }

      const validLanguages = ["ko", "ja", "en", "th"] as const;
      const feedbackLanguage = validLanguages.includes(language) ? language : "ko";
      const correctSentence = correctOrder.map((idx: number) => words[idx]).join(" ");
      const cacheKey = createFeedbackCacheKey(correctSentence, feedbackLanguage, context);
      const cachedFeedback = buildSentenceFeedbackCache.get(cacheKey);
      if (cachedFeedback) {
        return res.json({ correctSentence, correctOrder, ...cachedFeedback, isCorrect: true });
      }

      const feedback = await generateNewToeflBuildSentenceFeedback(correctSentence, correctSentence, context || "", feedbackLanguage, correctSentence, correctSentence);
      buildSentenceFeedbackCache.set(cacheKey, {
        correctSentence: (feedback as any).correctSentence,
        explanation: (feedback as any).explanation,
        grammarPoints: (feedback as any).grammarPoints,
      });

      res.json({ ...(feedback as any), correctOrder });
    } catch (error) {
      console.error("Error auto-solving Build a Sentence:", error);
      res.status(500).json({ message: "Failed to auto-solve Build a Sentence" });
    }
  });

  app.post("/api/new-toefl/compute-correct-order", requireAuth, async (req, res) => {
    try {
      const { words, context, sentenceTemplate } = req.body;
      if (!words || !Array.isArray(words) || words.length === 0) {
        return res.status(400).json({ message: "Missing required field: words array" });
      }
      res.json(await computeCorrectOrderFromWords(words, context, sentenceTemplate));
    } catch (error) {
      console.error("Error computing correct order:", error);
      res.status(500).json({ message: "Failed to compute correct order" });
    }
  });

  app.post("/api/admin/recalculate-build-sentence-answers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allTests = await storage.getAllAIGeneratedTests();
      const writingTests = allTests.filter((test: any) => {
        const testData = test.testData || test;
        return (testData.examType === "new-toefl" || testData.test_type === "new-toefl" || test.test_type === "new-toefl") &&
          (testData.section === "writing" || test.section === "writing");
      });

      const results: { testId: string; title: string; updated: number; errors: string[] }[] = [];
      for (const test of writingTests) {
        const testData = test.testData || test;
        const testId = test.id || testData.id;
        const title = testData.title || test.title || "Untitled";
        const testResult = { testId, title, updated: 0, errors: [] as string[] };
        try {
          const questions = testData.questions || [];
          let hasChanges = false;
          const forceRecalculate = req.body?.forceRecalculate === true;
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!Array.isArray(q.words) || q.words.length === 0) continue;
            if (!forceRecalculate && Array.isArray(q.correctOrder) && q.correctOrder.length === q.words.length) {
              const isValid = q.correctOrder.every((idx: any) => typeof idx === "number" && idx >= 0 && idx < q.words.length);
              if (isValid) continue;
            }

            try {
              const result = await computeCorrectOrderFromWords(q.words, q.contextSentence || q.context || q.answer, q.sentenceTemplate);
              if (result.hasGrammarIssues) {
                const existingIsValid =
                  Array.isArray(q.correctOrder) &&
                  q.correctOrder.length === q.words.length &&
                  q.correctOrder.every((idx: any) => typeof idx === "number" && idx >= 0 && idx < q.words.length);
                if (existingIsValid) continue;
              }
              questions[i] = {
                ...q,
                correctOrder: result.correctOrder,
                contextSentence: result.contextSentence,
                correctSentence: result.correctSentence,
                needsReview: result.hasGrammarIssues,
              };
              hasChanges = true;
              testResult.updated++;
            } catch (qError: any) {
              testResult.errors.push(`Question ${i + 1}: ${qError.message}`);
            }
          }
          if (hasChanges) {
            await storage.updateAIGeneratedTest(testId, { testData: { ...testData, questions } });
          }
        } catch (testError: any) {
          testResult.errors.push(`Test error: ${testError.message}`);
        }
        results.push(testResult);
      }

      const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      res.json({
        success: true,
        summary: {
          testsProcessed: writingTests.length,
          questionsUpdated: totalUpdated,
          errorsCount: totalErrors,
        },
        details: results,
      });
    } catch (error) {
      console.error("Error recalculating Build a Sentence answers:", error);
      res.status(500).json({ message: "Failed to recalculate Build a Sentence answers" });
    }
  });
}
