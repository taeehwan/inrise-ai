import type { Express } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { storage } from "../storage";

export function registerSurveyRoutes(app: Express) {
  app.get("/api/survey/active", requireAuth, async (req: any, res) => {
    try {
      const user = req.user as any;
      const survey = await storage.getActiveSurvey();
      if (!survey) return res.json({ survey: null, hasResponded: false });
      const hasResponded = await storage.hasUserRespondedToSurvey(survey.id, user.id);
      res.json({ survey, hasResponded });
    } catch (error) {
      console.error("Error fetching active survey:", error);
      res.status(500).json({ error: "Failed to fetch survey" });
    }
  });

  app.post("/api/survey/respond", requireAuth, async (req: any, res) => {
    try {
      const user = req.user as any;
      const { surveyId, answers } = req.body;
      if (!surveyId || !answers) return res.status(400).json({ error: "surveyId and answers are required" });

      const alreadyResponded = await storage.hasUserRespondedToSurvey(surveyId, user.id);
      if (alreadyResponded) return res.status(409).json({ error: "Already responded to this survey" });

      await storage.createSurveyResponse({ surveyId, userId: user.id, answers });

      let credits;
      try {
        credits = await storage.addCredits(user.id, 50, "bonus", "설문 참여 감사 크레딧", "bonus", `survey-${surveyId}`);
      } catch (credErr) {
        console.error("Error adding survey credits:", credErr);
      }

      res.json({
        success: true,
        message: "설문 응답이 저장되었습니다. 크레딧 50개가 지급되었습니다!",
        creditsAwarded: 50,
        newBalance: credits?.balance,
      });
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ error: "Already responded" });
      console.error("Error submitting survey response:", error);
      res.status(500).json({ error: "Failed to submit survey response" });
    }
  });

  app.get("/api/admin/survey-stats", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const survey = await storage.getActiveSurvey();
      if (!survey) return res.json({ survey: null, stats: null });
      const stats = await storage.getSurveyStats(survey.id);
      res.json({ survey, stats });
    } catch (error) {
      console.error("Error fetching survey stats:", error);
      res.status(500).json({ error: "Failed to fetch survey stats" });
    }
  });
}
