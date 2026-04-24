import type { Express } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middleware/auth";
import { getOpenAIModel } from "../openaiModels";
import { storage } from "../storage";

export function registerSatRoutes(app: Express) {
  app.get("/api/sat/reading-writing/questions", requireAuth, async (_req, res) => {
    try {
      const sampleQuestions = [
        {
          id: 1,
          type: "craft_structure",
          passage:
            "The ancient city of Petra, carved into rose-red cliffs in modern-day Jordan, served as the capital of the Nabataean Kingdom for centuries. Archaeological evidence suggests that the Nabataeans developed sophisticated water management systems to sustain their desert civilization.",
          passageTitle: "Archaeological Discovery",
          question: "Which choice best states the main purpose of the passage?",
          options: [
            "To describe the geographical features of Petra",
            "To explain how ancient civilizations managed water resources",
            "To introduce Petra as the Nabataean capital and highlight their water engineering",
            "To compare Petra with other ancient desert cities",
          ],
          correctAnswer: "To introduce Petra as the Nabataean capital and highlight their water engineering",
        },
        {
          id: 2,
          type: "information_ideas",
          passage:
            "Recent studies on sleep patterns in adolescents indicate that teenagers require approximately 8-10 hours of sleep per night for optimal cognitive function. However, research shows that only 15% of teenagers actually achieve this recommended amount.",
          question: "Based on the passage, which statement is best supported?",
          options: [
            "Most teenagers are sleep-deprived",
            "Sleep requirements decrease with age",
            "Cognitive function is unrelated to sleep",
            "Teenagers need less sleep than adults",
          ],
          correctAnswer: "Most teenagers are sleep-deprived",
        },
        {
          id: 3,
          type: "standard_conventions",
          passage: "The committee, after reviewing all the proposals___decided to postpone the vote until more information could be gathered.",
          question: "Which choice completes the text so that it conforms to the conventions of Standard English?",
          options: [", ", ": ", "—", ";"],
          correctAnswer: ", ",
        },
      ];

      res.json({ questions: sampleQuestions });
    } catch (error) {
      console.error("Error getting SAT Reading & Writing questions:", error);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  app.get("/api/sat/math/questions", requireAuth, async (_req, res) => {
    try {
      const sampleQuestions = [
        {
          id: 1,
          type: "algebra",
          question: "If 3x + 5 = 17, what is the value of x?",
          options: ["2", "3", "4", "5"],
          correctAnswer: "4",
          allowCalculator: true,
        },
        {
          id: 2,
          type: "problem_solving",
          question:
            "A store sells notebooks for $4 each and pencils for $1 each. If Maria buys x notebooks and y pencils and spends exactly $15, which equation represents this situation?",
          options: ["4x + y = 15", "x + 4y = 15", "5(x + y) = 15", "4x - y = 15"],
          correctAnswer: "4x + y = 15",
          allowCalculator: true,
        },
        {
          id: 3,
          type: "geometry",
          question: "A circle has a radius of 5 units. What is its area in square units?",
          options: ["10π", "25π", "50π", "100π"],
          correctAnswer: "25π",
          allowCalculator: true,
          isGridIn: false,
        },
      ];

      res.json({ questions: sampleQuestions });
    } catch (error) {
      console.error("Error getting SAT Math questions:", error);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  app.post("/api/sat/math/generate", requireAuth, async (req, res) => {
    try {
      const { difficulty = "medium", questionCount = 22, module = 1, language = "en" } = req.body;
      const langNative = language === "ko" ? "한국어" : language === "ja" ? "日本語" : language === "th" ? "ภาษาไทย" : "English";
      const uniqueSeed = Date.now() + Math.random().toString(36).substring(2, 15);
      const algebraContexts = ["business profits", "distance-rate-time", "population growth", "temperature conversion", "salary calculations", "phone plans", "gym memberships", "car rentals", "shipping costs", "investment returns"];
      const advancedMathContexts = ["projectile motion", "compound interest", "bacterial growth", "radioactive decay", "profit optimization", "area maximization", "price-demand curves", "engineering tolerances"];
      const dataContexts = ["survey results", "scientific experiments", "market research", "sports statistics", "weather patterns", "medical trials", "educational outcomes", "consumer behavior"];
      const geometryContexts = ["architecture", "landscaping", "packaging design", "road construction", "satellite orbits", "shadow lengths", "building heights", "pool dimensions"];
      const selectedAlgebra = algebraContexts[Math.floor(Math.random() * algebraContexts.length)];
      const selectedAdvanced = advancedMathContexts[Math.floor(Math.random() * advancedMathContexts.length)];
      const selectedData = dataContexts[Math.floor(Math.random() * dataContexts.length)];
      const selectedGeometry = geometryContexts[Math.floor(Math.random() * geometryContexts.length)];

      const difficultySpecs = {
        easy: {
          desc: "Foundation level (SAT scores 400-550 range)",
          algebra: "Single-variable linear equations, basic slope-intercept form, simple systems with integer solutions",
          advanced: "Basic quadratics with integer roots, simple polynomial evaluation, basic exponential recognition",
          data: "Direct ratio calculations, single-step percentages, reading simple tables/graphs",
          geometry: "Basic area/perimeter formulas, simple Pythagorean theorem, basic angle relationships",
          complexity: "Most questions should be 1-2 step problems",
        },
        medium: {
          desc: "Proficient level (SAT scores 550-650 range)",
          algebra: "Multi-step linear equations, systems requiring substitution/elimination, linear inequalities, function notation",
          advanced: "Quadratics requiring factoring or formula, polynomial operations, exponential equations, rational expressions",
          data: "Multi-step percentage problems, probability with conditions, interpreting complex data displays, margin of error basics",
          geometry: "Combined shape problems, coordinate geometry, trigonometric ratios, circle equations",
          complexity: "Most questions should be 2-3 step problems with some requiring strategic thinking",
        },
        hard: {
          desc: "Advanced level (SAT scores 650-800 range)",
          algebra: "Complex systems with no/infinite solutions, absolute value equations/inequalities, complex function transformations, nested functions",
          advanced: "Complex polynomial division, rational equations with extraneous solutions, advanced exponential/logarithmic concepts, complex quadratic applications",
          data: "Complex probability, statistical inference, experimental design analysis, non-linear data modeling",
          geometry: "Advanced trigonometry, complex 3D geometry, circle theorems, coordinate proofs",
          complexity: "Questions should require 3+ steps, strategic problem decomposition, and recognition of mathematical patterns",
        },
      };

      const specs = difficultySpecs[difficulty as keyof typeof difficultySpecs] || difficultySpecs.medium;
      const prompt = `UNIQUE GENERATION ID: ${uniqueSeed}

CREATE ${questionCount} COMPLETELY NEW AND UNIQUE Digital SAT Math questions.

⚠️ CRITICAL UNIQUENESS REQUIREMENT:
- Generate ENTIRELY NEW questions - do NOT use common textbook examples
- Use FRESH numerical values and creative real-world scenarios
- Each question must be ORIGINAL and DIFFERENT from any previous generation
- Incorporate these specific contexts: ${selectedAlgebra}, ${selectedAdvanced}, ${selectedData}, ${selectedGeometry}

DIFFICULTY LEVEL: ${specs.desc}
- Algebra topics: ${specs.algebra}
- Advanced Math topics: ${specs.advanced}
- Problem-Solving & Data: ${specs.data}
- Geometry & Trig: ${specs.geometry}
- Complexity: ${specs.complexity}

LANGUAGE:
- ALL question text and options MUST be in ENGLISH ONLY
- ONLY explanations should be in ${langNative}

DIGITAL SAT MATH STRUCTURE (Module ${module}):
- Module 1: Standard difficulty mix across all domains
- Module 2: Adaptive - emphasize higher-order thinking

QUESTION DISTRIBUTION (Official SAT ratios):
- Algebra: 35% (~${Math.round(questionCount * 0.35)} questions)
- Advanced Math: 35% (~${Math.round(questionCount * 0.35)} questions)
- Problem-Solving & Data Analysis: 15% (~${Math.round(questionCount * 0.15)} questions)
- Geometry & Trigonometry: 15% (~${Math.round(questionCount * 0.15)} questions)

QUESTION TYPES:
- Multiple Choice (4 options): ~75% of questions
- Grid-In (Student Produced Response): ~25% of questions

AUTHENTIC SAT CHARACTERISTICS:
- Include realistic distractor answers (common student errors)
- Use precise mathematical language
- Vary question stems (solve for, find, determine, what is, which expression, etc.)
- Include context-based word problems AND pure algebraic problems
- Some questions should require multi-step reasoning

FORMATTING:
- Use Unicode: π, √, ², ³, ≤, ≥, ≠, ×, ÷, ±, ∞
- Fractions: "a/b" format
- Grid-in answers: numeric values only

Return JSON format:
{
  "questions": [
    {
      "id": 1,
      "type": "algebra|advanced_math|problem_solving|geometry",
      "question": "Question text in English",
      "options": ["A", "B", "C", "D"] (for multiple choice only),
      "correctAnswer": "correct option or numeric value",
      "allowCalculator": true/false,
      "isGridIn": true/false,
      "explanation": "Detailed step-by-step solution in ${langNative}"
    }
  ],
  "totalQuestions": ${questionCount},
  "module": ${module},
  "estimatedTime": 35,
  "difficulty": "${difficulty}"
}`;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: `You are an elite Digital SAT Math test developer working directly with College Board standards. Your questions must match the EXACT difficulty and style of official 2024-2025 Digital SAT exams.

GENERATION SEED: ${uniqueSeed} - Use this to ensure unique question generation.

CRITICAL REQUIREMENTS:
1. ALL question text and options MUST be in ENGLISH ONLY
2. Only "explanation" field can be in ${langNative}
3. Create BRAND NEW questions each time - never repeat common examples
4. Match authentic SAT difficulty: ${specs.desc}
5. Include realistic wrong answer choices based on common student mistakes
6. Questions must be mathematically sound with exactly one correct answer

QUESTION AUTHENTICITY:
- Mimic actual College Board question phrasing
- Use varied mathematical contexts and scenarios
- Include both calculator-active and calculator-neutral questions
- Grid-in answers must be positive real numbers (no fractions greater than 5 digits)

DIFFICULTY CALIBRATION for ${difficulty.toUpperCase()}:
${specs.complexity}`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.95,
        max_completion_tokens: 12000,
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      const questions = parsed.questions.map((q: any, index: number) => ({
        id: String(index + 1),
        type: q.type || "algebra",
        question: q.question,
        options: q.options || [],
        correctAnswer: String(q.correctAnswer),
        allowCalculator: q.allowCalculator !== false,
        isGridIn: q.isGridIn || false,
        explanation: q.explanation || "",
      }));

      res.json({
        questions,
        totalQuestions: questions.length,
        module,
        estimatedTime: 35,
        difficulty,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("SAT Math generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate SAT Math questions" });
    }
  });

  app.post("/api/sat/reading-writing/parse", requireAuth, async (req, res) => {
    try {
      const { text, questionCount = 10, language = "en" } = req.body;
      if (!text || text.trim().length < 50) {
        return res.status(400).json({ message: "Please provide at least 50 characters of text to parse" });
      }

      const langNative = language === "ko" ? "한국어" : language === "ja" ? "日本語" : language === "th" ? "ภาษาไทย" : "English";
      const prompt = `Analyze the following text and create ${questionCount} SAT Reading & Writing questions based on it.

INPUT TEXT:
"""
${text.substring(0, 5000)}
"""

Create questions in these official Digital SAT categories (distribute evenly):
1. Craft and Structure (craft_structure): Main idea, purpose, text structure, word meaning in context
2. Information and Ideas (information_ideas): Central claims, supporting details, inferences
3. Expression of Ideas (expression_ideas): Transitions, organization, effective language use
4. Standard English Conventions (standard_english): Grammar, punctuation, sentence structure

For each question:
- Extract a relevant passage excerpt (2-4 sentences)
- Create a question that tests reading comprehension or language skills
- Provide 4 answer options (one correct, three plausible but incorrect)
- Include detailed explanation

Return JSON in this EXACT format:
{
  "questions": [
    {
      "id": "1",
      "type": "craft_structure",
      "passageTitle": "Short descriptive title",
      "passage": "Relevant excerpt from the text (2-4 sentences)",
      "question": "Which choice best describes the function of the underlined portion?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Detailed explanation in ${langNative}"
    }
  ],
  "sourceTextLength": ${text.length},
  "totalQuestions": ${questionCount}
}`;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "system",
            content: `You are an expert Digital SAT Reading & Writing test creator. Create authentic, challenging questions based on provided text, matching the official College Board Digital SAT format (2024-2025).

CRITICAL: Questions and options should be in ENGLISH. Explanations can be in ${langNative}.
- Extract meaningful passages from the provided text
- Create questions that test genuine reading comprehension
- Ensure each question has exactly one defensibly correct answer
- Use official SAT question stems and formats`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_completion_tokens: 6000,
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      const questions = parsed.questions.map((q: any, index: number) => ({
        id: String(index + 1),
        type: q.type || "craft_structure",
        passageTitle: q.passageTitle || "Passage",
        passage: q.passage,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      }));

      res.json({
        questions,
        totalQuestions: questions.length,
        sourceTextLength: text.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("SAT R&W parsing error:", error);
      res.status(500).json({ message: error.message || "Failed to parse text and generate questions" });
    }
  });

  app.post("/api/sat/submit", requireAuth, async (req, res) => {
    try {
      const { section, answers, timeSpent } = req.body;
      if (!section || !answers) {
        return res.status(400).json({ message: "Section and answers are required" });
      }

      const totalQuestions = Object.keys(answers).length;
      const rawScore = Math.round(totalQuestions * 0.7);
      let scaledScore = Math.round(200 + (rawScore / totalQuestions) * 600);
      scaledScore = Math.max(200, Math.min(800, scaledScore));

      res.json({
        section,
        rawScore,
        scaledScore,
        totalQuestions,
        timeSpent,
        percentile: Math.round((scaledScore / 800) * 100),
        feedback: {
          strengths: ["Good time management", "Strong reading comprehension"],
          improvements: ["Focus on vocabulary in context", "Practice more complex grammar rules"],
        },
      });
    } catch (error) {
      console.error("Error submitting SAT test:", error);
      res.status(500).json({ message: "Failed to submit test" });
    }
  });

  app.get("/api/sat/history", requireAuth, async (_req, res) => {
    try {
      res.json({ attempts: [] });
    } catch (error) {
      console.error("Error getting SAT history:", error);
      res.status(500).json({ message: "Failed to get test history" });
    }
  });

  app.post("/api/sat/reading-writing/explanation", requireAuth, async (req, res) => {
    try {
      const { CREDIT_COSTS } = await import("@shared/schema");
      const creditResult = await storage.deductCredits((req as any).user.id, CREDIT_COSTS.AI_EXPLANATION, "AI 해설", "ai_feedback");
      if (!creditResult.success) {
        return res.status(402).json({ message: "크레딧이 부족합니다.", required: CREDIT_COSTS.AI_EXPLANATION });
      }

      const { question, passage, options, correctAnswer, userAnswer, language = "ko" } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }

      const languageInstructions = {
        ko: "한국어로 답변해주세요.",
        en: "Please respond in English.",
        ja: "日本語で回答してください。",
        th: "กรุณาตอบเป็นภาษาไทย",
      };
      const isCorrect = userAnswer === correctAnswer;
      const prompt = `You are an expert SAT tutor. Provide a detailed explanation for this SAT Reading & Writing question.

Question: ${question}
${passage ? `Passage: ${passage}` : ""}
Options: ${options?.join(", ") || "N/A"}
Correct Answer: ${correctAnswer}
${userAnswer ? `Student's Answer: ${userAnswer} (${isCorrect ? "Correct" : "Incorrect"})` : ""}

${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

Provide:
1. Why the correct answer is right
2. ${!isCorrect && userAnswer ? "Why the student's answer was incorrect" : "Common mistakes to avoid"}
3. Key concepts or strategies for this question type
4. Tips for similar questions

Keep the explanation clear, educational, and encouraging.`;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      });

      res.json({
        explanation: response.choices[0].message.content,
        isCorrect,
        questionType: "reading_writing",
      });
    } catch (error) {
      console.error("Error generating SAT explanation:", error);
      res.status(500).json({ message: "Failed to generate explanation" });
    }
  });
}
