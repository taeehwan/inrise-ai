import type { Express } from "express";
import multer from "multer";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { insertAchievementSchema } from "@shared/schema";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { sanitizeUploadedFilename } from "../lib/uploadFilename";
import { storage } from "../storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function registerAchievementRoutes(app: Express) {
  app.get("/api/achievements", async (_req, res) => {
    try {
      const achievements = await storage.getActiveAchievements();
      res.json(achievements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/achievements", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/achievements", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertAchievementSchema.parse(req.body);
      const achievement = await storage.createAchievement(validatedData);
      res.status(201).json(achievement);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/achievements/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const achievement = await storage.updateAchievement(req.params.id, req.body);
      res.json(achievement);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/achievements/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteAchievement(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/upload-achievement-image", requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "이미지 파일이 필요합니다." });
      }

      const uploadsDir = path.join(__dirname, "../../uploads/achievements");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `achievement-${Date.now()}-${sanitizeUploadedFilename(req.file.originalname)}`;
      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, req.file.buffer);

      res.json({ url: `/uploads/achievements/${fileName}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
