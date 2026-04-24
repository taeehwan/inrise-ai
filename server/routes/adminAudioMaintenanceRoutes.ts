import type { Express } from "express";
import OpenAI from "openai";
import path from "path";
import { existsSync } from "fs";
import { sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { storage } from "../storage";
import { OPENAI_TTS_MODEL } from "../openaiModels";
import { buildChooseResponseQuestionText, getSpeakerGender, parseDialogueSegments, stripSpeakerLabels } from "../lib/audioText";
import { buildChooseResponseAudio, generateMultiVoiceConversationAudio, generateTTSAudio } from "../lib/ttsAudio";

export function registerAdminAudioMaintenanceRoutes(app: Express) {
  app.post("/api/admin/migrate-audio-to-storage", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { migrateAllLocalToObjectStorage } = await import("../audioStorage");
      const result = await migrateAllLocalToObjectStorage();

      let dbUpdated = 0;
      try {
        const { db } = await import("../db");
        const updateResult = await db.execute(sql`
          UPDATE listening_tts_assets
          SET audio_url = REPLACE(audio_url, '/uploads/', '/api/audio/')
          WHERE audio_url LIKE '/uploads/%'
        `);
        dbUpdated = Number((updateResult as any)?.rowCount || 0);
        console.log(`📦 Updated ${dbUpdated} TTS asset URLs from /uploads/ to /api/audio/`);
      } catch (dbErr) {
        console.error("DB URL update error:", dbErr);
      }

      console.log(`Audio migration: ${result.migrated} migrated, ${result.skipped} already in storage, ${result.failed} failed`);
      res.json({ message: "Migration complete", ...result, dbUpdated });
    } catch (error: any) {
      console.error("Audio migration error:", error);
      res.status(500).json({ message: "Migration failed", error: error.message });
    }
  });

  app.post("/api/admin/clear-choose-response-cache", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const result = await (storage as any).clearChooseResponseTtsCache();
      console.log(
        `✅ Choose-response cache cleared: ${result.deletedCacheRows} cache rows, ${result.clearedTests} new-toefl tests, ${result.clearedScriptTests} script tests`,
      );
      res.json({
        message: "캐시가 성공적으로 초기화되었습니다.",
        deletedCacheRows: result.deletedCacheRows,
        clearedTests: result.clearedTests,
        clearedScriptTests: result.clearedScriptTests,
      });
    } catch (error: any) {
      console.error("Error clearing choose-response cache:", error);
      res.status(500).json({ message: "캐시 초기화 실패", error: error.message });
    }
  });

  app.post("/api/admin/generate-all-listening-audio", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { uploadAudioToStorage, audioFileExistsInStorage } = await import("../audioStorage");
      const crypto = await import("crypto");

      let totalGenerated = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      const results: any[] = [];

      const generateAudioForContent = async (
        content: string,
        contentType: string,
        itemOptions?: string[],
      ): Promise<{ url: string; optionTimestamps?: any[] } | null> => {
        try {
          let buffer: Buffer;
          let optionTimestamps: any[] | undefined;

          if (contentType === "choose-response") {
            const dialogueSegs = parseDialogueSegments(content);
            const speakerGender = dialogueSegs.length > 0 ? getSpeakerGender(dialogueSegs[0].speaker) : "unknown";
            const questionVoice = speakerGender === "female" ? "nova" : speakerGender === "male" ? "onyx" : "nova";
            const optionVoice = questionVoice === "nova" ? "onyx" : "nova";
            const opts = itemOptions && itemOptions.length > 0 ? itemOptions.map(String) : [];

            let questionText = buildChooseResponseQuestionText(content, opts);
            if (!questionText) questionText = "What is the best response?";

            if (opts.length > 0) {
              const result = await buildChooseResponseAudio(questionText, opts, questionVoice, optionVoice);
              buffer = result.audioBuffer;
              optionTimestamps = result.optionTimestamps;
            } else {
              buffer = await generateTTSAudio(questionText.substring(0, 4096), questionVoice);
            }
          } else {
            const hasMultiSpeakerBulk = contentType === "conversation" && parseDialogueSegments(content).length > 1;
            if (hasMultiSpeakerBulk) {
              buffer = await generateMultiVoiceConversationAudio(content);
            } else {
              const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
              const voiceMap: Record<string, string> = {
                conversation: "nova",
                lecture: "nova",
                announcement: "nova",
              };
              const mp3 = await openaiClient.audio.speech.create({
                model: OPENAI_TTS_MODEL,
                voice: (voiceMap[contentType] || "nova") as any,
                input: stripSpeakerLabels(content).substring(0, 4096),
                speed: 1.0,
              });
              buffer = Buffer.from(await mp3.arrayBuffer());
            }
          }

          const hash = crypto.createHash("sha256").update(content + contentType).digest("hex").substring(0, 16);
          const filename = `listening_bulk_${hash}.mp3`;
          const url = await uploadAudioToStorage(buffer, filename);
          const sizeBytes = buffer.length;
          const estimatedDuration = Math.round(sizeBytes / 16000);
          const cacheMetadata: any = {};
          if (optionTimestamps && optionTimestamps.length > 0) {
            cacheMetadata.optionTimestamps = optionTimestamps;
          }
          const scriptHash = crypto
            .createHash("sha256")
            .update(content + contentType + (itemOptions || []).join(","))
            .digest("hex");
          try {
            await storage.saveTtsAsset({
              scriptHash,
              voiceProfile: contentType,
              audioUrl: url,
              duration: estimatedDuration,
              sizeBytes,
              metadata: Object.keys(cacheMetadata).length > 0 ? JSON.stringify(cacheMetadata) : undefined,
            });
          } catch (cacheErr) {
            console.warn("⚠️ [Bulk] TTS cache save failed (non-fatal):", cacheErr);
          }

          return { url, optionTimestamps };
        } catch (err: any) {
          console.error("❌ [Bulk TTS] Failed:", err?.message);
          return null;
        }
      };

      const allNewTests = await storage.getNewToeflListeningTests();
      for (const test of allNewTests) {
        const categories = [
          { items: (test.listenAndChoose as any[]) || [], type: "listen-choose", contentType: "choose-response" },
          { items: (test.conversations as any[]) || [], type: "conversation", contentType: "conversation" },
          { items: (test.announcements as any[]) || [], type: "announcement", contentType: "announcement" },
          { items: (test.academicTalks as any[]) || [], type: "academic-talk", contentType: "lecture" },
        ];
        let testUpdated = false;
        for (const cat of categories) {
          for (let i = 0; i < cat.items.length; i++) {
            const item = cat.items[i];
            if (item.audioUrl) {
              const fileName = path.basename(item.audioUrl);
              if (item.audioUrl.startsWith("/api/audio/") && (await audioFileExistsInStorage(fileName))) {
                totalSkipped++;
                continue;
              }
            }
            let content = item.dialogue || item.content || item.script || item.audioScript || "";
            if (Array.isArray(content)) {
              content = content
                .map((e: any) => (typeof e === "object" && e.speaker ? `${e.speaker}: ${e.text}` : String(e)))
                .join("\n");
            }
            if (!content || typeof content !== "string") {
              totalSkipped++;
              continue;
            }
            const itemOpts = Array.isArray(item.options) ? item.options.map(String) : [];
            const audioResult = await generateAudioForContent(content, cat.contentType, itemOpts);
            if (audioResult) {
              item.audioUrl = audioResult.url;
              if (audioResult.optionTimestamps && audioResult.optionTimestamps.length > 0) {
                item.optionTimestamps = audioResult.optionTimestamps;
              }
              testUpdated = true;
              totalGenerated++;
            } else {
              totalFailed++;
            }
          }
        }
        if (testUpdated) {
          await storage.updateNewToeflListeningTest(test.id, {
            listenAndChoose: categories[0].items,
            conversations: categories[1].items,
            announcements: categories[2].items,
            academicTalks: categories[3].items,
          });
        }
        results.push({ id: test.id, title: test.title, table: "new_toefl_listening_tests" });
      }

      const allAiTests = await storage.getAllAIGeneratedTests();
      const listeningTests = allAiTests.filter((t: any) => t.section === "listening" && !t.id.startsWith("ai-toefl-listening"));
      for (const test of listeningTests) {
        const passages = test.passages || [];
        if (!passages[0]?.questions) continue;
        let testUpdated = false;
        const questions = passages[0].questions;
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (q.audioUrl) {
            const fileName = path.basename(q.audioUrl);
            if (q.audioUrl.startsWith("/api/audio/") && (await audioFileExistsInStorage(fileName))) {
              totalSkipped++;
              continue;
            }
            if (q.audioUrl.startsWith("/uploads/")) {
              const localCheck = path.join(process.cwd(), "uploads", fileName);
              if (existsSync(localCheck)) {
                const { migrateLocalFileToStorage } = await import("../audioStorage");
                const newUrl = await migrateLocalFileToStorage(localCheck, fileName);
                if (newUrl) {
                  q.audioUrl = newUrl;
                  testUpdated = true;
                  totalSkipped++;
                  continue;
                }
              }
            }
          }
          const content = q.audioScript || q.script || q.prompt || "";
          if (!content || typeof content !== "string") {
            totalSkipped++;
            continue;
          }
          const contentType =
            q.type === "choose-response"
              ? "choose-response"
              : q.type === "announcement"
                ? "announcement"
                : q.type === "conversation"
                  ? "conversation"
                  : "lecture";
          const audioResult = await generateAudioForContent(content, contentType);
          if (audioResult) {
            q.audioUrl = audioResult.url;
            if (audioResult.optionTimestamps && audioResult.optionTimestamps.length > 0) {
              q.optionTimestamps = audioResult.optionTimestamps;
            }
            testUpdated = true;
            totalGenerated++;
          } else {
            totalFailed++;
          }
        }
        if (testUpdated) {
          passages[0].questions = questions;
          await storage.updateAIGeneratedTest(test.id, { passages });
        }
        results.push({ id: test.id, title: test.title, table: "ai_generated_tests" });
      }

      console.log(`🎵 [Bulk TTS] Complete: ${totalGenerated} generated, ${totalSkipped} skipped, ${totalFailed} failed`);
      res.json({
        message: "Bulk audio generation complete",
        generated: totalGenerated,
        skipped: totalSkipped,
        failed: totalFailed,
        tests: results,
      });
    } catch (error: any) {
      console.error("Bulk audio generation error:", error);
      res.status(500).json({ message: "Bulk audio generation failed", error: error.message });
    }
  });
}
