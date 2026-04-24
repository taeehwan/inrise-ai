import type { Express } from "express";
import OpenAI from "openai";
import { getOpenAIModel } from "../openaiModels";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { aiGenerationLimiter } from "../middleware/rateLimit";
import { storage } from "../storage";

export function registerAiPublicUtilityRoutes(app: Express) {
  app.post("/api/ai/generate-questions", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { topic, examType, section, difficulty, questionCount } = req.body;
      const isQaMock = process.env.QA_MOCK_EXTERNALS === "1";

      if (!examType || !section || !difficulty) {
        return res.status(400).json({ error: "시험 유형, 섹션, 난이도가 필요합니다." });
      }

      if (!isQaMock && !process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API 키가 설정되지 않았습니다." });
      }
      const promptTopic = topic || "일반 주제";
      const count = questionCount || 5;
      const prompt = `
        ${examType.toUpperCase()} ${section} 섹션의 ${difficulty} 난이도 문제를 ${count}개 생성해주세요.
        주제: ${promptTopic}

        다음 JSON 형식으로 응답해주세요:
        {
          "testTitle": "테스트 제목",
          "passage": "지문 (reading의 경우)",
          "questions": [
            {
              "id": "q1",
              "questionText": "문제 텍스트",
              "questionType": "multiple-choice|summary|category",
              "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
              "correctAnswer": "정답",
              "explanation": "상세한 해설",
              "points": 1,
              "difficulty": "${difficulty}"
            }
          ]
        }

        ${section === "reading" ? "지문과 문제는 실제 시험과 유사한 수준이어야 합니다." : ""}
        모든 문제에는 상세한 해설을 포함해주세요.
      `;

      const generatedContent = isQaMock
        ? {
            testTitle: `QA Mock ${String(examType).toUpperCase()} ${section} Test`,
            passage:
              section === "reading"
                ? `This is a QA mock passage about ${promptTopic}. It exists to validate the AI generation save flow.`
                : undefined,
            questions: Array.from({ length: count }, (_, index) => ({
              id: `q${index + 1}`,
              questionText: `${promptTopic}에 대한 QA mock question ${index + 1}`,
              questionType: "multiple-choice",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option A",
              explanation: "This is a deterministic QA mock explanation.",
              points: 1,
              difficulty,
            })),
          }
        : await (async () => {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const response = await openai.chat.completions.create({
              model: getOpenAIModel("premium"),
              messages: [
                {
                  role: "system",
                  content: `당신은 ${examType.toUpperCase()} ${section} 전문가입니다. 고품질의 문제를 생성합니다.`,
                },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_object" },
              temperature: 0.7,
            });

            return JSON.parse(response.choices[0].message.content || "{}");
          })();

      try {
        const testSetId = `ai-${examType}-${section}-${Date.now()}`;
        const testSetData = {
          id: testSetId,
          title: generatedContent.testTitle || `AI Generated ${examType.toUpperCase()} ${section} Test`,
          examType: examType as "toefl" | "gre",
          description: `AI가 생성한 ${examType.toUpperCase()} ${section} 테스트 - 주제: ${promptTopic}`,
          totalDuration: section === "reading" ? 60 : section === "listening" ? 45 : 30,
          isActive: false,
          createdAt: new Date(),
        };

        await storage.createTestSet(testSetData);

        const aiTestData = {
          ...generatedContent,
          testSetId,
          examType,
          section,
          difficulty,
          topic: promptTopic,
          createdAt: new Date(),
        };

        await storage.saveAIGeneratedTest(testSetId, aiTestData, { activateImmediately: true });

        console.log(`AI Test Set saved: ${testSetId}`);
        res.json({
          ...generatedContent,
          testSetId,
          savedMessage: "테스트가 성공적으로 저장되었습니다.",
        });
      } catch (saveError) {
        console.error("테스트 저장 오류:", saveError);
        res.json({
          ...generatedContent,
          saveError: "콘텐츠 생성은 성공했지만 저장 중 오류가 발생했습니다.",
        });
      }
    } catch (error) {
      console.error("AI 질문 생성 오류:", error);
      res.status(500).json({ error: "AI 질문 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/generate-from-image", requireAuth, requireAdmin, aiGenerationLimiter, async (req, res) => {
    try {
      const { examType, section, difficulty } = req.body;

      if (!examType || !section || !difficulty) {
        return res.status(400).json({ error: "시험 유형, 섹션, 난이도가 필요합니다." });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API 키가 설정되지 않았습니다." });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `
        ${examType.toUpperCase()} ${section} 섹션의 ${difficulty} 난이도 문제를 이미지 기반으로 생성해주세요.
        
        다음 JSON 형식으로 응답해주세요:
        {
          "testTitle": "이미지 기반 테스트 제목",
          "passage": "지문 (reading의 경우)",
          "questions": [
            {
              "id": "q1",
              "questionText": "문제 텍스트",
              "questionType": "multiple-choice",
              "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
              "correctAnswer": "정답",
              "explanation": "상세한 해설",
              "points": 1,
              "difficulty": "${difficulty}"
            }
          ]
        }

        이미지와 관련된 문제를 생성해주세요.
      `;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: `당신은 ${examType.toUpperCase()} ${section} 전문가입니다. 이미지 기반 문제를 생성합니다.`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const generatedContent = JSON.parse(response.choices[0].message.content || "{}");

      try {
        const testSetId = `ai-image-${examType}-${section}-${Date.now()}`;
        const testSetData = {
          id: testSetId,
          title: generatedContent.testTitle || `AI Generated Image-based ${examType.toUpperCase()} ${section} Test`,
          examType: examType as "toefl" | "gre",
          description: `AI가 생성한 이미지 기반 ${examType.toUpperCase()} ${section} 테스트`,
          totalDuration: section === "reading" ? 60 : section === "listening" ? 45 : 30,
          isActive: false,
          createdAt: new Date(),
        };

        await storage.createTestSet(testSetData);

        const aiTestData = {
          ...generatedContent,
          testSetId,
          examType,
          section,
          difficulty,
          type: "image-based",
          createdAt: new Date(),
        };

        await storage.saveAIGeneratedTest(testSetId, aiTestData, { activateImmediately: true });
        console.log(`AI Image-based Test Set saved: ${testSetId}`);

        res.json({
          ...generatedContent,
          testSetId,
          savedMessage: "이미지 기반 테스트가 성공적으로 저장되었습니다.",
        });
      } catch (saveError) {
        console.error("이미지 기반 테스트 저장 오류:", saveError);
        res.json({
          ...generatedContent,
          saveError: "콘텐츠 생성은 성공했지만 저장 중 오류가 발생했습니다.",
        });
      }
    } catch (error) {
      console.error("AI 이미지 기반 질문 생성 오류:", error);
      res.status(500).json({ error: "AI 이미지 기반 질문 생성 중 오류가 발생했습니다." });
    }
  });
}
