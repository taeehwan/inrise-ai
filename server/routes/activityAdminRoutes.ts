import type { Express } from "express";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";

const isPathWithinUploads = (filePath: string, uploadsDir: string): boolean => {
  const normalizedPath = path.resolve(filePath);
  const normalizedUploads = path.resolve(uploadsDir);
  return normalizedPath.startsWith(normalizedUploads + path.sep) || normalizedPath === normalizedUploads;
};

const sanitizeFilename = (filename: string): string | null => {
  if (!filename) return null;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\") || filename.includes("\0")) {
    return null;
  }
  const sanitized = path.basename(filename);
  if (sanitized !== filename || sanitized.startsWith(".")) {
    return null;
  }
  return sanitized;
};

export function registerActivityAdminRoutes(app: Express) {
  app.post("/api/user-activity/log", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { activityType, details, duration, score } = req.body;

      if (!activityType) {
        return res.status(400).json({ message: "Activity type is required" });
      }

      const activity = await storage.createUserActivity({
        userId: req.user!.id,
        activityType,
        details: details || {},
        duration: duration || 0,
        score: score || null,
      });

      res.status(201).json(activity);
    } catch (error: any) {
      console.error("Error logging user activity:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user-activity/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const activities = await storage.getUserActivity(
        req.user!.id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      const totalActivities = activities.length;
      const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
      const activityTypeCounts = activities.reduce((acc, a) => {
        acc[a.activityType] = (acc[a.activityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const activityTypeDurations = activities.reduce((acc, a) => {
        acc[a.activityType] = (acc[a.activityType] || 0) + (a.duration || 0);
        return acc;
      }, {} as Record<string, number>);
      const dailyActivities = activities.reduce((acc, a) => {
        const date = a.createdAt!.toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        totalActivities,
        totalDuration,
        activityTypeCounts,
        activityTypeDurations,
        dailyActivities,
        averageDuration: totalActivities > 0 ? Math.round(totalDuration / totalActivities) : 0,
        recentActivities: activities.slice(0, 10),
      });
    } catch (error: any) {
      console.error("Error fetching user activity stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/activity-stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await storage.getActivityStats();
      res.json({
        ...stats,
        filters: { startDate: startDate || null, endDate: endDate || null },
      });
    } catch (error: any) {
      console.error("Error fetching admin activity stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/audio-files", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const audioSubDir = path.join(uploadsDir, "audio");

      if (!existsSync(uploadsDir)) {
        return res.json({ files: [], totalSize: 0, totalCount: 0 });
      }

      const detectAudioType = (name: string): string => {
        if (name.startsWith("new_toefl_listening_")) return "new-toefl";
        if (name.startsWith("listening_bulk_")) return "new-toefl";
        if (name.startsWith("listening_passage_")) return "new-toefl";
        if (name.includes("listening_audio")) return "listening";
        if (name.startsWith("listening_toefl_")) return "listening";
        if (name.startsWith("listening_")) return "listening";
        if (name.includes("question_audio")) return "question";
        if (name.startsWith("question_")) return "question";
        if (name.startsWith("tts_")) return "tts";
        if (name.includes("speaking")) return "speaking";
        if (name.includes("lecture")) return "lecture";
        if (name.includes("conversation")) return "conversation";
        return "other";
      };

      const audioFiles: Array<{
        name: string;
        path: string;
        size: number;
        createdAt: Date;
        type: string;
        source: string;
      }> = [];

      const scanDir = async (dirPath: string, source: string, urlPrefix: string) => {
        if (!existsSync(dirPath)) return;
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          const sanitizedName = sanitizeFilename(file);
          if (!sanitizedName || !/\.(mp3|wav|webm|ogg)$/i.test(sanitizedName)) continue;
          const filePath = path.join(dirPath, sanitizedName);
          if (!isPathWithinUploads(filePath, uploadsDir)) continue;
          try {
            const stats = await fs.stat(filePath);
            if (!stats.isFile()) continue;
            audioFiles.push({
              name: sanitizedName,
              path: `${urlPrefix}${sanitizedName}`,
              size: stats.size,
              createdAt: stats.birthtime,
              type: detectAudioType(sanitizedName),
              source,
            });
          } catch {}
        }
      };

      await scanDir(uploadsDir, "root", "/uploads/");
      await scanDir(audioSubDir, "audio", "/uploads/audio/");
      audioFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const totalSize = audioFiles.reduce((sum, f) => sum + f.size, 0);

      res.json({
        files: audioFiles,
        totalCount: audioFiles.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      });
    } catch (error: any) {
      console.error("Error fetching audio files:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/audio-files/download-all", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const archiver = await import("archiver");
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const audioSubDir = path.join(uploadsDir, "audio");

      if (!existsSync(uploadsDir)) {
        return res.status(404).json({ message: "No uploads directory found" });
      }

      interface ZipEntry { absPath: string; zipName: string; }
      const zipEntries: ZipEntry[] = [];

      const collectAudio = async (dirPath: string, zipFolder: string) => {
        if (!existsSync(dirPath)) return;
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          const sanitizedName = sanitizeFilename(file);
          if (!sanitizedName || !/\.(mp3|wav|webm|ogg)$/i.test(sanitizedName)) continue;
          const filePath = path.join(dirPath, sanitizedName);
          if (!isPathWithinUploads(filePath, uploadsDir)) continue;
          try {
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              zipEntries.push({ absPath: filePath, zipName: `${zipFolder}/${sanitizedName}` });
            }
          } catch {}
        }
      };

      await collectAudio(uploadsDir, "root");
      await collectAudio(audioSubDir, "new_toefl");

      if (zipEntries.length === 0) {
        return res.status(404).json({ message: "No audio files found" });
      }

      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="tts_audio_files_${timestamp}.zip"`);

      const archive = archiver.default("zip", { zlib: { level: 5 } });
      let headersSent = false;
      archive.on("error", (err: Error) => {
        console.error("Archive error:", err);
        if (!headersSent) res.status(500).json({ message: "Failed to create ZIP archive" });
        else res.end();
      });
      res.on("close", () => {
        headersSent = true;
      });
      archive.pipe(res);

      for (const entry of zipEntries) {
        archive.file(entry.absPath, { name: entry.zipName });
      }

      try {
        await archive.finalize();
      } catch (finalizeErr) {
        console.error("Error finalizing archive:", finalizeErr);
        if (!res.headersSent) res.status(500).json({ message: "Failed to finalize ZIP archive" });
        else res.end();
      }
    } catch (error: any) {
      console.error("Error creating audio ZIP:", error);
      if (!res.headersSent) res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/audio-files/:filename", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { filename } = req.params;
      const source = req.query.source as string | undefined;
      const sanitizedName = sanitizeFilename(filename);
      if (!sanitizedName) {
        return res.status(400).json({ message: "Invalid filename" });
      }
      if (!/\.(mp3|wav|webm|ogg)$/i.test(sanitizedName)) {
        return res.status(400).json({ message: "Only audio files can be deleted" });
      }

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const targetDir = source === "audio" ? path.join(uploadsDir, "audio") : uploadsDir;
      const filePath = path.join(targetDir, sanitizedName);

      if (!isPathWithinUploads(filePath, uploadsDir)) {
        return res.status(400).json({ message: "Invalid file path" });
      }
      if (!existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return res.status(400).json({ message: "Not a file" });
      }

      await fs.unlink(filePath);
      res.json({ message: "File deleted successfully", filename: sanitizedName });
    } catch (error: any) {
      console.error("Error deleting audio file:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
