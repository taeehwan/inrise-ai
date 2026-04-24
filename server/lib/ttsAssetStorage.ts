import type { InsertListeningTtsAsset, ListeningTtsAsset } from "@shared/schema";
import { aiGeneratedTests, listeningTtsAssets as listeningTtsAssetsTable, newToeflListeningTests as newToeflListeningTestsTable } from "@shared/schema";
import { eq, like, or } from "drizzle-orm";
import { db } from "../db";

export async function getTtsAssetByHashRecord(scriptHash: string): Promise<ListeningTtsAsset | null> {
  try {
    const [asset] = await db
      .select()
      .from(listeningTtsAssetsTable)
      .where(eq(listeningTtsAssetsTable.scriptHash, scriptHash))
      .limit(1);
    return asset || null;
  } catch (error) {
    console.error("Failed to get TTS asset by hash:", error);
    return null;
  }
}

export async function saveTtsAssetRecord(asset: InsertListeningTtsAsset): Promise<ListeningTtsAsset> {
  const [created] = await db
    .insert(listeningTtsAssetsTable)
    .values(asset)
    .onConflictDoUpdate({
      target: listeningTtsAssetsTable.scriptHash,
      set: {
        voiceProfile: asset.voiceProfile,
        audioUrl: asset.audioUrl,
        duration: asset.duration,
        sizeBytes: asset.sizeBytes,
        metadata: asset.metadata ?? null,
      },
    })
    .returning();
  console.log("✅ TTS asset cached:", created.id, "hash:", asset.scriptHash?.substring(0, 12));
  return created;
}

export async function clearChooseResponseTtsCacheRecord(): Promise<{
  deletedCacheRows: number;
  clearedTests: number;
  clearedScriptTests: number;
}> {
  let deletedCacheRows = 0;
  let clearedTests = 0;
  let clearedScriptTests = 0;

  try {
    const result = await db
      .delete(listeningTtsAssetsTable)
      .where(
        or(
          eq(listeningTtsAssetsTable.voiceProfile, "choose-response"),
          like(listeningTtsAssetsTable.metadata, "%optionTimestamps%"),
        ),
      )
      .returning();
    deletedCacheRows = result.length;
  } catch (error) {
    console.error("Failed to delete choose-response TTS cache:", error);
  }

  try {
    const tests = await db.select().from(newToeflListeningTestsTable).orderBy(newToeflListeningTestsTable.createdAt);
    for (const test of tests) {
      const items: any[] = Array.isArray(test.listenAndChoose) ? (test.listenAndChoose as any[]) : [];
      const cleaned = items.map((item: any) => {
        const { audioUrl, optionTimestamps, ...rest } = item;
        return rest;
      });
      const hadAudio = items.some((item: any) => item.audioUrl || item.optionTimestamps);
      if (hadAudio) {
        await db
          .update(newToeflListeningTestsTable)
          .set({ listenAndChoose: cleaned as any })
          .where(eq(newToeflListeningTestsTable.id, test.id));
        clearedTests++;
      }
    }
  } catch (error) {
    console.error("Failed to clear listenAndChoose audio data:", error);
  }

  try {
    const aiTests = await db.select().from(aiGeneratedTests).where(eq(aiGeneratedTests.section, "listening"));
    for (const test of aiTests) {
      const testData = test.testData as any;
      const scripts: any[] = testData?.scripts || [];
      let modified = false;
      const cleanedScripts = scripts.map((script: any) => {
        if (script.type === "choose-response" && script.audioUrl) {
          modified = true;
          const { audioUrl, ...rest } = script;
          if (Array.isArray(rest.questions)) {
            rest.questions = rest.questions.map((question: any) => {
              const { optionTimestamps, ...questionRest } = question;
              return questionRest;
            });
          }
          return rest;
        }
        return script;
      });
      if (modified) {
        await db.update(aiGeneratedTests).set({ testData: { ...testData, scripts: cleanedScripts } }).where(eq(aiGeneratedTests.id, test.id));
        clearedScriptTests++;
      }
    }
  } catch (error) {
    console.error("Failed to clear script-based choose-response audio:", error);
  }

  return { deletedCacheRows, clearedTests, clearedScriptTests };
}
