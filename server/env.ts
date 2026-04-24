import { z } from "zod";

const nonEmpty = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { message: "must not be empty" });

const optionalString = z
  .string()
  .transform((v) => v.trim())
  .optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z
      .string()
      .optional()
      .transform((v) => (v ? Number.parseInt(v, 10) : 5000))
      .refine((v) => Number.isFinite(v) && v > 0 && v < 65536, {
        message: "PORT must be an integer in 1..65535",
      }),
    HOST: optionalString,
    BASE_URL: optionalString,

    DATABASE_URL: nonEmpty,

    // Required in production; generated fallback in development only.
    SESSION_SECRET: optionalString,
    COOKIE_DOMAIN: optionalString,

    // Bootstrap admin (optional — dev generates a one-shot password if unset).
    ADMIN_BOOTSTRAP_EMAIL: optionalString,
    ADMIN_BOOTSTRAP_PASSWORD: optionalString,

    // OpenAI (required for AI flows; dev without key disables AI features at runtime).
    OPENAI_API_KEY: optionalString,
    OPENAI_MODEL_STANDARD: optionalString,
    OPENAI_MODEL_PREMIUM: optionalString,
    OPENAI_TTS_MODEL: optionalString,
    OPENAI_STT_MODEL: optionalString,

    // Third-party providers — optional, validated lazily when actually used.
    ELEVENLABS_API_KEY: optionalString,
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    KAKAO_CLIENT_ID: optionalString,
    TOSS_PAYMENTS_CLIENT_KEY: optionalString,
    TOSS_PAYMENTS_SECRET_KEY: optionalString,
    STRIPE_SECRET_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    PAYPAL_CLIENT_ID: optionalString,
    PAYPAL_CLIENT_SECRET: optionalString,

    // Object storage — optional; missing means local uploads fallback.
    PRIVATE_OBJECT_DIR: optionalString,
    GOOGLE_APPLICATION_CREDENTIALS: optionalString,
    S3_BUCKET: optionalString,
    S3_REGION: optionalString,
    S3_ENDPOINT: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_PREFIX: optionalString,
    S3_FORCE_PATH_STYLE: optionalString,

    // QA / feature flags.
    QA_REAL_PROVIDERS: optionalString,
    QA_MOCK_EXTERNALS: optionalString,
  })
  .passthrough();

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

/**
 * Pure, dependency-free parser — validates against the schema and applies
 * production-only invariants. Exported so tests can exercise these rules
 * without the eager side-effect of module import time.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const value = parsed.data;
  const isProduction = value.NODE_ENV === "production";

  // Production requires a strong session secret.
  if (isProduction) {
    const secret = value.SESSION_SECRET ?? "";
    // Placeholder / known-default secrets are rejected regardless of length.
    const knownPlaceholders = new Set([
      "inrise-dev-secret-key-2025",
      "change-me",
      "placeholder",
    ]);
    if (knownPlaceholders.has(secret)) {
      throw new Error("SESSION_SECRET is set to a known placeholder; set a unique production secret.");
    }
    if (!secret || secret.length < 32) {
      throw new Error(
        "SESSION_SECRET must be set (>=32 chars) when NODE_ENV=production. " +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
  }

  return value;
}

export function loadEnv(): AppEnv {
  if (cached) return cached;
  cached = parseEnv(process.env);
  return cached;
}

// Eager validation on import — fail fast before any route handler runs.
// Skip during unit tests (NODE_ENV=test) so individual test files can set
// process.env to exercise validation rules with parseEnv directly.
export const env: AppEnv = process.env.NODE_ENV === "test" ? ({} as AppEnv) : loadEnv();

export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}
