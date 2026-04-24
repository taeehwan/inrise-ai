import type { Express } from "express";
import OpenAI from "openai";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { aiFeedbackLimiter, aiGenerationLimiter, aiTtsLimiter } from "../middleware/rateLimit";
import { storage } from "../storage";
import { getOpenAIModel, OPENAI_TTS_MODEL } from "../openaiModels";
import { generateReadingSolution, generateSolutionExplanation } from "../openai";
import {
  buildChooseResponseQuestionText,
  getSpeakerGender,
  parseDialogueSegments,
  stripSpeakerLabels,
} from "../lib/audioText";
import {
  buildChooseResponseAudio,
  generateMultiVoiceConversationAudio,
  generateTTSAudio,
  getExactAudioDurationMs,
} from "../lib/ttsAudio";

export function registerAiLearningRoutes(app: Express, openai: OpenAI) {
  app.post("/api/generate-solution", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const { questionText, options, correctAnswer, script } = req.body;

      if (!questionText || !options || !correctAnswer || !script) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const explanation = await generateSolutionExplanation(
        questionText,
        options,
        correctAnswer,
        script,
      );

      res.json({ explanation });
    } catch (error: any) {
      console.error("Solution generation error:", error);
      res.status(500).json({ message: "Failed to generate solution explanation" });
    }
  });

  app.post("/api/generate-reading-solution", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const { questionText, options, correctAnswer, passage, passageTitle } = req.body;

      if (!questionText || !options || !correctAnswer || !passage) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const explanation = await generateReadingSolution(
        questionText,
        options,
        correctAnswer,
        passage,
        passageTitle,
      );

      res.json({ explanation });
    } catch (error: any) {
      console.error("Reading solution generation error:", error);
      res.status(500).json({ message: "Failed to generate reading solution explanation" });
    }
  });

  app.post("/api/listening/explanation", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const { CREDIT_COSTS } = await import("@shared/schema");
      const creditResult = await storage.deductCredits(
        (req as any).user.id,
        CREDIT_COSTS.AI_EXPLANATION,
        "AI 해설",
        "ai_feedback",
      );
      if (!creditResult.success) {
        return res
          .status(402)
          .json({ message: "크레딧이 부족합니다.", required: CREDIT_COSTS.AI_EXPLANATION });
      }

      const { questionText, selectedAnswer, correctAnswer, options, conversation } = req.body;

      if (!questionText || selectedAnswer === undefined || correctAnswer === undefined || !options) {
        return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
      }

      const wrongOptionLabels = options
        .map((_: string, idx: number) => String.fromCharCode(65 + idx))
        .filter((_: string, idx: number) => idx !== correctAnswer)
        .map((label: string) => `• ${label}: [왜 틀린지]`)
        .join("\n");

      const prompt = `TOEFL 리스닝 문제를 분석하고 해설을 제공하세요.

**대화/강의 스크립트:**
${conversation || "스크립트 정보 없음"}

**문제:** ${questionText}
**선택지:**
${options.map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${opt}`).join("\n")}

**정답:** ${String.fromCharCode(65 + correctAnswer)}
**학생이 선택한 답:** ${String.fromCharCode(65 + selectedAnswer)}

정확히 다음 형식으로 답변하세요 (섹션 헤더를 그대로 사용):

## 정답 해설
[정답과 핵심 이유를 1-2문장으로]

## 왜 이 답인가?
• [스크립트에서 관련 발언 인용: ""]
• [인용이 정답과 연결되는 설명]
• [화자의 의도/맥락 설명]

## 오답 분석
${wrongOptionLabels}

## 학습 팁
[이 유형 Listening 문제 풀이 전략 1문장]

