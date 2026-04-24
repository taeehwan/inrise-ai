import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { getOpenAIModel } from "../openaiModels";
import { inferExclusiveSectionFromTitle, normalizeToToefl30 } from "../lib/routeTransforms";
import { resolveAttemptTestData } from "../lib/testResolver";

export function registerStudentInsightRoutes(app: Express) {
  app.get("/api/student/learning-feedback", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "인증이 필요합니다." });
      }

      const feedback = await storage.getLearningFeedback(userId);
      if (!feedback) {
        return res.json(null);
      }
      res.json(feedback.feedbackData);
    } catch (error: any) {
      console.error("Learning feedback fetch error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/student/generate-learning-feedback", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "인증이 필요합니다." });
      }

      const attempts = await storage.getUserTestAttempts(userId);
      const completedAttempts = attempts.filter((attempt) => attempt.status === "completed");
      if (completedAttempts.length === 0) {
        return res.status(400).json({ message: "분석할 테스트 결과가 없습니다." });
      }

      const attemptsWithDetails = await Promise.all(
        completedAttempts.map(async (attempt) => {
          const testData = await resolveAttemptTestData(
            {
              getTest: storage.getTest.bind(storage),
              getTestSet: storage.getTestSet.bind(storage),
              getAIGeneratedTest: storage.getAIGeneratedTest.bind(storage),
            },
            attempt.testId,
          );
          const answers = await storage.getAnswersByAttemptId(attempt.id);
          const questions = await storage.getQuestionsByTestId(attempt.testId);
          const questionMap = new Map(questions.map((question) => [question.id, question]));

          const wrongAnswers = answers
            .filter((answer) => answer.isCorrect === false)
            .map((answer) => {
              const question = questionMap.get(answer.questionId);
              return {
                questionId: answer.questionId,
                userAnswer: answer.userAnswer,
                correctAnswer: question?.correctAnswer || null,
                questionText: question?.questionText || null,
                questionType: question?.questionType || null,
                passageSummary: question?.passage ? `${question.passage.substring(0, 150)}...` : null,
              };
            })
            .filter((item) => item.questionText);

          return {
            attemptId: attempt.id,
            testId: attempt.testId,
            examType: testData?.examType || "unknown",
            section: testData?.section || "general",
            score: attempt.totalScore,
            sectionScores: attempt.sectionScores || null,
            correctAnswers: answers.filter((answer) => answer.isCorrect).length,
            totalQuestions: answers.length,
            completedAt: attempt.completedAt,
            wrongAnswers,
          };
        }),
      );

      const totalWrongCount = attemptsWithDetails.reduce((sum, attempt) => sum + attempt.wrongAnswers.length, 0);
      console.log(`[Learning Feedback] userId=${userId}, attempts=${attemptsWithDetails.length}, totalWrongAnswers=${totalWrongCount}`);
      if (totalWrongCount > 0) {
        console.log("[Learning Feedback] Sample wrong answers:", JSON.stringify(attemptsWithDetails[0]?.wrongAnswers?.slice(0, 2)));
      }

      if (totalWrongCount === 0 && completedAttempts.every((attempt) => (attempt.totalScore ?? 0) === 0)) {
        return res.status(400).json({
          message: "아직 오답 데이터가 부족합니다. 테스트를 더 완료해주세요.",
          code: "INSUFFICIENT_DATA",
        });
      }

      const openai = (await import("../openai")).default;
      const sectionSummary = attemptsWithDetails.map((attempt) => ({
        section: attempt.section,
        examType: attempt.examType,
        score: attempt.score,
        correct: attempt.correctAnswers,
        total: attempt.totalQuestions,
        wrongCount: attempt.wrongAnswers.length,
        sectionScores: attempt.sectionScores,
      }));

      const wrongAnswerDetails = attemptsWithDetails
        .flatMap((attempt) =>
          attempt.wrongAnswers.map((wrongAnswer) => ({
            section: attempt.section,
            examType: attempt.examType,
            ...wrongAnswer,
          })),
        )
        .slice(0, 50);

      const prompt = `당신은 TOEFL/GRE/SAT 전문 학습 분석가입니다. 다음 학생의 테스트 결과를 분석하고 맞춤형 학습 피드백을 제공해주세요.

시험 결과 요약:
${JSON.stringify(sectionSummary, null, 2)}

오답 상세 (총 ${totalWrongCount}개 중 최대 50개):
${wrongAnswerDetails.length > 0 ? JSON.stringify(wrongAnswerDetails, null, 2) : "오답 데이터 없음 — 점수와 섹션 정보만 기반으로 분석해주세요."}

다음 JSON 형식으로 응답해주세요:
{
  "overallAnalysis": "전반적인 학습 상태 분석 (2-3문장)",
  "sectionScores": { "reading": 0, "listening": 0, "speaking": 0, "writing": 0 },
  "weakPoints": [
    {
      "area": "취약 영역 이름 (예: 어휘력, 추론 능력, 시간 관리 등)",
      "description": "해당 영역에서 어떤 문제가 있는지 설명",
      "frequency": 1,
      "examples": ["관련 오답 예시 1", "관련 오답 예시 2"]
    }
  ],
  "strongPoints": [
    {
      "area": "강점 영역 이름",
      "description": "해당 영역에서 잘하는 부분 설명"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "title": "추천 학습 활동 제목",
      "description": "추천 이유 및 방법 설명",
      "actionItems": ["구체적인 실천 항목 1", "구체적인 실천 항목 2"]
    }
  ],
  "studyPlan": [
    {
      "week": 1,
      "focus": "이번 주 학습 초점",
      "goals": ["목표 1", "목표 2"]
    }
  ]
}

오답 패턴을 분석하여 학생이 자주 범하는 실수 유형을 파악하고, 개선을 위한 구체적인 학습 방향을 제시해주세요.
오답 데이터가 없더라도 점수와 섹션 분포로 유용한 분석을 반드시 제공해주세요.`;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const rawFeedback = JSON.parse(response.choices[0].message.content || "{}");
      const feedbackData = {
        overallAnalysis: typeof rawFeedback.overallAnalysis === "string" ? rawFeedback.overallAnalysis : "",
        sectionScores:
          rawFeedback.sectionScores && typeof rawFeedback.sectionScores === "object" ? rawFeedback.sectionScores : undefined,
        weakPoints: Array.isArray(rawFeedback.weakPoints)
          ? rawFeedback.weakPoints.map((item: Record<string, unknown>) => ({
              area: String(item?.area ?? ""),
              description: String(item?.description ?? ""),
              frequency: typeof item?.frequency === "number" ? item.frequency : 0,
              examples: Array.isArray(item?.examples) ? item.examples.map(String) : [],
            }))
          : [],
        strongPoints: Array.isArray(rawFeedback.strongPoints)
          ? rawFeedback.strongPoints.map((item: Record<string, unknown>) => ({
              area: String(item?.area ?? ""),
              description: String(item?.description ?? ""),
            }))
          : [],
        recommendations: Array.isArray(rawFeedback.recommendations)
          ? rawFeedback.recommendations.map((item: Record<string, unknown>) => ({
              priority: ["high", "medium", "low"].includes(String(item?.priority)) ? String(item.priority) : "low",
              title: String(item?.title ?? ""),
              description: String(item?.description ?? ""),
              actionItems: Array.isArray(item?.actionItems) ? item.actionItems.map(String) : [],
            }))
          : [],
        studyPlan: Array.isArray(rawFeedback.studyPlan)
          ? rawFeedback.studyPlan.map((item: Record<string, unknown>) => ({
              week: typeof item?.week === "number" ? item.week : 0,
              focus: String(item?.focus ?? ""),
              goals: Array.isArray(item?.goals) ? item.goals.map(String) : [],
            }))
          : [],
      };

      await storage.saveLearningFeedback(userId, feedbackData);
      res.json(feedbackData);
    } catch (error: any) {
      console.error("Learning feedback generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/performance-summary", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { examType } = req.query;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const attempts = await storage.getUserTestAttempts(userId);
      const attemptsWithTests = await Promise.all(
        attempts.map(async (attempt) => {
          const test = await resolveAttemptTestData(
            {
              getTest: storage.getTest.bind(storage),
              getTestSet: storage.getTestSet.bind(storage),
              getAIGeneratedTest: storage.getAIGeneratedTest.bind(storage),
            },
            attempt.testId,
          );
          return { ...attempt, test };
        }),
      );

      const filteredAttempts = examType
        ? attemptsWithTests.filter((attempt) => attempt.test && attempt.test.examType === examType)
        : attemptsWithTests.filter((attempt) => attempt.test);

      const sectionStats: Record<
        string,
        {
          scores: number[];
          scoreHistory: { date: string; score: number; attemptId: string }[];
          attempts: number;
          average: number;
          best: number;
          worst: number;
          trend: number;
          lastScore: number | null;
          predictedScore: number;
        }
      > = {};

      filteredAttempts.forEach((attempt) => {
        const attemptSectionScores = attempt.sectionScores as Record<string, number> | null;
        const isToefl = attempt.test?.examType === "toefl" || examType === "toefl";

        if (attemptSectionScores && typeof attemptSectionScores === "object") {
          Object.entries(attemptSectionScores).forEach(([section, rawScore]) => {
            if (typeof rawScore !== "number" || Number.isNaN(rawScore)) return;
            const score = isToefl ? normalizeToToefl30(rawScore) : rawScore;
            if (!sectionStats[section]) {
              sectionStats[section] = {
                scores: [],
                scoreHistory: [],
                attempts: 0,
                average: 0,
                best: 0,
                worst: 30,
                trend: 0,
                lastScore: null,
                predictedScore: 0,
              };
            }
            sectionStats[section].scores.push(score);
            sectionStats[section].scoreHistory.push({
              date: attempt.completedAt instanceof Date ? attempt.completedAt.toISOString() : new Date().toISOString(),
              score,
              attemptId: attempt.id,
            });
            sectionStats[section].attempts++;
            sectionStats[section].best = Math.max(sectionStats[section].best, score);
            sectionStats[section].worst = Math.min(sectionStats[section].worst, score);
          });
          return;
        }

        let section: string | null = null;
        if (attempt.test?.section) {
          section = attempt.test.section;
        } else if (attempt.test?.sections && Array.isArray(attempt.test.sections) && attempt.test.sections.length === 1) {
          section = attempt.test.sections[0];
        } else if (attempt.test?.testData?.section) {
          section = attempt.test.testData.section;
        } else if (attempt.test?.title) {
          section = inferExclusiveSectionFromTitle(attempt.test.title);
        }

        if (!section) return;

        if (!sectionStats[section]) {
          sectionStats[section] = {
            scores: [],
            scoreHistory: [],
            attempts: 0,
            average: 0,
            best: 0,
            worst: 30,
            trend: 0,
            lastScore: null,
            predictedScore: 0,
          };
        }

        const rawScore = attempt.totalScore || 0;
        const score = isToefl ? normalizeToToefl30(rawScore) : rawScore;
        sectionStats[section].scores.push(score);
        sectionStats[section].scoreHistory.push({
          date: attempt.completedAt instanceof Date ? attempt.completedAt.toISOString() : new Date().toISOString(),
          score,
          attemptId: attempt.id,
        });
        sectionStats[section].attempts++;
        sectionStats[section].best = Math.max(sectionStats[section].best, score);
        sectionStats[section].worst = Math.min(sectionStats[section].worst, score);
      });

      Object.keys(sectionStats).forEach((section) => {
        const stats = sectionStats[section];
        stats.average = stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length;
        stats.lastScore = stats.scores[stats.scores.length - 1] || null;
        if (stats.scores.length >= 4) {
          const mid = Math.floor(stats.scores.length / 2);
          const firstHalf = stats.scores.slice(0, mid);
          const secondHalf = stats.scores.slice(mid);
          const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
          stats.trend = secondAvg - firstAvg;
        }
      });

      const sections = examType === "toefl" ? ["reading", "listening", "speaking", "writing"] : ["verbal", "quantitative", "analytical"];
      const targetScores = examType === "toefl"
        ? { reading: 24, listening: 24, speaking: 24, writing: 24 }
        : { verbal: 155, quantitative: 160, analytical: 4 };

      const sectionAnalysis = sections
        .map((section) => {
          const stats = sectionStats[section];
          const target = (targetScores as any)[section] || 0;
          const target30 = examType === "toefl" ? 30 : target;

          if (!stats || stats.attempts === 0) {
            return {
              section,
              status: "no_data",
              average: null,
              average30: null,
              predicted30: null,
              target,
              target30,
              gap: target,
              attempts: 0,
              trend: 0,
              scoreHistory: [],
              priority: 1,
              recommendation: `${section} 섹션 연습이 필요합니다. 아직 시험 기록이 없습니다.`,
            };
          }

          const gap = target - stats.average;
          const isWeak = gap > (examType === "toefl" ? 5 : 15);
          const isStrong = gap < (examType === "toefl" ? 2 : 5);
          let priority = 3;
          if (isWeak) priority = 1;
          else if (!isStrong) priority = 2;

          const sortedHistory = [...stats.scoreHistory].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          const recentScores = sortedHistory.slice(-5);
          let predicted30 = Math.round(stats.average);
          if (recentScores.length >= 2) {
            const trend =
              (recentScores[recentScores.length - 1].score - recentScores[0].score) / recentScores.length;
            predicted30 = Math.min(30, Math.max(0, Math.round(stats.average + trend * 2)));
          }

          return {
            section,
            status: isWeak ? "weak" : isStrong ? "strong" : "moderate",
            average: Math.round(stats.average * 10) / 10,
            average30: Math.min(30, Math.round(stats.average)),
            predicted30,
            target,
            target30,
            gap: Math.round(gap * 10) / 10,
            attempts: stats.attempts,
            trend: Math.round(stats.trend * 10) / 10,
            best: stats.best,
            worst: stats.worst,
            lastScore: stats.lastScore,
            scoreHistory: sortedHistory.slice(-10),
            priority,
            recommendation: isWeak
              ? `${section} 섹션이 목표 점수보다 ${Math.abs(gap).toFixed(1)}점 부족합니다. 집중적인 학습이 필요합니다.`
              : isStrong
                ? `${section} 섹션은 목표 점수에 근접해 있습니다. 유지 학습을 권장합니다.`
                : `${section} 섹션은 보통 수준입니다. 점진적인 향상이 필요합니다.`,
          };
        })
        .sort((a, b) => a.priority - b.priority);

      const recentAttempts = filteredAttempts
        .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
        .slice(0, 10);

      res.json({
        examType: examType || "all",
        totalAttempts: filteredAttempts.length,
        sectionAnalysis,
        estimatedCurrentScore: sectionAnalysis.reduce((sum, item) => sum + (item.average || 0), 0),
        estimatedTargetScore: sectionAnalysis.reduce((sum, item) => sum + item.target, 0),
        weakestSections: sectionAnalysis.filter((item) => item.status === "weak").map((item) => item.section),
        strongestSections: sectionAnalysis.filter((item) => item.status === "strong").map((item) => item.section),
        recentTests: recentAttempts.slice(0, 5).map((attempt) => ({
          id: attempt.id,
          testTitle: attempt.test?.title || "Unknown",
          section: attempt.test?.section,
          score: attempt.totalScore,
          completedAt: attempt.completedAt,
        })),
        studyFocus: sectionAnalysis
          .filter((item) => item.priority <= 2)
          .map((item) => ({
            section: item.section,
            currentAvg: item.average,
            target: item.target,
            hoursRecommended: item.priority === 1 ? 10 : 5,
          })),
      });
    } catch (error: any) {
      console.error("Performance summary error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
