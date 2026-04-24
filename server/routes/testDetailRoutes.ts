import type { Express } from "express";
import OpenAI from "openai";
import path from "path";
import { existsSync } from "fs";
import { storage } from "../storage";
import { optionalAuth } from "../middleware/auth";
import { OPENAI_TTS_MODEL } from "../openaiModels";
import { buildChooseResponseQuestionText, getSpeakerGender, parseDialogueSegments, stripSpeakerLabels } from "../lib/audioText";
import { cleanScriptForTTS, inferScriptType } from "../lib/routeTransforms";
import { buildAiSectionedResponse, buildTestSetAsTestResponse } from "../lib/testPayloads";
import { buildNewToeflListeningPayload, isNewListeningTestId, isUuidLike, stripTestSetPrefix } from "../lib/testRouteHelpers";
import { buildChooseResponseAudio, generateMultiVoiceConversationAudio, generateTTSAudio } from "../lib/ttsAudio";
import { convertNewToeflReadingTestToQuestions } from "../lib/testTransforms";

export function registerTestDetailRoutes(app: Express) {
  app.get("/api/tests/:id", optionalAuth, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching test with ID: ${id}`);

      const isUUID = isUuidLike(id);
      const isNewListeningId = isNewListeningTestId(id);

      if (isUUID || isNewListeningId) {
        const newToeflListeningTest = await storage.getNewToeflListeningTest(id);
        if (newToeflListeningTest) {
          console.log(`Found NEW TOEFL Listening test: ${newToeflListeningTest.title}`);

          const { uploadAudioToStorage, audioFileExistsInStorage } = await import("../audioStorage");

          let testUpdated = false;
          const responseData = buildNewToeflListeningPayload(newToeflListeningTest);
          const { listenAndChoose, conversations, announcements, academicTalks } = responseData;

          let ttsApiFailed = false;

          const hasAllAudio = [...listenAndChoose, ...conversations, ...announcements, ...academicTalks].every(
            (item: any) => item.audioUrl && typeof item.audioUrl === "string" && item.audioUrl.length > 0,
          );

          if (hasAllAudio) {
            console.log("✅ All items already have audio URLs, returning immediately");
            return res.json(responseData);
          }

          const missingAudioCount = [...listenAndChoose, ...conversations, ...announcements, ...academicTalks].filter(
            (item: any) => !item.audioUrl || typeof item.audioUrl !== "string" || item.audioUrl.length === 0,
          ).length;
          console.log(`🎤 ${missingAudioCount} items missing audio, starting background TTS generation...`);

          res.json(responseData);

          const generateTTSForItem = async (item: any, itemType: string, index: number): Promise<boolean> => {
            let content = item.dialogue || item.content || item.script || item.audioScript || "";

            if (Array.isArray(content)) {
              content = content
                .map((entry: any) => {
                  if (typeof entry === "object" && entry.speaker && entry.text) {
                    return `${entry.speaker}: ${entry.text}`;
                  }
                  return typeof entry === "string" ? entry : JSON.stringify(entry);
                })
                .join("\n");
              console.log(`🔄 [TTS] Converted array script to string for ${itemType} ${index} (${content.length} chars)`);
            }

            if (typeof content !== "string") {
              console.warn(`⚠️ [TTS] Content is not a string for ${itemType} ${index}, skipping`);
              return false;
            }

            let contentIsOptionsOnly = false;
            if (!content && itemType === "listen-choose" && Array.isArray(item.options) && item.options.length > 0) {
              const optionsText = item.options
                .map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${opt}`)
                .join("\n");
              content = optionsText;
              contentIsOptionsOnly = true;
              console.log(`🔄 [TTS] Generated script from OPTIONS ONLY for listen-choose ${index}`);
            }

            if (!content) return false;

            if (item.audioUrl) {
              if (typeof item.audioUrl === "string" && item.audioUrl.startsWith("/api/audio/")) {
                const fileName = path.basename(item.audioUrl);
                if (await audioFileExistsInStorage(fileName)) {
                  return false;
                }
              } else if (typeof item.audioUrl === "string" && item.audioUrl.startsWith("/uploads/")) {
                const fileName = path.basename(item.audioUrl);
                const localPath = path.join(process.cwd(), "uploads", fileName);
                if (existsSync(localPath)) {
                  const { migrateLocalFileToStorage } = await import("../audioStorage");
                  const newUrl = await migrateLocalFileToStorage(localPath, fileName);
                  if (newUrl) {
                    item.audioUrl = newUrl;
                    return true;
                  }
                }
              }
              console.log(`⚠️ [TTS] Audio file missing for NEW TOEFL ${itemType} ${index}: ${item.audioUrl} - will regenerate`);
              item.audioUrl = null;
            }

            try {
              console.log(`🎤 [TTS] Generating audio for NEW TOEFL ${itemType} ${index}...`);

              const crypto = await import("crypto");

              const contentTypeForTTS =
                itemType === "listen-choose" ? "choose-response" : itemType === "academic-talk" ? "academic" : "conversation";
              const hashCandidates = [
                crypto.createHash("sha256").update(content + "default" + "" + contentTypeForTTS).digest("hex"),
                crypto.createHash("sha256").update(content + itemType).digest("hex"),
                crypto.createHash("sha256").update(content + "default" + contentTypeForTTS).digest("hex"),
                crypto.createHash("sha256").update(content + "default").digest("hex"),
              ];

              let foundCachedAsset: any = null;
              let usedHash = hashCandidates[0];
              for (const candidateHash of hashCandidates) {
                const cachedAsset = await storage.getTtsAssetByHash(candidateHash);
                if (cachedAsset && cachedAsset.audioUrl) {
                  foundCachedAsset = cachedAsset;
                  usedHash = candidateHash;
                  break;
                }
              }

              const scriptHash = usedHash;

              if (foundCachedAsset) {
                const cachedFileName = path.basename(foundCachedAsset.audioUrl);
                const restoreOptionTimestamps = (asset: any) => {
                  if (itemType === "listen-choose" && asset.metadata) {
                    try {
                      const meta = JSON.parse(asset.metadata);
                      if (meta.optionTimestamps && Array.isArray(meta.optionTimestamps) && meta.optionTimestamps.length > 0) {
                        item.optionTimestamps = meta.optionTimestamps;
                        console.log(
                          `✅ [TTS] Restored optionTimestamps from cache for ${itemType} ${index}: ${meta.optionTimestamps.length} options`,
                        );
                      }
                    } catch {}
                  }
                };
                if (foundCachedAsset.audioUrl.startsWith("/api/audio/") && (await audioFileExistsInStorage(cachedFileName))) {
                  console.log(`✅ [TTS] Using cached audio from storage for NEW TOEFL ${itemType} ${index}`);
                  item.audioUrl = foundCachedAsset.audioUrl;
                  restoreOptionTimestamps(foundCachedAsset);
                  return true;
                }
                const localCachedPath = path.join(process.cwd(), "uploads", cachedFileName);
                if (existsSync(localCachedPath)) {
                  const { migrateLocalFileToStorage } = await import("../audioStorage");
                  const newUrl = await migrateLocalFileToStorage(localCachedPath, cachedFileName);
                  if (newUrl) {
                    item.audioUrl = newUrl;
                    restoreOptionTimestamps(foundCachedAsset);
                    await storage.saveTtsAsset({
                      scriptHash,
                      voiceProfile: foundCachedAsset.voiceProfile || "default",
                      audioUrl: newUrl,
                      duration: foundCachedAsset.duration || 0,
                      sizeBytes: foundCachedAsset.sizeBytes || 0,
                    });
                    return true;
                  }
                }
                console.log(`⚠️ [TTS] Cached file not found anywhere, regenerating for NEW TOEFL ${itemType} ${index}`);
              }

              const audioFileName = `new_toefl_listening_${scriptHash.substring(0, 16)}.mp3`;

              let audioBuffer: Buffer | null = null;
              const ttsType =
                itemType === "listen-choose" ? "choose-response" : itemType === "academic-talk" ? "lecture" : "conversation";

              try {
                console.log(`🎵 [TTS] Using OpenAI TTS for NEW TOEFL ${itemType} ${index}...`);

                if (ttsType === "choose-response") {
                  if (contentIsOptionsOnly) {
                    if (Array.isArray(item.options) && item.options.length > 0) {
                      const result = await buildChooseResponseAudio(null, item.options.map(String), "nova", "nova");
                      audioBuffer = result.audioBuffer;
                      item.optionTimestamps = result.optionTimestamps;
                    } else {
                      audioBuffer = await generateTTSAudio(stripSpeakerLabels(content).substring(0, 4096), "nova");
                    }
                  } else {
                    const dialogueSegs = parseDialogueSegments(content);
                    const speakerGender = dialogueSegs.length > 0 ? getSpeakerGender(dialogueSegs[0].speaker) : "unknown";
                    const questionVoice = speakerGender === "female" ? "nova" : "onyx";
                    const optionVoice = questionVoice === "nova" ? "onyx" : "nova";

                    const itemOpts = Array.isArray(item.options) ? item.options.map(String) : [];
                    let questionText = buildChooseResponseQuestionText(content, itemOpts);
                    if (!questionText) questionText = "What is the best response?";

                    if (Array.isArray(item.options) && item.options.length > 0) {
                      const result = await buildChooseResponseAudio(
                        questionText,
                        item.options.map(String),
                        questionVoice,
                        optionVoice,
                      );
                      audioBuffer = result.audioBuffer;
                      item.optionTimestamps = result.optionTimestamps;
                    } else {
                      audioBuffer = await generateTTSAudio(questionText.substring(0, 4096), questionVoice);
                    }
                  }
                } else {
                  const hasMultipleSpeakers = ttsType === "conversation" && parseDialogueSegments(content).length > 1;

                  if (hasMultipleSpeakers) {
                    console.log(`🎤 [TTS] Multi-voice conversation detected for ${itemType} ${index}`);
                    audioBuffer = await generateMultiVoiceConversationAudio(content);
                  } else {
                    const voiceMap: Record<string, string> = {
                      conversation: "nova",
                      lecture: "nova",
                      announcement: "nova",
                      academic: "nova",
                    };
                    const strippedContent = stripSpeakerLabels(typeof content === "string" ? content : JSON.stringify(content));
                    const truncatedContent = strippedContent.substring(0, 4096);
                    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                    const mp3 = await openaiClient.audio.speech.create({
                      model: OPENAI_TTS_MODEL,
                      voice: (voiceMap[ttsType] || "nova") as any,
                      input: truncatedContent,
                      speed: 1.0,
                    });
                    audioBuffer = Buffer.from(await mp3.arrayBuffer());
                  }
                }
                ttsApiFailed = false;
                console.log(`✅ [TTS] OpenAI TTS succeeded for NEW TOEFL ${itemType} ${index}`);
              } catch (openaiError: any) {
                console.error(`❌ [TTS] OpenAI TTS failed for ${itemType} ${index}:`, openaiError?.message);
                return false;
              }

              item.audioUrl = await uploadAudioToStorage(audioBuffer, audioFileName);

              const sizeBytes = audioBuffer.length;
              const estimatedDuration = Math.round(sizeBytes / 16000);
              const cacheMetadata: any = {};
              if (ttsType === "choose-response" && item.optionTimestamps && Array.isArray(item.optionTimestamps)) {
                cacheMetadata.optionTimestamps = item.optionTimestamps;
              }
              await storage.saveTtsAsset({
                scriptHash,
                voiceProfile: ttsType,
                audioUrl: item.audioUrl,
                duration: estimatedDuration,
                sizeBytes,
                metadata: Object.keys(cacheMetadata).length > 0 ? JSON.stringify(cacheMetadata) : null,
              });

              console.log(`✅ [TTS] Generated and cached audio for NEW TOEFL ${itemType} ${index}: ${item.audioUrl}`);
              return true;
            } catch (ttsError: any) {
              console.error(`❌ [TTS] Failed to generate audio for NEW TOEFL ${itemType} ${index}:`, ttsError);
              return false;
            }
          };

          (async () => {
            try {
              for (let i = 0; i < listenAndChoose.length && !ttsApiFailed; i++) {
                if (await generateTTSForItem(listenAndChoose[i], "listen-choose", i)) testUpdated = true;
              }
              for (let i = 0; i < conversations.length && !ttsApiFailed; i++) {
                if (await generateTTSForItem(conversations[i], "conversation", i)) testUpdated = true;
              }
              for (let i = 0; i < announcements.length && !ttsApiFailed; i++) {
                if (await generateTTSForItem(announcements[i], "announcement", i)) testUpdated = true;
              }
              for (let i = 0; i < academicTalks.length && !ttsApiFailed; i++) {
                if (await generateTTSForItem(academicTalks[i], "academic-talk", i)) testUpdated = true;
              }

              if (testUpdated) {
                try {
                  await storage.updateNewToeflListeningTest(id, {
                    listenAndChoose,
                    conversations,
                    announcements,
                    academicTalks,
                  });
                  console.log(`✅ [TTS] Background: Updated NEW TOEFL Listening test ${id} with new audio URLs`);
                } catch (updateError) {
                  console.error("❌ [TTS] Background: Failed to update test with audio URLs:", updateError);
                }
              }
            } catch (bgError) {
              console.error("❌ [TTS] Background generation error:", bgError);
            }
          })();

          return;
        }

        if (isUUID) {
          const newToeflReadingTest = await storage.getNewToeflReadingTest(id);
          if (newToeflReadingTest) {
            console.log(`Found NEW TOEFL Reading test: ${newToeflReadingTest.title}`);
            const questions = convertNewToeflReadingTestToQuestions(newToeflReadingTest);
            return res.json({
              ...newToeflReadingTest,
              questions,
              examType: "new-toefl",
              section: "reading",
            });
          }
        }
      }

      if (id.startsWith("ai-") || isUUID) {
        const aiTest = await storage.getAIGeneratedTest(id);

        if (aiTest) {
          console.log(`Found AI generated test: ${aiTest.title}`);

          if (aiTest.section === "listening") {
            let script = aiTest.script;
            let audioUrl = aiTest.audioUrl;
            let type = aiTest.type || "conversation";

            if (aiTest.passages && aiTest.passages.length > 0) {
              const passage = aiTest.passages[0];
              script = passage.content || passage.script || script;
              audioUrl = passage.audioUrl || audioUrl;
              type = passage.type || type;
            }

            let scripts = aiTest.scripts || [];
            const questions = aiTest.questions || [];

            console.log(`[API] Returning listening test with ${scripts.length} scripts and ${questions.length} questions`);
            if (scripts.length > 0) {
              console.log(`[API] Script types: ${scripts.map((s: any) => s.type).join(", ")}`);
              console.log(`[API] Script audioUrls: ${scripts.map((s: any) => s.audioUrl || "none").join(", ")}`);
            }

            const { uploadAudioToStorage: uploadAudioForScript, audioFileExistsInStorage: audioExistsForScript } =
              await import("../audioStorage");

            const hasAllScriptAudio = scripts.every((s: any) => {
              if (!s.audioUrl || typeof s.audioUrl !== "string" || s.audioUrl.length === 0) return false;
              const sType = (s.type || "").toLowerCase();
              if (sType === "choose-response" || sType === "listen-and-choose") {
                const hasTs =
                  (Array.isArray(s.optionTimestamps) && s.optionTimestamps.length > 0) ||
                  (Array.isArray(s.questions?.[0]?.optionTimestamps) && s.questions[0].optionTimestamps.length > 0);
                if (!hasTs) {
                  console.log(
                    `⚠️ [TTS] Script ${s.id || "?"} is choose-response but missing optionTimestamps → forcing regeneration`,
                  );
                  return false;
                }
              }
              return true;
            });

            const enhancedTest = {
              ...aiTest,
              script,
              audioUrl,
              type,
              duration: aiTest.duration || 180,
              passages: aiTest.passages || [],
              scripts,
              questions,
            };

            res.json(enhancedTest);

            if (!hasAllScriptAudio) {
              const missingCount = scripts.filter((s: any) => !s.audioUrl || typeof s.audioUrl !== "string").length;
              console.log(`🎤 ${missingCount} scripts missing audio, starting background TTS generation...`);

              (async () => {
                try {
                  let scriptsUpdated = false;
                  for (let i = 0; i < scripts.length; i++) {
                    const scriptItem = scripts[i];
                    const scriptContent = scriptItem.content || scriptItem.script || "";

                    if (!scriptContent) continue;

                    const scriptType = scriptItem.type || inferScriptType(scriptContent);
                    const isChooseResponseScript = scriptType === "choose-response" || scriptType === "listen-and-choose";

                    const chooseResponseMissingTimestamps =
                      isChooseResponseScript &&
                      scriptItem.audioUrl &&
                      !(Array.isArray(scriptItem.optionTimestamps) && scriptItem.optionTimestamps.length > 0) &&
                      !(Array.isArray(scriptItem.questions?.[0]?.optionTimestamps) &&
                        scriptItem.questions[0].optionTimestamps.length > 0);

                    if (scriptItem.audioUrl && !chooseResponseMissingTimestamps) {
                      if (typeof scriptItem.audioUrl === "string" && scriptItem.audioUrl.startsWith("/api/audio/")) {
                        const fileName = path.basename(scriptItem.audioUrl);
                        if (await audioExistsForScript(fileName)) {
                          continue;
                        }
                      }
                      scriptItem.audioUrl = null;
                      scriptsUpdated = true;
                    } else if (chooseResponseMissingTimestamps) {
                      console.log(`♻️ [TTS] Regenerating choose-response script ${i}: has audio but no optionTimestamps`);
                      scriptItem.audioUrl = null;
                      scriptsUpdated = true;
                    }

                    const cleanedContent = cleanScriptForTTS(scriptContent);
                    if (!cleanedContent) continue;
                    const audioFileName = `listening_toefl_${Date.now()}_${i}.mp3`;

                    try {
                      const rawScript = typeof cleanedContent === "string" ? cleanedContent : JSON.stringify(cleanedContent);
                      const hasMultipleSpeakers = scriptType === "conversation" && parseDialogueSegments(rawScript).length > 1;

                      let audioBuffer: Buffer;
                      let optionTimestampsResult: any[] | null = null;

                      if (isChooseResponseScript) {
                        const scriptQuestions = scriptItem.questions || [];
                        const firstQ = scriptQuestions[0];
                        const qOptions = firstQ?.options || [];

                        if (Array.isArray(qOptions) && qOptions.length > 0) {
                          const dialogueSegs = parseDialogueSegments(rawScript);
                          const speakerGender = dialogueSegs.length > 0 ? getSpeakerGender(dialogueSegs[0].speaker) : "unknown";
                          const questionVoice = speakerGender === "female" ? "nova" : "onyx";
                          const optionVoice = questionVoice === "nova" ? "onyx" : "nova";

                          let questionText = buildChooseResponseQuestionText(rawScript, qOptions.map(String));
                          if (!questionText) questionText = "What is the best response?";

                          const result = await buildChooseResponseAudio(questionText, qOptions.map(String), questionVoice, optionVoice);
                          audioBuffer = result.audioBuffer;
                          optionTimestampsResult = result.optionTimestamps;
                          console.log(`🎤 [TTS] Background: choose-response with ${qOptions.length} options for script ${i}`);
                        } else {
                          audioBuffer = await generateTTSAudio(stripSpeakerLabels(rawScript).substring(0, 4096), "onyx");
                        }
                      } else if (hasMultipleSpeakers) {
                        audioBuffer = await generateMultiVoiceConversationAudio(rawScript);
                      } else {
                        const voiceMap: Record<string, string> = {
                          conversation: "nova",
                          lecture: "nova",
                          announcement: "nova",
                          "academic-talk": "nova",
                          academic: "nova",
                        };
                        const strippedScript = stripSpeakerLabels(rawScript);
                        const mp3 = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).audio.speech.create({
                          model: OPENAI_TTS_MODEL,
                          voice: (voiceMap[scriptType] || "nova") as any,
                          input: strippedScript.substring(0, 4096),
                          speed: 1.0,
                        });
                        audioBuffer = Buffer.from(await mp3.arrayBuffer());
                      }

                      const generatedAudioUrl = await uploadAudioForScript(audioBuffer, audioFileName);
                      const updatedScript: any = { ...scriptItem, audioUrl: generatedAudioUrl, type: scriptItem.type || scriptType };
                      if (optionTimestampsResult) {
                        updatedScript.optionTimestamps = optionTimestampsResult;
                        if (updatedScript.questions && updatedScript.questions[0]) {
                          updatedScript.questions[0].optionTimestamps = optionTimestampsResult;
                        }
                        const topLevelQuestions = (aiTest.questions as any[]) || [];
                        topLevelQuestions.forEach((tq: any) => {
                          if ((tq.scriptIndex ?? 0) === i) {
                            tq.optionTimestamps = optionTimestampsResult;
                          }
                        });
                      }
                      scripts[i] = updatedScript;
                      scriptsUpdated = true;
                      console.log(`✅ [TTS] Background: Generated audio for script ${i}: ${generatedAudioUrl}`);
                    } catch (ttsError) {
                      console.error(`❌ [TTS] Background: Failed for script ${i}:`, ttsError);
                    }
                  }

                  if (scriptsUpdated) {
                    try {
                      await storage.updateAIGeneratedTest(id, {
                        ...aiTest,
                        scripts,
                        lastUpdated: new Date().toISOString(),
                      });
                      console.log(`✅ [TTS] Background: Updated test ${id} with new audio URLs`);
                    } catch (updateError) {
                      console.error(`❌ [TTS] Background: Failed to update test:`, updateError);
                    }
                  }
                } catch (bgError) {
                  console.error(`❌ [TTS] Background generation error:`, bgError);
                }
              })();
            }

            return;
          }

          let finalQuestions = aiTest.questions || [];

          if ((!finalQuestions || finalQuestions.length === 0) && aiTest.passages && aiTest.passages.length > 0) {
            console.log("Found passage without questions, attempting to regenerate...");
            try {
              const { generateQuestionsFromParsedContent } = await import("../openai");
              const passage = aiTest.passages[0];
              const generatedQuestions = await generateQuestionsFromParsedContent(
                passage.content,
                passage.title || "Reading Passage",
                "toefl",
                "reading",
                "medium",
              );

              if (generatedQuestions.length > 0) {
                console.log(`Successfully generated ${generatedQuestions.length} questions from passage`);
                finalQuestions = generatedQuestions;

                try {
                  await storage.updateAIGeneratedTest(id, {
                    ...aiTest,
                    questions: generatedQuestions,
                    lastUpdated: new Date().toISOString(),
                  });
                  console.log("Successfully updated test with generated questions");
                } catch (updateError) {
                  console.error("Failed to update test with questions:", updateError);
                }
              }
            } catch (regenerateError) {
              console.error("Failed to regenerate questions:", regenerateError);
            }
          }

          return res.json(buildAiSectionedResponse(aiTest, finalQuestions));
        }
      }

      const test = await storage.getTest(id);
      if (test) {
        const questions = await storage.getQuestionsByTestId(id);
        return res.json({
          ...test,
          questions,
        });
      }

      const aiTest = await storage.getAIGeneratedTest(id);
      if (aiTest) {
        console.log(`Found AI generated test (UUID): ${aiTest.title}`);

        const finalQuestions = aiTest.questions || [];
        return res.json(buildAiSectionedResponse(aiTest, finalQuestions));
      }

      const testSetId = stripTestSetPrefix(id);

      console.log("Looking for TestSet with ID:", testSetId);
      console.log("Available TestSets:", Array.from((storage as any).testSets?.keys() || []));

      const testSet = await storage.getTestSet(testSetId);

      if (testSet) {
        console.log("Retrieved TestSet:", JSON.stringify(testSet, null, 2));

        const testData = buildTestSetAsTestResponse(req.params.id, testSet);

        console.log("Converted testData:", JSON.stringify(testData, null, 2));

        return res.json(testData);
      }

      return res.status(404).json({ message: "Test not found" });
    } catch (error: any) {
      console.error("Get test error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
