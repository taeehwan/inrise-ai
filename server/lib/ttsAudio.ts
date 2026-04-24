import OpenAI from "openai";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OPENAI_TTS_MODEL } from "../openaiModels";
import {
  buildChooseResponseQuestionText,
  getSpeakerGender,
  parseDialogueSegments,
  stripOptionContentFromText,
  stripSpeakerLabels,
} from "./audioText";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MultiVoiceResult {
  audioBuffer: Buffer;
  segmentDurations: { speaker: string; text: string; durationMs: number; startMs: number; endMs: number }[];
}

export async function generateTTSAudio(text: string, voice: string = "nova"): Promise<Buffer> {
  const cleanText = stripSpeakerLabels(text);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const mp3 = await openai.audio.speech.create({
    model: OPENAI_TTS_MODEL,
    voice: voice as any,
    input: cleanText.substring(0, 4096),
    speed: 1.0,
  });
  return Buffer.from(await mp3.arrayBuffer());
}

function estimateAudioDurationMs(mp3Buffer: Buffer): number {
  const bitrate = 128000;
  return Math.round((mp3Buffer.length * 8 / bitrate) * 1000);
}

export async function generateMultiVoiceConversationAudio(text: string, returnDurations?: false): Promise<Buffer>;
export async function generateMultiVoiceConversationAudio(
  text: string,
  returnDurations: true,
): Promise<MultiVoiceResult>;
export async function generateMultiVoiceConversationAudio(
  text: string,
  returnDurations: boolean = false,
): Promise<Buffer | MultiVoiceResult> {
  const segments = parseDialogueSegments(text);

  if (segments.length === 0) {
    const buf = await generateTTSAudio(text, "nova");
    if (returnDurations) {
      return {
        audioBuffer: buf,
        segmentDurations: [
          {
            speaker: "",
            text,
            durationMs: estimateAudioDurationMs(buf),
            startMs: 0,
            endMs: estimateAudioDurationMs(buf),
          },
        ],
      };
    }
    return buf;
  }

  const uniqueSpeakers = [...new Set(segments.map((segment) => segment.speaker))];
  const voiceAssignments: Record<string, string> = {};
  const FEMALE_VOICE = "nova";
  const MALE_VOICE = "onyx";

  if (uniqueSpeakers.length === 2) {
    const gender0 = getSpeakerGender(uniqueSpeakers[0]);
    const gender1 = getSpeakerGender(uniqueSpeakers[1]);
    if (gender0 === "female" || (gender0 === "unknown" && gender1 === "male")) {
      voiceAssignments[uniqueSpeakers[0]] = FEMALE_VOICE;
      voiceAssignments[uniqueSpeakers[1]] = MALE_VOICE;
    } else if (gender1 === "female" || (gender1 === "unknown" && gender0 === "male")) {
      voiceAssignments[uniqueSpeakers[0]] = MALE_VOICE;
      voiceAssignments[uniqueSpeakers[1]] = FEMALE_VOICE;
    } else {
      voiceAssignments[uniqueSpeakers[0]] = FEMALE_VOICE;
      voiceAssignments[uniqueSpeakers[1]] = MALE_VOICE;
    }
  } else {
    const usedVoices: string[] = [];
    uniqueSpeakers.forEach((speaker, idx) => {
      const gender = getSpeakerGender(speaker);
      if (gender === "female") {
        voiceAssignments[speaker] = FEMALE_VOICE;
      } else if (gender === "male") {
        voiceAssignments[speaker] = MALE_VOICE;
      } else {
        voiceAssignments[speaker] = idx % 2 === 0 ? FEMALE_VOICE : MALE_VOICE;
      }
      usedVoices.push(voiceAssignments[speaker]);
    });

    const allSame = usedVoices.every((voice) => voice === usedVoices[0]);
    if (allSame && uniqueSpeakers.length >= 2) {
      voiceAssignments[uniqueSpeakers[1]] = usedVoices[0] === FEMALE_VOICE ? MALE_VOICE : FEMALE_VOICE;
    }
  }

  console.log("🎤 Multi-voice assignments:", voiceAssignments);

  const audioBuffers: Buffer[] = [];
  const segDurations: MultiVoiceResult["segmentDurations"] = [];
  let cumulativeMs = 0;

  for (const segment of segments) {
    const voice = voiceAssignments[segment.speaker] || "onyx";
    console.log(`🎙️ ${segment.speaker} (${voice}): "${segment.text.substring(0, 50)}..."`);
    try {
      const buffer = await generateTTSAudio(segment.text, voice);
      audioBuffers.push(buffer);
      const durMs = estimateAudioDurationMs(buffer);
      segDurations.push({
        speaker: segment.speaker,
        text: segment.text,
        durationMs: durMs,
        startMs: cumulativeMs,
        endMs: cumulativeMs + durMs,
      });
      cumulativeMs += durMs;
    } catch (err) {
      console.error(`❌ TTS failed for ${segment.speaker}:`, err);
    }
  }

  if (audioBuffers.length === 0) {
    const buf = await generateTTSAudio(stripSpeakerLabels(text), "nova");
    if (returnDurations) {
      return { audioBuffer: buf, segmentDurations: [] };
    }
    return buf;
  }

  const combined = Buffer.concat(audioBuffers);
  if (returnDurations) {
    return { audioBuffer: combined, segmentDurations: segDurations };
  }
  return combined;
}

