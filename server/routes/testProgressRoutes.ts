import type { Express } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { insertTestProgressSchema } from "@shared/schema";
import { storage } from "../storage";

export function registerTestProgressRoutes(app: Express) {
  app.get("/api/test-progress", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const progressList = await storage.getUserTestProgressList(req.user.id);
      res.json(progressList);
    } catch (error: any) {
      console.error("Error getting test progress list:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/test-progress/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { testSetAttemptId, testAttemptId } = req.query;
      const progress = await storage.getTestProgress(
        req.user.id,
        testSetAttemptId as string | undefined,
        testAttemptId as string | undefined,
      );
      if (!progress) {
        return res.status(404).json({ message: "Test progress not found" });
      }
      res.json(progress);
    } catch (error: any) {
      console.error("Error getting test progress:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/test-progress", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const validated = insertTestProgressSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const progress = await storage.createTestProgress(validated);
      res.status(201).json(progress);
    } catch (error: any) {
      console.error("Error creating test progress:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/test-progress/:id", requireAuth, async (_req: AuthenticatedRequest, res) => {
    try {
      const { id } = _req.params;
      const progress = await storage.updateTestProgress(id, _req.body);
      res.json(progress);
    } catch (error: any) {
      console.error("Error updating test progress:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/test-progress/:id/pause", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { id } = req.params;
      const progress = await storage.pauseTestProgress(id);
      res.json(progress);
    } catch (error: any) {
      console.error("Error pausing test:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/test-progress/:id/resume", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { id } = req.params;
      const progress = await storage.resumeTestProgress(id);
      res.json(progress);
    } catch (error: any) {
      console.error("Error resuming test:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/test-progress/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { id } = req.params;
      await storage.deleteTestProgress(id);
      res.json({ message: "Test progress deleted" });
    } catch (error: any) {
      console.error("Error deleting test progress:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
