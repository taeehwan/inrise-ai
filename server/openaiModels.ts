export type OpenAIModelTier = "standard" | "premium";

const DEFAULT_STANDARD_MODEL = "gpt-5.4-mini";
const DEFAULT_PREMIUM_MODEL = "gpt-5.2";

export function getOpenAIModel(tier: OpenAIModelTier = "standard"): string {
  if (tier === "premium") {
    return process.env.OPENAI_MODEL_PREMIUM || DEFAULT_PREMIUM_MODEL;
  }

  return process.env.OPENAI_MODEL_STANDARD || DEFAULT_STANDARD_MODEL;
}

export const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "tts-1";
export const OPENAI_STT_MODEL = process.env.OPENAI_STT_MODEL || "whisper-1";