export async function getExactAudioDurationMs(mp3Buffer: Buffer): Promise<number> {
  try {
    const { execSync } = await import("child_process");
    const tmpDir = path.join(__dirname, "../../uploads");
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const tmpFile = path.join(tmpDir, `dur_probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`);
    await fs.writeFile(tmpFile, mp3Buffer);
    const result = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tmpFile}"`,
      { timeout: 5000 },
    )
      .toString()
      .trim();
    try {
      await fs.unlink(tmpFile);
    } catch {}
    const durationSec = parseFloat(result);
    if (!Number.isNaN(durationSec) && durationSec > 0) {
      return Math.round(durationSec * 1000);
    }
  } catch (err) {
    console.warn("⚠️ ffprobe duration measurement failed, falling back to estimate:", err);
  }
  return estimateAudioDurationMs(mp3Buffer);
}

async function generateMp3Silence(durationMs: number): Promise<Buffer> {
  try {
    const { execSync } = await import("child_process");
    const tmpDir = path.join(__dirname, "../../uploads");
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const tmpFile = path.join(tmpDir, `silence_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`);
    const durationSec = durationMs / 1000;
    execSync(
      `ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t ${durationSec} -q:a 9 -y "${tmpFile}" 2>/dev/null`,
      { timeout: 10000 },
    );
    const buf = await fs.readFile(tmpFile);
    try {
      await fs.unlink(tmpFile);
    } catch {}
    return buf;
  } catch (err) {
    console.warn("⚠️ ffmpeg silence generation failed, using raw silence:", err);
    return Buffer.alloc(Math.round((durationMs * 128000) / 8 / 1000), 0);
  }
}

async function concatenateAudioWithFfmpeg(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];
  try {
    const { execSync } = await import("child_process");
    const tmpDir = path.join(__dirname, "../../uploads");
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const partFiles: string[] = [];
    const listFile = path.join(tmpDir, `concat_list_${uid}.txt`);
    const outFile = path.join(tmpDir, `concat_out_${uid}.mp3`);
    for (let i = 0; i < buffers.length; i++) {
      const partPath = path.join(tmpDir, `concat_part_${uid}_${i}.mp3`);
      await fs.writeFile(partPath, buffers[i]);
      partFiles.push(partPath);
    }
    const listContent = partFiles.map((filePath) => `file '${filePath}'`).join("\n");
    await fs.writeFile(listFile, listContent);
    execSync(`ffmpeg -f concat -safe 0 -i "${listFile}" -c copy -y "${outFile}" 2>/dev/null`, {
      timeout: 30000,
    });
    const result = await fs.readFile(outFile);
    for (const filePath of partFiles) {
      try {
        await fs.unlink(filePath);
      } catch {}
    }
    try {
      await fs.unlink(listFile);
    } catch {}
    try {
      await fs.unlink(outFile);
    } catch {}
    return result;
  } catch (err) {
    console.warn("⚠️ ffmpeg concat failed, using Buffer.concat fallback:", err);
    return Buffer.concat(buffers);
  }
}

