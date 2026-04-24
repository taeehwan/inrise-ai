import type { Express } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { storage } from "../storage";

const aiStudyPlanInputSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  examType: z.enum(["toefl", "gre"]),
  currentScore: z.number().optional(),
  targetScore: z.number().min(1),
  duration: z.number().min(1).max(52),
  weeklyHours: z.number().min(1).max(40),
  focusAreas: z.array(z.string()).min(1),
  learningStyle: z.enum(["intensive", "balanced", "relaxed"]).default("balanced"),
  weaknessDetails: z.string().optional(),
  preferredTimeSlot: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  sectionScores: z
    .object({
      reading: z.number().optional(),
      listening: z.number().optional(),
      speaking: z.number().optional(),
      writing: z.number().optional(),
      verbal: z.number().optional(),
      quantitative: z.number().optional(),
      analytical: z.number().optional(),
    })
    .optional(),
  sectionPriorities: z
    .object({
      reading: z.number().optional(),
      listening: z.number().optional(),
      speaking: z.number().optional(),
      writing: z.number().optional(),
      verbal: z.number().optional(),
      quantitative: z.number().optional(),
      analytical: z.number().optional(),
    })
    .optional(),
  language: z.enum(["ko", "ja", "en", "th"]).optional(),
});

export function registerStudyPlanRoutes(app: Express) {
  app.get("/api/study-plans/user", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json(await storage.getUserStudyPlans(userId));
    } catch (error) {
      console.error("Error fetching user study plans:", error);
      res.status(500).json({ message: "Failed to fetch study plans" });
    }
  });

  app.post("/api/study-plans/user", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json(await storage.createUserStudyPlan(userId, req.body));
    } catch (error) {
      console.error("Error creating study plan:", error);
      res.status(500).json({ message: "Failed to create study plan" });
    }
  });

  app.post("/api/study-plans/generate-ai", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const validatedInput = aiStudyPlanInputSchema.parse(req.body);
      const {
        name,
        examType,
        currentScore,
        targetScore,
        duration,
        weeklyHours,
        focusAreas,
        learningStyle,
        weaknessDetails,
        preferredTimeSlot,
        sectionScores,
        sectionPriorities,
        language,
      } = validatedInput;

      const { CREDIT_COSTS } = await import("@shared/schema");
      const creditResult = await storage.deductCredits(userId, CREDIT_COSTS.AI_STUDY_PLAN, "AI Study Plan Generation", "study_plan");
      if (!creditResult.success) {
        return res.status(402).json({
          message: "Insufficient credits",
          error: creditResult.error,
          required: CREDIT_COSTS.AI_STUDY_PLAN,
        });
      }

      let performanceContext = "";
      try {
        const attempts = await storage.getUserTestAttempts(userId);
        const attemptsWithTests = await Promise.all(
          attempts.map(async (attempt) => {
            const test = await storage.getTest(attempt.testId);
            const testSet = await storage.getTestSet(attempt.testId?.replace("testset-", ""));
            const aiTest = await storage.getAIGeneratedTest(attempt.testId);
            return { ...attempt, test: test || testSet || aiTest };
          }),
        );

        const filteredAttempts = attemptsWithTests.filter((a) => a.test && a.test.examType === examType);
        if (filteredAttempts.length > 0) {
          const sectionStats: Record<string, number[]> = {};
          filteredAttempts.forEach((attempt) => {
            const section = attempt.test?.section;
            if (section) {
              if (!sectionStats[section]) sectionStats[section] = [];
              sectionStats[section].push(attempt.totalScore || 0);
            }
          });

          const sectionAverages = Object.entries(sectionStats)
            .map(([section, scores]) => `${section}: ${(scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1)} (${scores.length} attempts)`)
            .join(", ");
          const recentTests = filteredAttempts
            .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
            .slice(0, 5)
            .map((a) => `${a.test?.section || "unknown"}: ${a.totalScore} points (${new Date(a.completedAt || "").toLocaleDateString()})`)
            .join("; ");

          performanceContext = `

REAL PERFORMANCE DATA (from actual tests):
- Total completed tests: ${filteredAttempts.length}
- Section averages: ${sectionAverages}
- Recent 5 test scores: ${recentTests}
- Based on this data, identify the weakest sections and prioritize them in the study plan.`;
        }
      } catch (perfError) {
        console.log("Could not fetch performance data for study plan:", perfError);
      }

      const { generateAIStudyPlan } = await import("../openai");
      const aiPlan = await generateAIStudyPlan({
        examType,
        currentScore,
        targetScore,
        duration,
        weeklyHours,
        focusAreas,
        learningStyle: learningStyle || "balanced",
        weaknessDetails: (weaknessDetails || "") + performanceContext,
        preferredTimeSlot,
        language,
        sectionScores,
        sectionPriorities,
      });

      if (!aiPlan || !aiPlan.weeklyPlan || !aiPlan.summary) {
        throw new Error("AI failed to generate valid study plan");
      }

      const planData = {
        name,
        examType,
        currentScore: currentScore || null,
        targetScore,
        duration,
        weeklyHours,
        focusAreas,
        learningStyle: learningStyle || "balanced",
        weaknessDetails: weaknessDetails || null,
        preferredTimeSlot: preferredTimeSlot || "evening",
        aiGeneratedPlan: aiPlan.weeklyPlan,
        aiPlanSummary: aiPlan.summary,
        completedTasks: 0,
        totalTasks:
          aiPlan.totalTasks ||
          aiPlan.weeklyPlan.reduce((sum: number, week: any) => sum + (week.dailyTasks?.length || 0), 0),
        achievementBadges: [],
        status: "active" as const,
      };

      const plan = await storage.createUserStudyPlan(userId, planData as any);
      res.json({
        ...plan,
        aiPlan: {
          summary: aiPlan.summary,
          weeklyPlan: aiPlan.weeklyPlan,
          recommendations: aiPlan.recommendations || [],
          totalTasks: planData.totalTasks,
        },
      });
    } catch (error: any) {
      console.error("Error generating AI study plan:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to generate AI study plan" });
    }
  });

  app.get("/api/study-plans/user/:id", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getUserStudyPlan(req.params.id);
      if (!plan) return res.status(404).json({ message: "Study plan not found" });
      if (plan.userId !== (req.user as any)?.id) return res.status(403).json({ message: "Access denied" });
      res.json(plan);
    } catch (error) {
      console.error("Error fetching study plan:", error);
      res.status(500).json({ message: "Failed to fetch study plan" });
    }
  });

  app.patch("/api/study-plans/user/:id", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getUserStudyPlan(req.params.id);
      if (!plan) return res.status(404).json({ message: "Study plan not found" });
      if (plan.userId !== (req.user as any)?.id) return res.status(403).json({ message: "Access denied" });
      res.json(await storage.updateUserStudyPlan(req.params.id, req.body));
    } catch (error) {
      console.error("Error updating study plan:", error);
      res.status(500).json({ message: "Failed to update study plan" });
    }
  });

  app.get("/api/study-schedule/:planId", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getUserStudyPlan(req.params.planId);
      if (!plan) return res.status(404).json({ message: "Study plan not found" });
      if (plan.userId !== (req.user as any)?.id) return res.status(403).json({ message: "Access denied" });
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      res.json(await storage.getStudySchedule(req.params.planId, startDate, endDate));
    } catch (error) {
      console.error("Error fetching study schedule:", error);
      res.status(500).json({ message: "Failed to fetch study schedule" });
    }
  });

  app.patch("/api/study-schedule/:itemId/complete", requireAuth, async (req, res) => {
    try {
      res.json(await storage.updateStudyScheduleItem(req.params.itemId, { isCompleted: true, completedAt: new Date() }));
    } catch (error) {
      console.error("Error completing schedule item:", error);
      res.status(500).json({ message: "Failed to complete schedule item" });
    }
  });

  app.patch("/api/study-plans/:planId/task/:week/:day/complete", requireAuth, async (req, res) => {
    try {
      const { planId, week, day } = req.params;
      const { isCompleted } = req.body;
      const plan = await storage.getUserStudyPlan(planId);
      if (!plan) return res.status(404).json({ message: "Study plan not found" });
      if (plan.userId !== (req.user as any)?.id) return res.status(403).json({ message: "Access denied" });

      const taskKey = `${week}-${day}`;
      const completedTaskKeys = (plan as any).completedTaskKeys || [];
      const newCompletedTaskKeys = isCompleted
        ? completedTaskKeys.includes(taskKey)
          ? completedTaskKeys
          : [...completedTaskKeys, taskKey]
        : completedTaskKeys.filter((k: string) => k !== taskKey);
      const newCompletedCount = newCompletedTaskKeys.length;

      await storage.updateUserStudyPlan(planId, {
        completedTaskKeys: newCompletedTaskKeys,
        completedTasks: newCompletedCount,
        lastActivityAt: new Date(),
      } as any);

      res.json({
        success: true,
        completedTasks: newCompletedCount,
        totalTasks: plan.totalTasks,
        completedTaskKeys: newCompletedTaskKeys,
      });
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.get("/api/study-progress/:planId", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getUserStudyPlan(req.params.planId);
      if (!plan) return res.status(404).json({ message: "Study plan not found" });
      if (plan.userId !== (req.user as any)?.id) return res.status(403).json({ message: "Access denied" });
      res.json(await storage.getStudyProgress(req.params.planId));
    } catch (error) {
      console.error("Error fetching study progress:", error);
      res.status(500).json({ message: "Failed to fetch study progress" });
    }
  });
}
