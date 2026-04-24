import type { Express } from "express";
import multer from "multer";
import OpenAI from "openai";
import { insertUserSchema } from "@shared/schema";
import { getOpenAIModel } from "../openaiModels";
import { requireAdmin, requireAuth, requireOwnershipOrAdmin, type AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { generateTTSAudio } from "../lib/ttsAudio";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function registerAdminManagementRoutes(app: Express) {
  app.post("/api/admin/convert-image-to-text", requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const base64Image = req.file.buffer.toString("base64");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text from this image. Include paragraphs, questions, answer choices, and any other textual content. Format it clearly with proper line breaks.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
            ],
          },
        ],
        max_completion_tokens: 2000,
      });

      res.json({ text: response.choices[0].message.content });
    } catch (error: any) {
      console.error("Image to text conversion error:", error);
      res.status(500).json({ error: "Failed to convert image to text" });
    }
  });

  app.post("/api/admin/text-to-speech", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const buffer = await generateTTSAudio(text, "nova");
      res.json({
        message: "Audio generated successfully",
        audioId: `audio_${Date.now()}.mp3`,
        size: buffer.length,
        duration: Math.ceil(text.length / 150),
      });
    } catch (error: any) {
      console.error("Text to speech error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  app.patch("/api/admin/users/:userId/role", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "유효하지 않은 역할입니다. 'user' 또는 'admin'만 가능합니다." });
      }

      if (userId === req.user?.id) {
        return res.status(400).json({ message: "자신의 역할은 변경할 수 없습니다." });
      }

      const updatedUser = await storage.updateUser(userId, { role });
      res.json({
        message: `사용자 역할이 '${role}'로 변경되었습니다.`,
        user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      });
    } catch (error: any) {
      console.error("Admin role change error:", error);
      res.status(500).json({ message: "사용자 역할 변경 중 오류가 발생했습니다." });
    }
  });

  app.patch("/api/admin/users/:userId/status", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive는 true 또는 false 값이어야 합니다." });
      }

      if (userId === req.user?.id && !isActive) {
        return res.status(400).json({ message: "자신의 계정은 비활성화할 수 없습니다." });
      }

      const updatedUser = await storage.updateUser(userId, { isActive });
      res.json({
        message: `사용자가 ${isActive ? "활성화" : "비활성화"}되었습니다.`,
        user: { id: updatedUser.id, email: updatedUser.email, isActive: updatedUser.isActive },
      });
    } catch (error: any) {
      console.error("Admin status change error:", error);
      res.status(500).json({ message: "사용자 상태 변경 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/users/:userId/attempts", requireAuth, requireOwnershipOrAdmin("userId"), async (req, res) => {
    try {
      const attempts = await storage.getUserTestAttempts(req.params.userId);
      res.json(attempts);
    } catch (error: any) {
      console.error("Get user attempts error:", error);
      res.status(500).json({ message: "테스트 시도 기록 조회 중 오류가 발생했습니다." });
    }
  });

  app.patch("/api/users/:userId", requireAuth, requireOwnershipOrAdmin("userId"), async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req as AuthenticatedRequest;

      if (currentUser.user?.role !== "admin" && req.body.role) {
        delete req.body.role;
      }

      const validatedData = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(userId, validatedData);
      res.json({
        message: "프로필이 성공적으로 업데이트되었습니다.",
        user: updatedUser,
      });
    } catch (error: any) {
      console.error("Update user error:", error);
      res.status(400).json({ message: `프로필 업데이트 중 오류가 발생했습니다: ${error.message}` });
    }
  });

  app.post("/api/objects/upload", requireAuth, async (_req, res) => {
    try {
      const { ObjectStorageService } = await import("../objectStorage");
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadTarget();
      res.json({ uploadURL, objectPath });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "업로드 URL 생성 실패" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const { ObjectStorageService } = await import("../objectStorage");
      const objectStorageService = new ObjectStorageService();
      await objectStorageService.downloadObject(req.path, res);
    } catch (error: any) {
      console.error("Error serving object:", error);
      if (error.name === "ObjectNotFoundError") {
        return res.status(404).json({ message: "파일을 찾을 수 없습니다" });
      }
      res.status(500).json({ message: "파일 서비스 오류" });
    }
  });
}