규칙:
- 간결하게 (150-200단어)
- 스크립트 직접 인용 시 ""
- 화자의 톤, 의도, 맥락에 집중
- 불릿 포인트 사용 (•)`;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 1000,
        temperature: 0.3,
      });

      const explanation = response.choices[0].message.content;

      if ((req as any).user?.id) {
        storage
          .createSavedExplanation({
            userId: (req as any).user.id,
            type: "explanation",
            section: "listening",
            questionText,
            content: { explanation, selectedAnswer, correctAnswer },
          })
          .catch((err) => console.warn("⚠️ Failed to save listening explanation:", err));
      }

      res.json({ explanation });
    } catch (error: any) {
      console.error("Listening explanation error:", error);
      res.status(500).json({ error: "해설 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/reading/explanation", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const { CREDIT_COSTS } = await import("@shared/schema");
      const creditResult = await storage.deductCredits(
        (req as any).user.id,
        CREDIT_COSTS.AI_EXPLANATION,
        "AI 해설",
        "ai_feedback",
      );
      if (!creditResult.success) {
        return res
          .status(402)
          .json({ message: "크레딧이 부족합니다.", required: CREDIT_COSTS.AI_EXPLANATION });
      }

      const { questionText, selectedAnswer, correctAnswer, options, passage } = req.body;

      if (!questionText || selectedAnswer === undefined || correctAnswer === undefined || !options) {
        return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
      }

      const wrongOptionLabels = options
        .map((_: string, idx: number) => String.fromCharCode(65 + idx))
        .filter((_: string, idx: number) => idx !== correctAnswer)
        .map((label: string) => `• ${label}: [왜 틀린지]`)
        .join("\n");

      const prompt = `TOEFL 리딩 문제 해설을 제공해주세요.

지문: ${passage ? passage.substring(0, 800) + "..." : "N/A"}

