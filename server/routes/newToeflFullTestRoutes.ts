import type { Express } from "express";
import { storage } from "../storage";
import { optionalAuth, requireAdmin, requireAuth } from "../middleware/auth";

export function registerNewToeflFullTestRoutes(app: Express) {
  app.get("/api/new-toefl/full-tests", optionalAuth, async (_req, res) => {
    try {
      const tests = await storage.getNewToeflFullTests();
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/new-toefl/full-tests/:id", optionalAuth, async (req, res) => {
    try {
      const test = await storage.getNewToeflFullTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Full test not found" });
      }
      res.json(test);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/new-toefl/full-tests", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const test = await storage.createNewToeflFullTest({ ...req.body, createdBy: req.user.id });
      res.status(201).json(test);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/new-toefl/full-tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const test = await storage.updateNewToeflFullTest(req.params.id, req.body);
      res.json(test);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/new-toefl/full-tests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteNewToeflFullTest(req.params.id);
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