export async function buildChooseResponseAudio(
  questionText: string | null,
  options: string[],
  questionVoice: string,
  optionVoice: string,
  pauseMs: number = 1500,
): Promise<{ audioBuffer: Buffer; optionTimestamps: any[] }> {
  const silenceBuf = await generateMp3Silence(pauseMs);
  const silenceDurMs = pauseMs;

  if (questionText) {
    const speakerNames =
      "Woman|Man|Student|Professor|Narrator|Lecturer|Teacher|Librarian|Assistant|Advisor|Male|Female|Speaker\\s*\\d*|Host|Guest|Interviewer|Interviewee|Dean|Director|Manager|Receptionist|Counselor|Coach|Instructor|Tutor|Mentor|Administrator|Coordinator|Podcast\\s*Host";
    const speakerOnlyRe = new RegExp(`^(${speakerNames})\\s*\\d*\\s*:?\\s*\\W*\\s*$`, "i");
    const filterLines = (text: string) =>
      text
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          if (!trimmed) return false;
          if (speakerOnlyRe.test(trimmed)) return false;
          if (/^\(?[A-Da-d1-4][.)]\s*.+/.test(trimmed)) return false;
          if (/^\s*\(?[A-Da-d1-4][.)]*\)?\s*$/.test(trimmed)) return false;
          return true;
        })
        .join("\n")
        .trim();

    let cleaned = filterLines(questionText);

    if (cleaned && options.length > 0) {
      cleaned = stripOptionContentFromText(cleaned, options);
      cleaned = filterLines(cleaned);
    }

    if (cleaned && options.length > 0) {
      const normalizeForCompare = (text: string) =>
        text.replace(/^\s*\(?[A-Da-d1-4][.)]\s*/i, "").toLowerCase().replace(/[^\w\s]/g, "").trim();
      const normalizedOpts = options.map(normalizeForCompare).filter((option) => option.length > 3);
      cleaned = cleaned
        .split("\n")
        .filter((line) => {
          const normalized = normalizeForCompare(line);
          if (!normalized) return false;
          return !normalizedOpts.some((option) => option === normalized);
        })
        .join("\n")
        .trim();
    }

    console.log(`🔍 [buildChooseResponseAudio] Cleaned questionText: "${(cleaned || "").substring(0, 120)}"`);
    questionText = cleaned || null;
  }

  const audioParts: Buffer[] = [];
  let cumulativeMs = 0;

  if (questionText && questionText.trim()) {
    const qBuf = await generateTTSAudio(questionText.substring(0, 4096), questionVoice);
    const qDurMs = await getExactAudioDurationMs(qBuf);
    audioParts.push(qBuf);
    cumulativeMs += qDurMs;
    audioParts.push(silenceBuf);
    cumulativeMs += silenceDurMs;
    console.log(`🎙️ Question TTS: ${qDurMs}ms (voice: ${questionVoice})`);
  }

  const optionTimestamps: any[] = [];
  const optionLabel = (idx: number) => `Option ${String.fromCharCode(65 + idx)}.`;

  const optionTTSPromises = options.map(async (option, index) => {
    const cleanOpt = option.replace(/^\s*\(?[A-Da-d][.)]\s*/i, "").trim();
    const labeledText = `${optionLabel(index)} ${cleanOpt}`;
    const buf = await generateTTSAudio(labeledText, optionVoice);
    const durMs = await getExactAudioDurationMs(buf);
    return { buf, durMs, index };
  });

  const optionResults = await Promise.all(optionTTSPromises);
  optionResults.sort((a, b) => a.index - b.index);

  for (let i = 0; i < optionResults.length; i++) {
    const { buf, durMs } = optionResults[i];
    optionTimestamps.push({
      option: String.fromCharCode(65 + i),
      startTime: cumulativeMs / 1000,
      endTime: 0,
    });
    audioParts.push(buf);
    cumulativeMs += durMs;

    if (i < optionResults.length - 1) {
      audioParts.push(silenceBuf);
      cumulativeMs += silenceDurMs;
    }
  }

  for (let i = 0; i < optionTimestamps.length; i++) {
    if (i < optionTimestamps.length - 1) {
      optionTimestamps[i].endTime = optionTimestamps[i + 1].startTime;
    } else {
      optionTimestamps[i].endTime = cumulativeMs / 1000 + 2.0;
    }
    console.log(
      `  📝 Option ${optionTimestamps[i].option}: start=${optionTimestamps[i].startTime.toFixed(2)}s, end=${optionTimestamps[i].endTime.toFixed(2)}s`,
    );
  }

  const audioBuffer = await concatenateAudioWithFfmpeg(audioParts);
  console.log(
    `✅ Choose-response audio built: ${optionResults.length} options, total ~${cumulativeMs}ms, timestamps:`,
    JSON.stringify(optionTimestamps),
  );

  return { audioBuffer, optionTimestamps };
}