문제: ${questionText}
선택지:
${options.map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${opt}`).join("\n")}

정답: ${String.fromCharCode(65 + correctAnswer)}
학생이 선택한 답: ${String.fromCharCode(65 + selectedAnswer)}

정확히 다음 형식으로 답변하세요 (섹션 헤더를 그대로 사용):

## 정답 해설
[정답과 핵심 이유를 1-2문장으로]

## 왜 이 답인가?
• [지문에서 관련 문장 인용: ""]
• [인용 문장이 정답과 연결되는 설명]

## 오답 분석
${wrongOptionLabels}

## 학습 팁
[이 유형 Reading 문제 풀이 전략 1문장]

규칙:
- 간결하게 (150-200단어)
- 지문 직접 인용 시 ""
- 불릿 포인트 사용 (•)`;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 1000,
        temperature: 0.3,
      });

      const explanation = response.choices[0].message.content;

      if ((req as any).user?.id) {
        storage
          .createSavedExplanation({
            userId: (req as any).user.id,
            type: "explanation",
            section: "reading",
            questionText,
            content: { explanation, selectedAnswer, correctAnswer },
          })
          .catch((err) => console.warn("⚠️ Failed to save reading explanation:", err));
      }

      res.json({ explanation });
    } catch (error: any) {
      console.error("Reading explanation error:", error);
      res.status(500).json({ error: "해설 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/generate-listening", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { content, difficulty = "medium", questionCount = 3 } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "콘텐츠 내용이 필요합니다." });
      }

      const { generateListeningContent } = await import("../openai");
      const listeningData = await generateListeningContent(content, difficulty, questionCount);

      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const voiceMap: Record<string, string> = {
        conversation: "nova",
        lecture: "nova",
        "choose-response": "onyx",
        announcement: "nova",
      };
      const rawScript = typeof listeningData.script === "string"
        ? listeningData.script
        : JSON.stringify(listeningData.script);
      const hasMultiSpeaker =
        listeningData.type === "conversation" && parseDialogueSegments(rawScript).length > 1;

      let audioBuffer: Buffer;
      if (hasMultiSpeaker) {
        audioBuffer = await generateMultiVoiceConversationAudio(rawScript);
      } else {
        const mp3 = await openaiClient.audio.speech.create({
          model: OPENAI_TTS_MODEL,
          voice: (voiceMap[listeningData.type] || "onyx") as any,
          input: stripSpeakerLabels(rawScript).substring(0, 4096),
          speed: 1.0,
        });
        audioBuffer = Buffer.from(await mp3.arrayBuffer());
      }

      const { uploadAudioToStorage } = await import("../audioStorage");
      const audioFileName = `listening_${Date.now()}.mp3`;
      const audioUrl = await uploadAudioToStorage(audioBuffer, audioFileName);

      res.json({
        script: listeningData.script,
        questions: listeningData.questions,
        audioUrl,
        type: listeningData.type,
        duration: Math.ceil(listeningData.script.length / 15),
      });
    } catch (error) {
      console.error("LISTENING 생성 오류:", error);
      res.status(500).json({ error: "LISTENING 섹션 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/explain-answer", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const {
        question,
        correctAnswer: providedAnswer,
        userAnswer,
        options,
        passage,
        section = "reading",
        language = "ko",
      } = req.body;

      if (!question && !passage) {
        return res.status(400).json({ error: "필수 정보가 누락되었습니다. 질문 또는 지문이 필요합니다." });
      }
      if (!options || (Array.isArray(options) && options.length === 0)) {
        return res.status(400).json({ error: "선택지 정보가 누락되었습니다." });
      }

      const { CREDIT_COSTS } = await import("@shared/schema");
      const creditResult = await storage.deductCredits(
        (req as any).user.id,
        CREDIT_COSTS.AI_EXPLANATION,
        "AI 해설",
        "ai_feedback",
      );
      if (!creditResult.success) {
        return res
          .status(402)
          .json({ message: "크레딧이 부족합니다.", required: CREDIT_COSTS.AI_EXPLANATION });
      }

      const { getLanguageConfig, buildAnswerExplanationPrompt } = await import("../lang/promptConfig");
      const { labels } = getLanguageConfig(language);

      const solvePrompt = `You are an expert test-taker solving a ${section === "listening" ? "TOEFL Listening" : "TOEFL Reading"} question.

Passage/Script:
${passage.substring(0, 2000)}

Question: ${question || "What is the best response?"}

Options:
${Array.isArray(options) ? options.map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${opt}`).join("\n") : "No options"}

Analyze the passage carefully and determine the correct answer. Return JSON:
{
  "correctAnswerIndex": <0-3 for A-D>,
  "correctAnswerLetter": "<A/B/C/D>",
  "reasoning": "<brief explanation of why this is correct>"
}`;

      const solveResponse = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content:
              "You are an expert at solving standardized test questions. Always choose the most appropriate and complete answer based on the given passage or script.",
          },
          { role: "user", content: solvePrompt },
        ],
        max_completion_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      let solvedData: any = {};
      try {
        solvedData = JSON.parse(solveResponse.choices[0].message.content || "{}");
      } catch (parseError) {
        console.error("Failed to parse AI solve response:", parseError);
      }

      const optionsCount = Array.isArray(options) ? options.length : 4;
      const aiSolvedAnswer = solvedData.correctAnswerIndex;
      const isValidAIAnswer =
        typeof aiSolvedAnswer === "number" &&
        Number.isInteger(aiSolvedAnswer) &&
        aiSolvedAnswer >= 0 &&
        aiSolvedAnswer < optionsCount;

      const normalizeAnswer = (answer: any): number => {
        if (typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < optionsCount) {
          return answer;
        }
        if (typeof answer === "string") {
          const upperAnswer = answer.toUpperCase();
          const letterIndex = ["A", "B", "C", "D"].indexOf(upperAnswer);
          if (letterIndex !== -1 && letterIndex < optionsCount) {
            return letterIndex;
          }
          const parsed = parseInt(answer, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < optionsCount) {
            return parsed;
          }
        }
        return 0;
      };

      const actualCorrectAnswer = isValidAIAnswer ? aiSolvedAnswer : normalizeAnswer(providedAnswer);
      if (!isValidAIAnswer) {
        console.log(
          `⚠️ AI solve fallback used - Invalid AI answer: ${aiSolvedAnswer}, using provided: ${providedAnswer} -> ${actualCorrectAnswer}`,
        );
      }

      const isCorrect = userAnswer === actualCorrectAnswer;
      const userAnswerText = userAnswer !== undefined
        ? typeof userAnswer === "number"
          ? options[userAnswer]
          : userAnswer
        : labels.noAnswer;
      const correctAnswerText =
        typeof actualCorrectAnswer === "number" ? options[actualCorrectAnswer] : actualCorrectAnswer;

      const systemPrompt = buildAnswerExplanationPrompt(section, language, userAnswerText);

      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `문제: ${question || "What is the best response?"}

선택지:
${Array.isArray(options) ? options.map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${opt}`).join("\n") : "No options"}

정답: ${typeof actualCorrectAnswer === "number" ? String.fromCharCode(65 + actualCorrectAnswer) : actualCorrectAnswer}
학생 선택: ${typeof userAnswer === "number" ? String.fromCharCode(65 + userAnswer) : userAnswerText}

지문/스크립트:
${passage.substring(0, 1500)}

AI 분석 결과: ${solvedData.reasoning || ""}

위 JSON 형식으로 상세한 해설을 제공해주세요.`,
          },
        ],
        max_completion_tokens: 1500,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const explanationData = JSON.parse(response.choices[0].message.content || "{}");
      explanationData.correctAnswer = String.fromCharCode(65 + actualCorrectAnswer);
      explanationData.correctAnswerText = correctAnswerText;
      explanationData.isCorrect = isCorrect;

      if ((req as any).user?.id) {
        const sectionVal = section === "listening" ? "listening" : "reading";
        storage
          .createSavedExplanation({
            userId: (req as any).user.id,
            type: "explanation",
            section: sectionVal as any,
            questionText: question || "What is the best response?",
            content: explanationData,
          })
          .catch((err) => console.warn("⚠️ Failed to save ai explain-answer:", err));
      }

      res.json({ explanation: explanationData, isCorrect });
    } catch (error: any) {
      console.error("AI explanation error:", error);
      res
        .status(500)
        .json({ error: "AI 해설 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
    }
  });

  app.post("/api/ai/generate-tts", requireAuth, aiTtsLimiter, async (req, res) => {
    try {
      const { script, voiceProfile = "default", voiceType, contentType: explicitContentType, options: ttsOptions } = req.body;
      const isQaMock = process.env.QA_MOCK_EXTERNALS === "1";

      if (!script) {
        return res.status(400).json({ error: "스크립트가 필요합니다." });
      }

      const crypto = await import("crypto");
      const optionsHash =
        ttsOptions && Array.isArray(ttsOptions) && explicitContentType !== "choose-response"
          ? ttsOptions.join("|")
          : "";
      const scriptHash = crypto
        .createHash("sha256")
        .update(script + voiceProfile + (voiceType || "") + (explicitContentType || "") + optionsHash)
        .digest("hex");

      const { uploadAudioToStorage, audioFileExistsInStorage } = await import("../audioStorage");
      const cachedAsset = await storage.getTtsAssetByHash(scriptHash);
      if (cachedAsset) {
        const cachedFileName = path.basename(cachedAsset.audioUrl);
        if (cachedAsset.audioUrl.startsWith("/api/audio/") && (await audioFileExistsInStorage(cachedFileName))) {
          const cachedResponse: any = {
            audioUrl: cachedAsset.audioUrl,
            cached: true,
            duration: cachedAsset.duration,
          };

          let cachedMeta: any = null;
          if (cachedAsset.metadata) {
            try {
              cachedMeta = JSON.parse(cachedAsset.metadata);
            } catch {}
          }

          if (cachedMeta?.optionTimestamps && Array.isArray(cachedMeta.optionTimestamps)) {
            cachedResponse.optionTimestamps = cachedMeta.optionTimestamps;
          } else if (
            explicitContentType === "choose-response" &&
            ttsOptions &&
            Array.isArray(ttsOptions) &&
            ttsOptions.length > 0
          ) {
            let totalDurMs = (cachedAsset.duration || 0) * 1000;
            if (totalDurMs <= 0) totalDurMs = 30000;

            const pauseMs = 1500;
            const totalPauseMs = pauseMs * ttsOptions.length;
            const speechDurMs = Math.max(totalDurMs - totalPauseMs, totalDurMs * 0.4);
            const scriptWordCount = Math.max(1, (script || "").split(/\s+/).filter(Boolean).length);
            const optionWordCounts = ttsOptions.map((o: string) =>
              Math.max(1, o.replace(/^[A-D]\)\s*/, "").split(/\s+/).filter(Boolean).length),
            );
            const totalOptionWords = optionWordCounts.reduce((a: number, b: number) => a + b, 0);
            const totalWords = scriptWordCount + totalOptionWords;

            const scriptDurMs = (scriptWordCount / totalWords) * speechDurMs;
            let cumMs = scriptDurMs + pauseMs;
            const estimatedTimestamps: any[] = [];
            for (let i = 0; i < ttsOptions.length; i++) {
              const optDurMs = Math.max(500, (optionWordCounts[i] / totalWords) * speechDurMs);
              estimatedTimestamps.push({
                option: String.fromCharCode(65 + i),
                startTime: cumMs / 1000,
                endTime: 0,
              });
              cumMs += optDurMs;
              if (i < ttsOptions.length - 1) cumMs += pauseMs;
            }
            for (let i = 0; i < estimatedTimestamps.length; i++) {
              estimatedTimestamps[i].endTime =
                i < estimatedTimestamps.length - 1
                  ? estimatedTimestamps[i + 1].startTime
                  : cumMs / 1000;
            }
            cachedResponse.optionTimestamps = estimatedTimestamps;
          }

          if (cachedMeta?.segmentDurations) {
            cachedResponse.segmentDurations = cachedMeta.segmentDurations;
          }

          return res.json(cachedResponse);
        }

        const localCachedPath = path.join(process.cwd(), cachedAsset.audioUrl.replace(/^\//, ""));
        if (existsSync(localCachedPath)) {
          const { migrateLocalFileToStorage } = await import("../audioStorage");
          const newUrl = await migrateLocalFileToStorage(localCachedPath, cachedFileName);
          if (newUrl) {
            await storage.saveTtsAsset({
              scriptHash,
              voiceProfile,
              audioUrl: newUrl,
              duration: cachedAsset.duration || 0,
              sizeBytes: cachedAsset.sizeBytes || 0,
            });
            return res.json({ audioUrl: newUrl, cached: true, duration: cachedAsset.duration });
          }
        }
      }

      let audioBuffer: Buffer;
      let contentType: "conversation" | "academic" | "choose-response" = "conversation";
      if (explicitContentType === "academic" || explicitContentType === "academic-talk" || explicitContentType === "lecture") {
        contentType = "academic";
      } else if (explicitContentType === "choose-response") {
        contentType = "choose-response";
      } else if (explicitContentType === "conversation") {
        contentType = "conversation";
      } else {
        const scriptLower = script.toLowerCase();
        const isAcademicContent =
          scriptLower.includes("professor:") ||
          scriptLower.includes("lecturer:") ||
          scriptLower.includes("podcast host:") ||
          (script.length > 1000 && !/\b(student|woman|man)\s*:/i.test(script));
        contentType = isAcademicContent ? "academic" : "conversation";
      }

      let preciseTimestamps: any[] | null = null;
      let segmentDurationsResult: any[] | null = null;
      const rawScript = typeof script === "string" ? script : JSON.stringify(script);
      const dialogueSegments = parseDialogueSegments(rawScript);
      const hasMultiSpeaker = !voiceType && contentType !== "academic" && dialogueSegments.length > 1;
      const hasSpeakerLabel = dialogueSegments.length >= 1;

      if (isQaMock) {
        audioBuffer = Buffer.from(`ID3QA_MOCK_TTS:${scriptHash}`);
        preciseTimestamps =
          explicitContentType === "choose-response" && Array.isArray(ttsOptions)
            ? ttsOptions.map((_: string, index: number) => ({
                option: String.fromCharCode(65 + index),
                startTime: index * 2,
                endTime: index * 2 + 1.5,
              }))
            : null;
        segmentDurationsResult = dialogueSegments.length > 0
          ? dialogueSegments.map((segment, index) => ({
              speaker: segment.speaker,
              startTime: index * 2,
              endTime: index * 2 + 1.5,
              text: segment.text,
            }))
          : null;
      } else if (contentType === "choose-response") {
        const speakerGender = hasSpeakerLabel ? getSpeakerGender(dialogueSegments[0].speaker) : "male";
        const questionVoice = speakerGender === "female" ? "nova" : "onyx";
        const optionVoice = questionVoice === "nova" ? "onyx" : "nova";
        const safeOptions = ttsOptions && Array.isArray(ttsOptions) ? ttsOptions : [];
        let questionText = buildChooseResponseQuestionText(rawScript, safeOptions);
        if (!questionText) questionText = "What is the best response?";

        if (safeOptions.length > 0) {
          const result = await buildChooseResponseAudio(questionText, safeOptions, questionVoice, optionVoice);
          audioBuffer = result.audioBuffer;
          preciseTimestamps = result.optionTimestamps;
        } else {
          audioBuffer = await generateTTSAudio(questionText.substring(0, 4096), questionVoice);
        }
      } else if (hasMultiSpeaker) {
        const result = await generateMultiVoiceConversationAudio(rawScript, true);
        audioBuffer = result.audioBuffer;
        segmentDurationsResult = result.segmentDurations;
      } else {
        const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const voiceMap: Record<string, string> = {
          conversation: "nova",
          academic: "nova",
          "choose-response": "onyx",
        };
        let selectedVoice: string;
        if (contentType === "academic") {
          selectedVoice = "nova";
        } else if (voiceType) {
          selectedVoice =
            ({
              narrator: "nova",
              professor: "onyx",
              lecturer: "onyx",
              student: "nova",
              student1: "nova",
              student2: "onyx",
              male: "onyx",
              female: "nova",
            } as Record<string, string>)[voiceType] || "nova";
        } else if (hasSpeakerLabel) {
          selectedVoice = getSpeakerGender(dialogueSegments[0].speaker) === "female" ? "nova" : "onyx";
        } else {
          selectedVoice = voiceMap[contentType] || "nova";
        }

        const mp3 = await openaiClient.audio.speech.create({
          model: OPENAI_TTS_MODEL,
          voice: selectedVoice as any,
          input: stripSpeakerLabels(rawScript).substring(0, 4096),
          speed: 1.0,
        });
        audioBuffer = Buffer.from(await mp3.arrayBuffer());
      }

      const audioFileName = `tts_${scriptHash.substring(0, 16)}.mp3`;
      let finalBuffer = audioBuffer;
      try {
        const { execSync } = await import("child_process");
        const tmpDir = path.join(process.cwd(), "uploads");
        if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
        const tmpPath = path.join(tmpDir, `tmp_${audioFileName}`);
        const tmpNorm = `${tmpPath}.norm.mp3`;
        await fs.writeFile(tmpPath, audioBuffer);
        execSync(`ffmpeg -i "${tmpPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -y "${tmpNorm}" 2>/dev/null`);
        finalBuffer = await fs.readFile(tmpNorm);
        try { await fs.unlink(tmpPath); } catch {}
        try { await fs.unlink(tmpNorm); } catch {}
      } catch {
        // ffmpeg optional
      }

      const audioUrl = await uploadAudioToStorage(finalBuffer, audioFileName);
      const sizeBytes = finalBuffer.length;
      let estimatedDuration: number;
      if (isQaMock) {
        estimatedDuration = Math.max(1, Math.round(script.length / 20));
      } else {
        try {
          estimatedDuration = Math.round((await getExactAudioDurationMs(finalBuffer)) / 1000);
        } catch {
          estimatedDuration = Math.round(sizeBytes / 16000);
        }
      }

      try {
        const metadataObj: any = {};
        if (preciseTimestamps) metadataObj.optionTimestamps = preciseTimestamps;
        if (segmentDurationsResult?.length) metadataObj.segmentDurations = segmentDurationsResult;
        const saveVoiceProfile = contentType === "choose-response" ? "choose-response" : voiceProfile;
        await storage.saveTtsAsset({
          scriptHash,
          voiceProfile: saveVoiceProfile,
          audioUrl,
          duration: estimatedDuration,
          sizeBytes,
          metadata: Object.keys(metadataObj).length ? JSON.stringify(metadataObj) : null,
        });
      } catch (dbError) {
        console.error("⚠️ Failed to cache TTS asset in DB (non-fatal):", dbError);
      }

      const responseData: any = { audioUrl, cached: false, duration: estimatedDuration };
      if (preciseTimestamps) responseData.optionTimestamps = preciseTimestamps;
      if (segmentDurationsResult?.length) responseData.segmentDurations = segmentDurationsResult;
      res.json(responseData);
    } catch (error: any) {
      console.error("TTS generation error:", error?.message || error);
      res.status(500).json({ error: "음성 생성 중 오류가 발생했습니다.", details: error?.message });
    }
  });

  app.post("/api/ai/solve-listening-questions", requireAuth, aiFeedbackLimiter, async (req, res) => {
    try {
      const { questions, language = "ko" } = req.body;

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Questions array is required" });
      }

      const solvedQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const prompt = `You are a TOEFL listening expert. Analyze this question and provide the correct answer.

Question Type: ${q.type}
${q.script ? `Context/Script: ${q.script}` : ""}
${q.question ? `Question: ${q.question}` : ""}
${q.prompt ? `Prompt: ${q.prompt}` : ""}

Options:
A. ${q.options[0]}
B. ${q.options[1]}
C. ${q.options[2]}
D. ${q.options[3]}

Instructions:
1. Carefully analyze the context/script and question
2. Determine which option is the correct answer
3. Provide a clear explanation in ${language === "ko" ? "Korean" : language === "ja" ? "Japanese" : language === "th" ? "Thai" : "English"}

Respond in this exact JSON format:
{
  "correctAnswer": "A",
  "explanation": "Brief explanation of why this is the correct answer"
}`;

        try {
          const completion = await openai.chat.completions.create({
            model: getOpenAIModel("premium"),
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_completion_tokens: 500,
          });

          const result = JSON.parse(completion.choices[0].message.content || "{}");
          solvedQuestions.push({
            ...q,
            correctAnswer: result.correctAnswer || "A",
            explanation: result.explanation || "",
            answerConfirmed: true,
          });
        } catch (solveError) {
          console.error(`Error solving question ${i + 1}:`, solveError);
          solvedQuestions.push({
            ...q,
            correctAnswer: q.correctAnswer || "",
            explanation: "⚠️ AI 분석 실패 - 정답을 수동으로 확인해주세요.",
            answerConfirmed: false,
          });
        }
      }

      res.json({ questions: solvedQuestions });
    } catch (error: any) {
      console.error("AI solve error:", error);
      res.status(500).json({ error: "정답 분석 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/writing/listening-audio", requireAuth, aiTtsLimiter, async (req, res) => {
    try {
      const { script } = req.body;
      const isQaMock = process.env.QA_MOCK_EXTERNALS === "1";

      if (!script) {
        return res.status(400).json({ error: "Script is required" });
      }

      const crypto = await import("crypto");
      const hash = crypto.createHash("sha256").update(script).digest("hex").substring(0, 12);
      const audioFileName = `listening_${hash}.mp3`;
      const { uploadAudioToStorage, audioFileExistsInStorage } = await import("../audioStorage");

      if (await audioFileExistsInStorage(audioFileName)) {
        const sentences = script.match(/[^.!?]+[.!?]+/g) || [script];
        const cleanSentences = sentences.map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        const words = script.split(/\s+/).filter((w: string) => w.length > 0);
        const estimatedDuration = words.length / 2.5;
        const segments: any[] = [];
        let currentTime = 0;
        for (const sentence of cleanSentences) {
          const sentenceWords = sentence.split(/\s+/).filter((w: string) => w.length > 0).length;
          const sentenceDuration = sentenceWords / 2.5;
          segments.push({ text: sentence, startTime: currentTime, endTime: currentTime + sentenceDuration });
          currentTime += sentenceDuration;
        }
        return res.json({ audioUrl: `/api/audio/${audioFileName}`, segments, duration: estimatedDuration });
      }

      const audioBuffer = isQaMock
        ? Buffer.from(`ID3QA_MOCK_LISTENING:${hash}`)
        : await (async () => {
            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const mp3 = await openaiClient.audio.speech.create({
              model: OPENAI_TTS_MODEL,
              voice: "nova",
              input: script.substring(0, 4096),
              speed: 0.95,
            });
            return Buffer.from(await mp3.arrayBuffer());
          })();
      const audioUrl = await uploadAudioToStorage(audioBuffer, audioFileName);
      const sentences = script.match(/[^.!?]+[.!?]+/g) || [script];
      const cleanSentences = sentences.map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      const words = script.split(/\s+/).filter((w: string) => w.length > 0);
      const estimatedDuration = words.length / 2.5;
      const segments: any[] = [];
      let currentTime = 0;
      for (const sentence of cleanSentences) {
        const sentenceWords = sentence.split(/\s+/).filter((w: string) => w.length > 0).length;
        const sentenceDuration = sentenceWords / 2.5;
        segments.push({ text: sentence, startTime: currentTime, endTime: currentTime + sentenceDuration });
        currentTime += sentenceDuration;
      }

      res.json({ audioUrl, segments, duration: estimatedDuration });
    } catch (error: any) {
      console.error("Error generating writing listening audio:", error);
      res.status(500).json({ error: "Failed to generate listening audio" });
    }
  });
}
