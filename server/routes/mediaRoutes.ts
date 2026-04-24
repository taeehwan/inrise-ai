import type { Express } from "express";
import express from "express";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSafeUploadPath } from "../lib/uploadPath";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerMediaRoutes(app: Express) {
  const uploadsRoot = path.resolve(__dirname, "../../uploads");

  app.use("/uploads", (req, res, next) => {
    const localPath = resolveSafeUploadPath(uploadsRoot, req.path);
    if (localPath && existsSync(localPath)) {
      return next();
    }

    if (req.path.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      const filename = path.basename(req.path);
      import("../audioStorage")
        .then(({ getAudioFromStorage }) =>
          getAudioFromStorage(filename)
            .then((buffer) => {
              if (buffer) {
                res.set({
                  "Content-Type": "audio/mpeg",
                  "Content-Length": buffer.length.toString(),
                  "Cache-Control": "public, max-age=31536000",
                });
                res.send(buffer);
              } else {
                res.status(404).json({ error: "File not found" });
              }
            })
            .catch(() => next()),
        )
        .catch(() => next());
      return;
    }

    next();
  }, express.static(uploadsRoot));

  console.log("Static file serving enabled for /uploads (with Object Storage fallback)");

  app.get("/api/audio/:filename", async (req, res) => {
    try {
      const { getAudioFromStorage } = await import("../audioStorage");
      const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, "");
      const audioBuffer = await getAudioFromStorage(filename);

      if (!audioBuffer) {
        const localPath = resolveSafeUploadPath(uploadsRoot, filename);
        if (localPath && existsSync(localPath)) {
          return res.sendFile(localPath);
        }

        return res.status(404).json({ error: "Audio file not found" });
      }

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
        "Accept-Ranges": "bytes",
      });
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error serving audio:", error);
      res.status(500).json({ error: "Failed to serve audio" });
    }
  });
}
