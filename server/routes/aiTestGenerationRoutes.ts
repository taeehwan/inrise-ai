import type { Express } from "express";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { aiGenerationLimiter } from "../middleware/rateLimit";
import { getOpenAIModel, OPENAI_TTS_MODEL } from "../openaiModels";
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
} from "../lib/ttsAudio";

interface AiTestGenerationRouteDeps {
  openaiClient: any;
  computeCorrectOrderFromWords: any;
  createQuestionGenerationPrompt: any;
  parseTextWithAI: any;
  parseUserContentDirectly: any;
}

export function registerAiTestGenerationRoutes(app: Express, deps: AiTestGenerationRouteDeps) {
  const {
    openaiClient,
    computeCorrectOrderFromWords,
    createQuestionGenerationPrompt,
    parseTextWithAI,
    parseUserContentDirectly,
  } = deps;

  app.post("/api/ai/generate-test-content", async (req, res) => {
    console.log("AI Generate - User authenticated:", !!req.user, "User ID:", req.user?.id);
    console.log("AI Generate - Session:", !!req.session, "Session ID:", req.sessionID);
    console.log("AI Generate - Is authenticated check:", req.isAuthenticated && req.isAuthenticated());

    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log("AI Generate - Authentication failed");
      return res.status(401).json({ message: "인증이 필요합니다. 로그인 후 다시 시도해주세요." });
    }

    try {
      const { examType, section, content, setTitle } = req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API 키가 설정되지 않았습니다." });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      let generatedContent;

      switch (section) {
        case "reading":
        case "listening":
        case "speaking":
        case "writing":
          generatedContent = await parseUserContentDirectly(content, examType, section);
          break;
        default:
          return res.status(400).json({ message: "지원하지 않는 섹션입니다." });
      }

      if (generatedContent && setTitle) {
        try {
          console.log(`Auto-saving ${section} test...`);

          const testId = `ai-${examType}-${section}-${randomUUID()}`;
          const testData = {
            id: testId,
            testId,
            title:
              setTitle ||
              generatedContent.testTitle ||
              `AI Generated ${examType.toUpperCase()} ${section.charAt(0).toUpperCase() + section.slice(1)} Test`,
            description: `AI가 생성한 ${examType.toUpperCase()} ${section} 테스트`,
            examType: examType as "toefl" | "gre",
            section,
            difficulty: "medium",
            isActive: false,
            totalDuration: generatedContent.totalDuration || 300,
            totalQuestions: generatedContent.questions?.length || 0,
            createdAt: new Date().toISOString(),
            ...(section === "listening" && {
              scripts: generatedContent.scripts || [],
              audioFiles: generatedContent.audioFiles || generatedContent.scripts || [],
            }),
            ...(section === "reading" && { passages: generatedContent.passages || [] }),
            ...(section === "speaking" && { tasks: generatedContent.tasks || [] }),
            ...(section === "writing" && { prompts: generatedContent.prompts || [] }),
            questions: generatedContent.questions || [],
            testTitle: setTitle || generatedContent.testTitle,
            testSetId: testId,
          };

          await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: true });

          await storage.createTest({
            id: testId,
            title: testData.title,
            description: testData.description,
            examType: examType as "toefl" | "gre",
            section,
            difficulty: "medium" as const,
            timeLimit: testData.totalDuration || 300,
            isActive: true,
            createdAt: new Date(),
          });

          generatedContent.testId = testId;
          console.log("AI test auto-saved:", testId);
        } catch (saveError) {
          console.error("AI 테스트 저장 오류:", saveError);
          generatedContent.saveError = "콘텐츠 생성은 성공했지만 테스트 저장 중 오류가 발생했습니다.";
        }
      }

      res.json(generatedContent);
    } catch (error: any) {
      console.error("AI 테스트 생성 오류:", error);
      res.status(500).json({ message: "AI 테스트 생성 중 오류가 발생했습니다.", error: error.message });
    }
  });

  app.patch("/api/ai/tests/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id.startsWith("ai-")) {
        return res.status(400).json({ message: "유효하지 않은 AI 테스트 ID입니다." });
      }

      await storage.updateAIGeneratedTest(id, updates);
      console.log("AI test updated:", id);
      res.json({ message: "AI 생성 테스트가 수정되었습니다.", success: true });
    } catch (error: any) {
      console.error("AI test update error:", error);
      res.status(500).json({ message: "테스트 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/ai/tests/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      if (!id.startsWith("ai-")) {
        return res.status(400).json({ message: "유효하지 않은 AI 테스트 ID입니다." });
      }

      await storage.deleteAIGeneratedTest(id);
      console.log("AI test deleted:", id);
      res.json({ message: "AI 생성 테스트가 삭제되었습니다." });
    } catch (error: any) {
      console.error("AI test deletion error:", error);
      res.status(500).json({ message: "테스트 삭제 중 오류가 발생했습니다." });
    }
  });

  app.patch("/api/admin/tests/:id/restore", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.updateAITestStatus(id, true);
      console.log("Test restored:", id);
      res.json({ message: "테스트가 복원되었습니다.", success: true });
    } catch (error: any) {
      console.error("Test restoration error:", error);
      res.status(500).json({ message: "테스트 복원 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/generate-question", requireAuth, requireAdmin, aiGenerationLimiter, async (req: any, res) => {
    try {
      const { examType, section, difficulty, topic, context } = req.body;

      if (!examType || !section) {
        return res.status(400).json({ message: "시험 유형과 섹션은 필수입니다." });
      }

      const prompt = createQuestionGenerationPrompt(examType, section, difficulty, topic, context);
      const response = await openaiClient.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: "당신은 TOEFL과 GRE 시험 문제 출제 전문가입니다. 정확하고 실제 시험과 유사한 고품질 문제를 생성합니다.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const generatedQuestion = JSON.parse(response.choices[0].message.content);
      generatedQuestion.id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      generatedQuestion.type = generatedQuestion.questionType || generatedQuestion.type;

      res.json(generatedQuestion);
    } catch (error: any) {
      console.error("AI question generation error:", error);
      res.status(500).json({ message: "문제 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/admin/parse-text-questions", requireAuth, requireAdmin, aiGenerationLimiter, async (req: any, res) => {
    try {
      const { pastedText, examType, section, difficulty } = req.body;

      if (!pastedText || !examType || !section) {
        return res.status(400).json({ message: "텍스트, 시험 유형, 섹션은 필수입니다." });
      }

      const parsedQuestions = await parseTextWithAI(pastedText, examType, section, difficulty);
      res.json({ questions: parsedQuestions });
    } catch (error: any) {
      console.error("Text parsing error:", error);
      res.status(500).json({ message: "텍스트 파싱 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/generate-test-set", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const {
        title,
        examType,
        section,
        difficulty,
        generatedData,
        parsedQuestions,
        aiGeneratedContent,
        passageTitle,
        passageContent,
        narration,
        userContent,
        isActive: reqIsActive,
      } = req.body;

      if (!title || !examType || !section) {
        return res.status(400).json({ message: "제목, 시험 유형, 섹션은 필수입니다." });
      }

      const shouldActivate = reqIsActive !== false;
      const testId = randomUUID();

      let questions = [];
      let testData: any = {
        id: testId,
        testId,
        title: title.trim(),
        description: `AI가 생성한 ${examType.toUpperCase()} ${section} 섹션 테스트`,
        examType: examType as "toefl" | "gre",
        section: section.trim(),
        difficulty: (difficulty || "medium") as "easy" | "medium" | "hard",
        duration: 60,
        questionCount: 0,
        isActive: shouldActivate,
        createdAt: new Date().toISOString(),
        questions: [],
      };

      if (userContent && userContent.trim().length > 0) {
        console.log(`📝 Processing userContent for ${examType} ${section}`);
        const parsedContent = await parseUserContentDirectly(userContent.trim(), examType, section);

        if (parsedContent) {
          questions = parsedContent.questions || [];
          testData.duration = parsedContent.totalDuration || 1080;
          testData.questionCount = questions.length;
          testData.questions = questions;
          if (parsedContent.passages && parsedContent.passages.length > 0) {
            testData.passages = parsedContent.passages;
          }
          console.log(`✅ Parsed ${questions.length} questions from user content`);
        }
      } else if (section === "listening" && (generatedData || aiGeneratedContent)) {
        const listenData = generatedData || aiGeneratedContent;
        questions = listenData.questions || [];
        testData.duration = listenData.duration || 60;
        testData.questionCount = questions.length;
        testData.questions = questions;
        testData.script = listenData.script;
        testData.audioUrl = listenData.audioUrl;
        testData.type = listenData.type || "conversation";
        testData.scripts = listenData.scripts || [listenData.script];
        testData.audioFiles = listenData.audioFiles || [listenData.audioUrl];
      } else if (section === "reading" && (generatedData || aiGeneratedContent)) {
        const readData = generatedData || aiGeneratedContent;
        questions = readData.questions || [];
        testData.duration = readData.duration || 60;
        testData.questionCount = questions.length;
        testData.questions = questions;
        testData.passages = readData.passages || [];
      } else if (parsedQuestions) {
        if (section === "writing") {
          const isNewToefl = examType === "new-toefl";
          questions = parsedQuestions.map((q: any) => {
            let finalQuestionType = "writing";

            if (isNewToefl) {
              const isBuildSentence = q.type === "build-sentence" || q.questionType === "build-sentence";
              const isEmail = q.type === "email" || q.questionType === "email" || q.writingType === "email";
              const isDiscussion =
                q.type === "discussion" || q.questionType === "discussion" || q.writingType === "discussion";

              if (isBuildSentence) finalQuestionType = "build-sentence";
              else if (isEmail) finalQuestionType = "email";
              else if (isDiscussion) finalQuestionType = "discussion";
            }

            return {
              ...q,
              questionType: finalQuestionType,
              type: q.type,
              words: q.words,
              correctOrder: q.correctOrder,
              sentenceTemplate: q.sentenceTemplate,
              contextSentence: q.contextSentence,
              scenario: q.scenario,
              requirements: q.requirements,
              topic: q.topic,
              professorName: q.professorName,
              professorQuestion: q.professorQuestion,
              studentResponses: q.studentResponses,
              studentPosts: q.studentPosts,
              sampleAnswer: q.sampleAnswer,
              writingType: q.writingType,
              readingPassage: q.readingPassage,
              listeningScript: q.listeningScript,
              readingTime: q.readingTime,
              writingTime: q.writingTime,
            };
          });

          if (isNewToefl) {
            const buildSentenceQuestions = questions.filter(
              (q: any) =>
                (q.type === "build-sentence" || q.questionType === "build-sentence") &&
                Array.isArray(q.words) &&
                q.words.length > 0,
            );

            if (buildSentenceQuestions.length > 0) {
              for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (
                  (q.type !== "build-sentence" && q.questionType !== "build-sentence") ||
                  !Array.isArray(q.words) ||
                  q.words.length === 0
                ) {
                  continue;
                }

                try {
                  const result = await computeCorrectOrderFromWords(
                    q.words,
                    q.contextSentence || q.context || "",
                    q.sentenceTemplate,
                  );

                  questions[i] = {
                    ...q,
                    correctOrder: result.correctOrder,
                    answer: result.correctSentence,
                    contextSentence: result.contextSentence || q.contextSentence,
                  };
                } catch (verifyError) {
                  console.error(`AI verification failed for question ${i + 1}:`, verifyError);
                }
              }
            }

            const verifiedBuildSentences = questions.filter(
              (q: any) => q.type === "build-sentence" || q.questionType === "build-sentence",
            );
            if (verifiedBuildSentences.length > 0) {
              testData.buildSentences = verifiedBuildSentences.map((q: any) => ({
                id: q.id,
                words: q.words,
                correctOrder: q.correctOrder,
                sentenceTemplate: q.sentenceTemplate,
                contextSentence: q.contextSentence,
                answer: q.answer,
              }));
            }
          }
        } else if (section === "listening" && examType === "new-toefl") {
          questions = parsedQuestions.map((q: any) => ({
            ...q,
            type: q.type || "conversation",
          }));

          testData.scripts = questions.map((q: any, idx: number) => ({
            id: `script-${idx}`,
            type: q.type || "conversation",
            content: q.script || q.audioScript || "",
            audioUrl: q.audioUrl,
            duration: q.duration,
            questions: [q],
          }));
        } else {
          questions = parsedQuestions;
        }

        testData.questionCount = questions.length;
        testData.questions = questions;

        if (passageTitle && passageContent && section === "reading") {
          testData.passages = [{ id: "passage-1", title: passageTitle, content: passageContent }];
          questions.forEach((q: any) => {
            if (!q.passage || q.passage.length < 100) {
              q.passage = passageContent;
              q.passageTitle = passageTitle;
            }
          });
        } else if (passageContent && section === "reading") {
          testData.passages = [{ id: "passage-1", title: title.trim() || "Reading Passage", content: passageContent }];
          questions.forEach((q: any) => {
            if (!q.passage || q.passage.length < 100) {
              q.passage = passageContent;
            }
          });
        } else if (section === "listening") {
          let fullTextForTTS = "";

          if (narration && narration.trim().length > 0) {
            fullTextForTTS = narration.trim();
          }

          if (passageContent && passageContent.trim().length > 0) {
            fullTextForTTS = fullTextForTTS ? `${fullTextForTTS}\n\n${passageContent.trim()}` : passageContent.trim();
          }

          let audioUrl = null;
          if (fullTextForTTS && fullTextForTTS.length > 0) {
            try {
              const colonDialoguePattern = /^([A-Za-z\s]+):/m;
              const speakerPatterns = ["Narrator", "Student", "Professor", "Librarian", "Lecturer", "Teacher", "Assistant"];
              const separateLinePattern = new RegExp(`^(${speakerPatterns.join("|")})\\s*$`, "m");
              const isDialogue = passageContent
                ? colonDialoguePattern.test(passageContent) || separateLinePattern.test(passageContent)
                : false;

              const audioBuffers: Buffer[] = [];

              if (isDialogue) {
                if (narration && narration.trim().length > 0) {
                  try {
                    const audioBuffer = await generateTTSAudio(narration.trim(), "nova");
                    audioBuffers.push(audioBuffer);
                  } catch (err) {
                    console.error("Narration TTS failed:", err);
                  }
                }

                const lines = passageContent.split("\n").filter((line: string) => line.trim());
                const speakers = new Set<string>();
                lines.forEach((line: string) => {
                  const colonMatch = line.match(/^([A-Za-z\s]+):/);
                  if (colonMatch) {
                    speakers.add(colonMatch[1].trim());
                    return;
                  }
                  if (speakerPatterns.some((pattern) => line.trim().toLowerCase() === pattern.toLowerCase())) {
                    speakers.add(line.trim());
                  }
                });

                const speakerGenders: Record<string, "male" | "female"> = {};
                if (speakers.size > 0) {
                  try {
                    const genderPrompt = `Based on the following dialogue script and questions, determine the gender of each speaker. Respond with JSON only, no explanation.

Dialogue script:
${passageContent.substring(0, 500)}

Questions context:
${questions.slice(0, 2).map((q: any) => q.question).join("\n")}

Speakers: ${Array.from(speakers).join(", ")}

Response format (JSON only):
{
  "Speaker1": "male" or "female",
  "Speaker2": "male" or "female"
}`;

                    const genderResponse = await openaiClient.chat.completions.create({
                      model: getOpenAIModel("premium"),
                      messages: [{ role: "user", content: genderPrompt }],
                      temperature: 0.3,
                      max_completion_tokens: 200,
                    });

                    const genderResult = JSON.parse(genderResponse.choices[0].message.content || "{}");
                    Object.assign(speakerGenders, genderResult);
                  } catch {
                    Array.from(speakers).forEach((speaker, idx) => {
                      speakerGenders[speaker] = idx % 2 === 0 ? "male" : "female";
                    });
                  }
                }

                const speakerList = Array.from(speakers);
                const voiceMap: Record<string, string> = {};
                if (speakerList.length === 2) {
                  voiceMap[speakerList[0]] = "nova";
                  voiceMap[speakerList[1]] = "onyx";
                } else {
                  speakerList.forEach((speaker, idx) => {
                    if (speakerGenders[speaker]) {
                      voiceMap[speaker] = speakerGenders[speaker] === "female" ? "nova" : "onyx";
                    } else {
                      voiceMap[speaker] = idx % 2 === 0 ? "nova" : "onyx";
                    }
                  });
                }

                const generateTTSWithChunking = async (text: string, voice: string) => {
                  const MAX_CHUNK_SIZE = 4000;

                  if (text.length <= MAX_CHUNK_SIZE) {
                    try {
                      const audioBuffer = await generateTTSAudio(text.trim(), voice);
                      audioBuffers.push(audioBuffer);
                    } catch (err) {
                      console.error("TTS failed:", err);
                    }
                    return;
                  }

                  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
                  let currentChunk = "";
                  for (const sentence of sentences) {
                    if ((currentChunk + sentence).length <= MAX_CHUNK_SIZE) {
                      currentChunk += sentence;
                    } else {
                      if (currentChunk) {
                        try {
                          const audioBuffer = await generateTTSAudio(currentChunk.trim(), voice);
                          audioBuffers.push(audioBuffer);
                        } catch (err) {
                          console.error("TTS chunk failed:", err);
                        }
                      }
                      currentChunk = sentence;
                    }
                  }

                  if (currentChunk) {
                    try {
                      const audioBuffer = await generateTTSAudio(currentChunk.trim(), voice);
                      audioBuffers.push(audioBuffer);
                    } catch (err) {
                      console.error("TTS final chunk failed:", err);
                    }
                  }
                };

                let currentSpeaker = "";
                let currentText = "";
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  const colonMatch = line.match(/^([A-Za-z\s]+):\s*(.+)$/);
                  if (colonMatch) {
                    if (currentSpeaker && currentText) {
                      await generateTTSWithChunking(currentText, voiceMap[currentSpeaker] || "onyx");
                    }
                    currentSpeaker = colonMatch[1].trim();
                    currentText = colonMatch[2].trim();
                    continue;
                  }

                  const isSpeakerLine = speakerPatterns.some(
                    (pattern) => line.trim().toLowerCase() === pattern.toLowerCase(),
                  );
                  if (isSpeakerLine) {
                    if (currentSpeaker && currentText) {
                      await generateTTSWithChunking(currentText, voiceMap[currentSpeaker] || "onyx");
                    }
                    currentSpeaker = line.trim();
                    currentText = "";
                  } else if (currentSpeaker && line.trim()) {
                    currentText += `${currentText ? " " : ""}${line.trim()}`;
                  }
                }

                if (currentSpeaker && currentText) {
                  await generateTTSWithChunking(currentText, voiceMap[currentSpeaker] || "onyx");
                }
              } else {
                const chunkSize = 4000;
                const textChunks: string[] = [];

                if (fullTextForTTS.length <= chunkSize) {
                  textChunks.push(fullTextForTTS);
                } else {
                  const sentences = fullTextForTTS.match(/[^.!?]+[.!?]+/g) || [fullTextForTTS];
                  let currentChunk = "";
                  for (const sentence of sentences) {
                    if ((currentChunk + sentence).length <= chunkSize) {
                      currentChunk += sentence;
                    } else {
                      if (currentChunk) textChunks.push(currentChunk);
                      currentChunk = sentence;
                    }
                  }
                  if (currentChunk) textChunks.push(currentChunk);
                }

                for (const chunk of textChunks) {
                  const audioBuffer = await generateTTSAudio(chunk, "nova");
                  audioBuffers.push(audioBuffer);
                }
              }

              const combinedBuffer = Buffer.concat(audioBuffers);
              const audioFileName = `listening_${testId}_${Date.now()}.mp3`;
              const { uploadAudioToStorage } = await import("../audioStorage");
              audioUrl = await uploadAudioToStorage(combinedBuffer, audioFileName);

              const textUsedForTTS = isDialogue ? `${narration || ""}\n${passageContent}` : fullTextForTTS;
              const wordCount = textUsedForTTS.split(/\s+/).filter((w) => w.length > 0).length;
              const estimatedDuration = Math.ceil(wordCount / 2.5);
              testData.audioUrl = audioUrl;
              testData.audioDuration = estimatedDuration;
              testData.narration = narration;
              testData.script = passageContent || fullTextForTTS;
            } catch (audioError) {
              console.error("TTS generation failed:", audioError);
            }
          }
        }
      }

      await storage.saveAIGeneratedTest(testId, testData, { activateImmediately: shouldActivate });
      res.json({
        success: true,
        testId,
        testData,
        message: "AI 테스트 세트가 생성되었습니다.",
      });
    } catch (error: any) {
      console.error("AI test set generation error:", error);
      res.status(500).json({ message: "AI 테스트 세트 생성 중 오류가 발생했습니다.", error: error.message });
    }
  });

  app.post("/api/ai/auto-generate-all-sections", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { examType } = req.body;

      if (!examType) {
        return res.status(400).json({ message: "시험 유형이 필요합니다." });
      }

      let sections;
      if (examType === "toefl") {
        sections = {
          reading: await generateTOEFLReading(openaiClient),
          listening: await generateTOEFLListening(openaiClient),
          speaking: await generateTOEFLSpeaking(openaiClient),
          writing: await generateTOEFLWriting(openaiClient),
        };
      } else if (examType === "gre") {
        sections = {
          verbal: await generateGREVerbal(openaiClient),
          quantitative: await generateGREQuantitative(openaiClient),
          analytical: await generateGREAnalytical(openaiClient),
        };
      } else {
        return res.status(400).json({ message: "지원되지 않는 시험 유형입니다." });
      }

      res.json({ sections, examType });
    } catch (error: any) {
      console.error("Auto-generation error:", error);
      res.status(500).json({ message: "자동 생성 중 오류가 발생했습니다.", error: error.message });
    }
  });

  app.post("/api/ai/parse-full-text", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { examType, content, setTitle } = req.body;

      if (!content || !setTitle) {
        return res.status(400).json({ message: "제목과 내용이 필요합니다." });
      }

      const prompt = `다음 텍스트를 분석하여 ${examType.toUpperCase()} 시험의 완전한 테스트 세트로 변환해주세요.

텍스트: ${content}

다음 형식으로 JSON을 반환해주세요:
{
  "sections": {
    "reading": { "passages": [] },
    "listening": { "audioFiles": [] },
    "speaking": { "tasks": [] },
    "writing": { "tasks": [] }
  },
  "metadata": {
    "examType": "${examType}",
    "title": "${setTitle}",
    "difficulty": "intermediate",
    "estimatedTime": 180
  }
}`;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          { role: "system", content: `당신은 ${examType.toUpperCase()} 시험 전문가입니다. 주어진 텍스트를 분석하여 완전한 테스트 세트를 생성해주세요.` },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_completion_tokens: 4000,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Full text parsing error:", error);
      res.status(500).json({ message: "전체 텍스트 파싱 중 오류가 발생했습니다.", error: error.message });
    }
  });

  app.post("/api/admin/generate-test-set", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { examType, section, setName, description, textInput } = req.body;

      if (!examType || !section || !setName || !textInput) {
        return res.status(400).json({ success: false, error: "모든 필수 필드를 입력해주세요." });
      }

      const prompt = `다음 텍스트를 기반으로 ${examType.toUpperCase()} ${section} 섹션의 테스트를 생성해주세요:

텍스트 내용:
${textInput}

다음 JSON 형식으로 응답해주세요:
{
  "testSet": {
    "id": "testset-${examType}-${section}-${Date.now()}",
    "title": "${setName}",
    "description": "${description}",
    "examType": "${examType}",
    "section": "${section}",
    "difficulty": "medium",
    "estimatedTime": 45,
    "questions": []
  }
}`;

      const response = await openaiClient.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: `당신은 ${examType.toUpperCase()} ${section} 섹션 전문가입니다. 주어진 텍스트를 기반으로 고품질의 시험 문제를 생성합니다.`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const generatedData = JSON.parse(response.choices[0].message.content || "{}");
      if (!generatedData.testSet) {
        throw new Error("AI 응답에서 테스트 세트를 생성할 수 없습니다.");
      }

      const testSet = { ...generatedData.testSet, createdAt: new Date(), createdBy: "admin" };
      await storage.createTestSet({
        id: testSet.id,
        title: testSet.title,
        description: testSet.description || "",
        examType: examType as "toefl" | "gre",
        section,
        difficulty: testSet.difficulty as "easy" | "medium" | "hard",
        estimatedTime: testSet.estimatedTime || 45,
        isActive: false,
      });

      if (testSet.questions) {
        for (const [index, question] of testSet.questions.entries()) {
          if (!question || typeof question !== "object" || typeof question.testId !== "string") {
            continue;
          }
          await storage.createTestSetComponent({
            testSetId: testSet.id,
            testId: question.testId,
            orderIndex: index,
            isRequired: true,
          });
        }
      }

      res.json({ success: true, testSet, message: "테스트 세트가 성공적으로 생성되었습니다." });
    } catch (error: any) {
      console.error("Test set generation error:", error);
      res.status(500).json({ success: false, error: error.message || "테스트 세트 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/parse-text-questions", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { pastedText, examType, section, difficulty } = req.body;

      if (!pastedText || !examType || !section) {
        return res.status(400).json({ message: "텍스트, 시험 유형, 섹션은 필수입니다." });
      }

      const parsedQuestions = await parseTextWithAI(pastedText, examType, section, difficulty);
      res.json({ questions: parsedQuestions });
    } catch (error: any) {
      console.error("Text parsing error:", error);
      res.status(500).json({ message: "텍스트 파싱 중 오류가 발생했습니다." });
    }
  });
}

async function generateAIQuestion(openaiClient: any, examType: string, section: string, difficulty: string, topic: string) {
  const difficultyDescriptions = {
    easy: "쉬운 수준의",
    medium: "중간 수준의",
    hard: "어려운 수준의",
  };

  const difficultyDesc = difficultyDescriptions[difficulty as keyof typeof difficultyDescriptions] || "중간 수준의";
  let prompt = "";

  if (examType === "toefl") {
    if (section === "reading") {
      prompt = `TOEFL Reading 섹션용 ${difficultyDesc} 문제를 생성해주세요.
주제: ${topic}

다음 JSON 형식으로 응답해주세요:
{
  "questionText": "문제 텍스트",
  "questionType": "multiple-choice",
  "passage": "읽기 지문 (200-300자)",
  "options": ["A) 선택지1", "B) 선택지2", "C) 선택지3", "D) 선택지4"],
  "correctAnswer": "A",
  "explanation": "정답 설명"
}`;
    } else if (section === "listening") {
      prompt = `TOEFL Listening 섹션용 ${difficultyDesc} 문제를 생성해주세요.
주제: ${topic}

다음 JSON 형식으로 응답해주세요:
{
  "questionText": "문제 텍스트",
  "questionType": "multiple-choice",
  "audioScript": "오디오 스크립트 (150-200자)",
  "options": ["A) 선택지1", "B) 선택지2", "C) 선택지3", "D) 선택지4"],
  "correctAnswer": "A",
  "explanation": "정답 설명"
}`;
    } else if (section === "speaking") {
      prompt = `TOEFL Speaking 섹션용 ${difficultyDesc} 문제를 생성해주세요.
주제: ${topic}

다음 JSON 형식으로 응답해주세요:
{
  "questionText": "말하기 문제 설명과 지시사항",
  "questionType": "speaking",
  "preparationTime": 15,
  "responseTime": 45,
  "explanation": "답변 가이드라인과 평가 기준"
}`;
    } else if (section === "writing") {
      prompt = `TOEFL Writing 섹션용 ${difficultyDesc} 문제를 생성해주세요.
주제: ${topic}

다음 JSON 형식으로 응답해주세요:
{
  "questionText": "작문 문제 설명과 지시사항",
  "questionType": "essay",
  "writingPrompt": "에세이 주제와 구체적인 지시사항",
  "explanation": "에세이 작성 가이드라인과 평가 기준"
}`;
    }
  } else if (examType === "gre") {
    if (section === "verbal") {
      prompt = `GRE Verbal Reasoning 섹션용 ${difficultyDesc} 문제를 생성해주세요.
주제: ${topic}

다음 JSON 형식으로 응답해주세요:
{
  "questionText": "문제 텍스트",
  "questionType": "multiple-choice",
  "passage": "읽기 지문 (필요시)",
  "options": ["A) 선택지1", "B) 선택지2", "C) 선택지3", "D) 선택지4", "E) 선택지5"],
  "correctAnswer": "A",
  "explanation": "정답 설명"
}`;
    } else if (section === "quantitative") {
      prompt = `GRE Quantitative Reasoning 섹션용 ${difficultyDesc} 문제를 생성해주세요.
주제: ${topic}

다음 JSON 형식으로 응답해주세요:
{
  "questionText": "수학 문제 텍스트",
  "questionType": "multiple-choice",
  "options": ["A) 선택지1", "B) 선택지2", "C) 선택지3", "D) 선택지4", "E) 선택지5"],
  "correctAnswer": "A",
  "explanation": "정답 설명과 풀이 과정"
}`;
    } else if (section === "analytical") {
      prompt = `GRE Analytical Writing 섹션용 ${difficultyDesc} 문제를 생성해주세요.
주제: ${topic}

다음 JSON 형식으로 응답해주세요:
{
  "questionText": "분석적 글쓰기 문제 설명",
  "questionType": "essay",
  "writingPrompt": "에세이 주제와 구체적인 분석 지시사항",
  "explanation": "에세이 작성 가이드라인과 평가 기준"
}`;
    }
  }

  const completion = await openaiClient.chat.completions.create({
    model: getOpenAIModel("premium"),
    messages: [
      {
        role: "system",
        content: "당신은 TOEFL과 GRE 시험 문제 출제 전문가입니다. 정확하고 실제 시험과 유사한 고품질 문제를 생성합니다.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const generatedQuestion = JSON.parse(completion.choices[0].message.content || "{}");
  generatedQuestion.id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  generatedQuestion.type = generatedQuestion.questionType || generatedQuestion.type;
  return generatedQuestion;
}

async function generateTOEFLReading(openaiClient: any) {
  const prompt = `Create a TOEFL Reading section with the following structure:

Generate a complete reading passage (400-500 words) about environmental science, and 10 multiple choice questions.

Return JSON in this exact format:
{
  "passages": [
    {
      "title": "passage title",
      "content": "full passage text",
      "questions": [
        {
          "id": 1,
          "question": "question text",
          "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
          "correct": 0,
          "explanation": "explanation text"
        }
      ]
    }
  ]
}`;

  const completion = await openaiClient.chat.completions.create({
    model: getOpenAIModel("premium"),
    messages: [
      { role: "system", content: "You are a TOEFL test expert. Create authentic reading comprehension content." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 3000,
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

async function generateTOEFLListening(openaiClient: any) {
  const prompt = `Create a TOEFL Listening section with the following structure:

Generate a lecture script (2-3 minutes when spoken) about psychology, and 6 multiple choice questions.

Return JSON in this exact format:
{
  "audioFiles": [
    {
      "title": "lecture title",
      "script": "full lecture transcript",
      "questions": [
        {
          "id": 1,
          "question": "question text",
          "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
          "correct": 0,
          "explanation": "explanation text"
        }
      ]
    }
  ]
}`;

  const completion = await openaiClient.chat.completions.create({
    model: getOpenAIModel("premium"),
    messages: [
      { role: "system", content: "You are a TOEFL test expert. Create authentic listening content." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 3000,
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

async function generateTOEFLSpeaking(openaiClient: any) {
  const prompt = `Create a TOEFL Speaking section with 4 tasks:

Return JSON in this exact format:
{
  "tasks": [
    {
      "id": 1,
      "type": "independent",
      "title": "task title",
      "prompt": "speaking prompt",
      "preparationTime": 15,
      "responseTime": 45
    },
    {
      "id": 2,
      "type": "integrated",
      "title": "task title",
      "readingPassage": "short reading passage",
      "listeningScript": "listening script",
      "prompt": "speaking prompt combining reading and listening",
      "preparationTime": 30,
      "responseTime": 60
    }
  ]
}`;

  const completion = await openaiClient.chat.completions.create({
    model: getOpenAIModel("premium"),
    messages: [
      { role: "system", content: "You are a TOEFL test expert. Create authentic speaking tasks." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 2000,
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

async function generateTOEFLWriting(openaiClient: any) {
  const prompt = `Create a TOEFL Writing section with 2 tasks:

Return JSON in this exact format:
{
  "tasks": [
    {
      "id": 1,
      "type": "integrated",
      "title": "Integrated Writing Task",
      "readingPassage": "academic reading passage (250-300 words)",
      "listeningScript": "lecture script that contradicts or supports the reading",
      "prompt": "writing prompt",
      "timeLimit": 20
    },
    {
      "id": 2,
      "type": "independent",
      "title": "Independent Writing Task",
      "prompt": "independent writing prompt asking for opinion with examples",
      "timeLimit": 30
    }
  ]
}`;

  const completion = await openaiClient.chat.completions.create({
    model: getOpenAIModel("premium"),
    messages: [
      { role: "system", content: "You are a TOEFL test expert. Create authentic writing tasks." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 2000,
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

async function generateGREVerbal(openaiClient: any) {
  const prompt = `Create a GRE Verbal Reasoning section with:
- 3 Text Completion questions (1-3 blanks each)
- 3 Sentence Equivalence questions
- 4 Reading Comprehension questions based on 2 passages

Return JSON in this exact format:
{
  "textCompletion": [],
  "sentenceEquivalence": [],
  "readingComprehension": []
}`;

  const completion = await openaiClient.chat.completions.create({
    model: getOpenAIModel("premium"),
    messages: [
      { role: "system", content: "You are a GRE test expert. Create authentic verbal reasoning content." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 4000,
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

async function generateGREQuantitative(openaiClient: any) {
  const prompt = `Create a GRE Quantitative Reasoning section with:
- 8 Multiple Choice questions
- 4 Quantitative Comparison questions
- 3 Numeric Entry questions

Return JSON in this exact format:
{
  "multipleChoice": [],
  "quantitativeComparison": [],
  "numericEntry": []
}`;

  const completion = await openaiClient.chat.completions.create({
    model: getOpenAIModel("premium"),
    messages: [
      { role: "system", content: "You are a GRE test expert. Create authentic quantitative reasoning problems." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 4000,
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

async function generateGREAnalytical(openaiClient: any) {
  const prompt = `Create a GRE Analytical Writing section with 2 tasks:

Return JSON in this exact format:
{
  "tasks": [
    {
      "id": 1,
      "type": "issue",
      "title": "Analyze an Issue",
      "prompt": "Present an issue and ask for analysis with specific instructions",
      "timeLimit": 30
    },
    {
      "id": 2,
      "type": "argument",
      "title": "Analyze an Argument",
      "prompt": "Present an argument and ask for logical analysis with specific instructions",
      "timeLimit": 30
    }
  ]
}`;

  const completion = await openaiClient.chat.completions.create({
    model: getOpenAIModel("premium"),
    messages: [
      { role: "system", content: "You are a GRE test expert. Create authentic analytical writing tasks." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 2000,
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}
