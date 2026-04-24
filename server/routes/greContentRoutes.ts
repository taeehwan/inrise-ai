import type { Express } from "express";
import OpenAI from "openai";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { requireAdvancedAI } from "../middleware/subscription";
import { storage } from "../storage";
import { getOpenAIModel } from "../openaiModels";
import { generateFallbackChartData, generateFallbackGeometryDiagram } from "../lib/questionFallbacks";
import { normalizeAnswerToLetter } from "../lib/routeTransforms";
import { generateQuestionHash } from "../lib/testTransforms";

function getNativeLanguage(language = "en") {
  if (language === "ko") return "한국어";
  if (language === "ja") return "日本語";
  if (language === "th") return "ภาษาไทย";
  return "English";
}

function formatGreVerbalOptions(options: any, noOptionsText: string) {
  if (!options) return noOptionsText;

  if (Array.isArray(options)) {
    return options.map((option: any, index: number) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n");
  }

  if (typeof options === "object") {
    return Object.entries(options)
      .map(([blankKey, blankOptions]: [string, any]) => {
        const label = blankKey.replace("blank", "Blank ");
        const items = Array.isArray(blankOptions)
          ? blankOptions.map((option: string, index: number) => `  ${String.fromCharCode(65 + index)}. ${option}`).join("\n")
          : "";
        return `${label}:\n${items}`;
      })
      .join("\n\n");
  }

  return noOptionsText;
}

async function deductAiExplanationCredit(userId: string) {
  const { CREDIT_COSTS } = await import("@shared/schema");
  const creditResult = await storage.deductCredits(userId, CREDIT_COSTS.AI_EXPLANATION, "AI 해설", "ai_feedback");
  return { creditResult, required: CREDIT_COSTS.AI_EXPLANATION };
}

export function registerGreContentRoutes(app: Express, openaiClient: OpenAI) {
  app.post("/api/gre/verbal/explanation", requireAuth, requireAdvancedAI, async (req, res) => {
    try {
      const { creditResult, required } = await deductAiExplanationCredit((req as any).user.id);
      if (!creditResult.success) {
        return res.status(402).json({ message: "크레딧이 부족합니다.", required });
      }

      const { question, options, correctAnswer, questionType, passage, language = "ko" } = req.body;
      const noOptionsText = language === "ko" ? "없음" : language === "ja" ? "なし" : language === "th" ? "ไม่มี" : "None";
      const langNative = getNativeLanguage(language);

      const explanationPrompt =
        questionType === "reading_comprehension" && passage
          ? `This is a GRE Verbal Reasoning reading comprehension question. Explain it in ${langNative}.

Passage:
${passage}

Question: ${question}
Options:
${formatGreVerbalOptions(options, noOptionsText)}
Correct Answer: ${correctAnswer}

Include passage summary, what the question asks, passage evidence, why the answer is correct, and why the others are wrong.`
          : `This is a GRE Verbal Reasoning ${questionType === "text_completion" ? "Text Completion" : "Sentence Equivalence"} question. Explain it in ${langNative}.

Question: ${question}
Options:
${formatGreVerbalOptions(options, noOptionsText)}
Correct Answer: ${correctAnswer}

Include sentence structure clues, key hints, why the answer fits, and why the other choices do not.`;

      const completion = await openaiClient.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: `You are a GRE Verbal Reasoning expert. Give concise, accurate explanations in ${langNative}.`,
          },
          { role: "user", content: explanationPrompt },
        ],
        temperature: 0.3,
        max_completion_tokens: 1000,
      });

      res.json({ explanation: completion.choices?.[0]?.message?.content });
    } catch (error: any) {
      console.error("Verbal explanation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gre/quantitative/explanation", requireAuth, requireAdvancedAI, async (req, res) => {
    try {
      const { creditResult, required } = await deductAiExplanationCredit((req as any).user.id);
      if (!creditResult.success) {
        return res.status(402).json({ message: "크레딧이 부족합니다.", required });
      }

      const { question, options, correctAnswer, questionType, columnA, columnB, language = "ko" } = req.body;
      const langNative = getNativeLanguage(language);
      const noOptionsText = language === "ko" ? "없음" : language === "ja" ? "なし" : language === "th" ? "ไม่มี" : "None";

      let explanationPrompt: string;
      if (questionType === "quantitative_comparison") {
        explanationPrompt = `GRE Quantitative Comparison. Explain in ${langNative}.

Column A: ${columnA}
Column B: ${columnB}
Correct Answer: ${correctAnswer}

Show Column A, Column B, compare them, and conclude with the exact correct answer.`;
      } else if (questionType === "numeric_entry") {
        explanationPrompt = `GRE Numeric Entry. Explain in ${langNative}.

Question: ${question}
Correct Answer: ${correctAnswer}

Show the calculation and end at exactly ${correctAnswer}.`;
      } else {
        const correctLetter = normalizeAnswerToLetter(correctAnswer, options);
        const formattedOptions = options
          ? options.map((option: any, index: number) => `(${String.fromCharCode(65 + index)}) ${option}`).join("\n")
          : noOptionsText;

        explanationPrompt = `GRE Multiple Choice Math. Explain in ${langNative}.

Question: ${question}
Options:
${formattedOptions}
Correct Answer: (${correctLetter})

Start with the correct answer, show the steps, and briefly explain the wrong choices.`;
      }

      const completion = await openaiClient.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: `You are a GRE Quantitative expert. The provided correct answer is final. Use Unicode math symbols and write in ${langNative}.`,
          },
          { role: "user", content: explanationPrompt },
        ],
        temperature: 0.3,
        max_completion_tokens: 400,
      });

      res.json({ explanation: completion.choices?.[0]?.message?.content });
    } catch (error: any) {
      console.error("Quantitative explanation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/explanation", requireAuth, async (req, res) => {
    try {
      const { creditResult, required } = await deductAiExplanationCredit((req as any).user.id);
      if (!creditResult.success) {
        return res.status(402).json({ message: "크레딧이 부족합니다.", required });
      }

      const { question, options, correctAnswer, userAnswer, language = "en" } = req.body;
      const langNative = getNativeLanguage(language);
      const isCorrect = userAnswer === correctAnswer;
      const optionsText = options ? options.map((option: string, index: number) => `${String.fromCharCode(65 + index)}) ${option}`).join("\n") : "";

      const completion = await openaiClient.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: `You are a friendly SAT Math tutor. Respond in ${langNative} with Solution, Key Concept, and Study Focus sections.`,
          },
          {
            role: "user",
            content: `Explain this SAT Math problem in ${langNative}.

Question:
${question}

${optionsText ? `Options:\n${optionsText}\n` : ""}Correct Answer: ${correctAnswer}
${userAnswer ? `Student Answer: ${userAnswer} (${isCorrect ? "Correct" : "Incorrect"})` : ""}`,
          },
        ],
        temperature: 0.3,
        max_completion_tokens: 500,
      });

      const explanation = completion.choices?.[0]?.message?.content;
      if (!explanation) {
        throw new Error("No explanation generated");
      }

      res.json({ explanation });
    } catch (error: any) {
      console.error("SAT explanation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate explanation" });
    }
  });

  app.post("/api/gre/quantitative/generate", requireAuth, async (req, res) => {
    try {
      const { difficulty = "medium", questionCount = 12, includeDataInterpretation = true, language = "en" } = req.body;
      const userId = (req.user as any)?.id;
      const langNative = getNativeLanguage(language);

      const existingHashes = new Set<string>();
      try {
        const existingTests = await storage.getAllAIGeneratedTestsMetadata();
        const greQuantTests = existingTests.filter((test: any) => test.examType === "gre" && test.section === "quantitative");

        for (const test of greQuantTests.slice(0, 10)) {
          const fullTest = await storage.getAIGeneratedTest(test.id);
          fullTest?.questions?.forEach((question: any) => existingHashes.add(generateQuestionHash(question)));
        }
      } catch (error) {
        console.log("Could not load existing hashes, proceeding without deduplication", error);
      }

      const qcCount = Math.round(questionCount * 0.4);
      const mcSingleCount = Math.round(questionCount * 0.37);
      const mcMultiCount = Math.max(1, Math.round(questionCount * 0.11));
      const neCount = questionCount - qcCount - mcSingleCount - mcMultiCount;

      const prompt = `Create a complete GRE Quantitative Reasoning section with EXACTLY ${questionCount} questions.

Language rules:
- Questions, options, chart labels, and column descriptions must be ENGLISH only.
- Explanations must be in ${langNative}.

Question distribution:
- ${qcCount} quantitative_comparison
- ${mcSingleCount} multiple_choice
- ${mcMultiCount} multiple_choice_multiple_answer
- ${neCount} numeric_entry

Difficulty: ${difficulty}
${includeDataInterpretation ? "Include at least one data_interpretation set with chartType and chartData." : "Data interpretation is optional."}

Requirements:
- Use authentic ETS GRE style.
- Use Unicode math symbols.
- Geometry questions must include geometryDiagram.
- Return JSON with questions, totalQuestions, estimatedTime, difficulty.`;

      const response = await openaiClient.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: "You are an expert GRE Quantitative test creator. Return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.95,
        max_completion_tokens: 8000,
      });

      const generatedContent = JSON.parse(response.choices[0].message.content || "{}");
      if (generatedContent.questions) {
        const seenInBatch = new Set<string>();

        generatedContent.questions = generatedContent.questions
          .filter((question: any) => {
            const hash = generateQuestionHash(question);
            if (existingHashes.has(hash) || seenInBatch.has(hash)) {
              return false;
            }
            seenInBatch.add(hash);
            return true;
          })
          .map((question: any, index: number) => {
            const normalizedQuestion = {
              ...question,
              id: question.id || `gre-quant-${Date.now()}-${index + 1}`,
            };

            if (
              question.type === "data_interpretation" &&
              (!question.chartData || !Array.isArray(question.chartData) || question.chartData.length === 0)
            ) {
              normalizedQuestion.chartData = generateFallbackChartData(question.chartType || "bar");
            }

            if (question.category === "geometry" && !question.geometryDiagram) {
              normalizedQuestion.geometryDiagram = generateFallbackGeometryDiagram(question.question || "");
            }

            return normalizedQuestion;
          });

        generatedContent.totalQuestions = generatedContent.questions.length;
      }

      console.log(`✓ Generated GRE quantitative test for ${userId} with ${generatedContent.totalQuestions || 0} questions`);
      res.json(generatedContent);
    } catch (error: any) {
      console.error("GRE Quantitative generation error:", error);
      res.status(500).json({ message: "문제 생성 중 오류가 발생했습니다.", error: error.message });
    }
  });

  app.post("/api/gre/quantitative/save-test", requireAuth, async (req, res) => {
    try {
      const { questions, title, difficulty } = req.body;
      const userId = (req.user as any)?.id;

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "문제 목록이 필요합니다." });
      }

      const normalizedQuestions = questions.map((question: any) => {
        if (question.type !== "quantitative_comparison") {
          return question;
        }

        const qcAnswerMap: Record<string | number, string> = {
          0: "Quantity A is greater.",
          1: "Quantity B is greater.",
          2: "The two quantities are equal.",
          3: "The relationship cannot be determined from the information given.",
          A: "Quantity A is greater.",
          B: "Quantity B is greater.",
          C: "The two quantities are equal.",
          D: "The relationship cannot be determined from the information given.",
          a: "Quantity A is greater.",
          b: "Quantity B is greater.",
          c: "The two quantities are equal.",
          d: "The relationship cannot be determined from the information given.",
        };

        return {
          ...question,
          correctAnswer: qcAnswerMap[question.correctAnswer] || question.correctAnswer,
        };
      });

      const testSetId = `gre-quant-set-${Date.now()}`;
      const isAdmin = (req.user as any)?.isAdmin === true;

      await storage.saveAIGeneratedTest(
        testSetId,
        {
          examType: "gre",
          section: "quantitative",
          title: title || `GRE Quantitative - ${normalizedQuestions.length} Questions`,
          description: `AI-generated GRE Quantitative Reasoning test (${difficulty || "medium"} difficulty)`,
          difficulty: difficulty || "medium",
          questions: normalizedQuestions,
          totalQuestions: normalizedQuestions.length,
          timeLimit: Math.round(normalizedQuestions.length * 1.75),
          createdBy: userId,
          isActive: isAdmin,
        },
        { activateImmediately: isAdmin },
      );

      res.json({
        success: true,
        testId: testSetId,
        message: `${normalizedQuestions.length}개의 문제가 저장되었습니다.`,
      });
    } catch (error: any) {
      console.error("GRE Quantitative save error:", error);
      res.status(500).json({ message: "테스트 저장 중 오류가 발생했습니다.", error: error.message });
    }
  });

  app.get("/api/gre/quantitative/tests", optionalAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const allTests = await storage.getAllAIGeneratedTestsMetadata();

      const tests = allTests
        .filter(
          (test: any) =>
            test.examType === "gre" &&
            test.section === "quantitative" &&
            (test.isActive === true || test.createdBy === userId),
        )
        .map((test: any) => ({
          id: test.id,
          title: test.title || "GRE Quantitative Test",
          difficulty: test.difficulty || "medium",
          questionCount: test.questionCount || 0,
          createdAt: test.createdAt,
          isOwner: test.createdBy === userId,
        }))
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      res.json(tests);
    } catch (error: any) {
      console.error("GRE Quantitative tests list error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gre/verbal/tests", optionalAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const allTests = await storage.getAllAIGeneratedTestsMetadata();

      const tests = allTests
        .filter(
          (test: any) =>
            test.examType === "gre" &&
            test.section === "verbal" &&
            (test.isActive === true || test.createdBy === userId),
        )
        .map((test: any) => ({
          id: test.id,
          title: test.title || "GRE Verbal Test",
          difficulty: test.difficulty || "medium",
          questionCount: test.questionCount || 0,
          createdAt: test.createdAt,
          isOwner: test.createdBy === userId,
        }))
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      res.json(tests);
    } catch (error: any) {
      console.error("GRE Verbal tests list error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
