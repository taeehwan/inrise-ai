import type { Express } from "express";
import { storage } from "../storage";

export function registerLiveActivityRoutes(app: Express) {
  app.get("/api/live-activities", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
      const activities = await storage.getLiveActivities(limit);
      res.json(activities);
    } catch (error: any) {
      console.error("Get live activities error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/live-activities/recent", async (req, res) => {
    try {
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const activities = await storage.getRecentLiveActivities(since);
      res.json(activities);
    } catch (error: any) {
      console.error("Get recent live activities error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/live-activities", async (req, res) => {
    try {
      const { type, title, description, displayName, scoreValue, section, examType, isHighlight } = req.body;
      if (!type || !title || !description || !displayName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const activity = await storage.createLiveActivity({
        type,
        title,
        description,
        displayName,
        scoreValue,
        section,
        examType,
        isHighlight: isHighlight || false,
        expiresAt,
      });

      if ((global as any).broadcastLiveActivity) {
        (global as any).broadcastLiveActivity(activity);
      }

      res.json(activity);
    } catch (error: any) {
      console.error("Create live activity error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
