import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  windowStart: number;
}

interface RateLimiterOptions {
  /** Window size in milliseconds. */
  windowMs: number;
  /** Max requests per window per key. */
  max: number;
  /** Human-readable label used in logs / error messages. */
  label?: string;
  /**
   * Optional key override. Defaults to `user.id` when authenticated, otherwise the client IP.
   */
  keyOf?: (req: Request) => string;
}

/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Intended for per-instance protection of expensive endpoints (OpenAI calls, TTS/STT).
 * For multi-instance deployments, replace the Map with a shared store (Redis, etc.).
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, label = "rate-limit", keyOf } = options;
  const buckets = new Map<string, Bucket>();

  // Periodic cleanup to prevent unbounded memory growth.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.windowStart >= windowMs) {
        buckets.delete(key);
      }
    }
  }, Math.max(windowMs, 60_000));
  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    // Skip rate limiting in QA smoke mode (supertest).
    // Tests must be deterministic; real abuse is covered in production.
    if (process.env.QA_MOCK_EXTERNALS === "1" || process.env.QA_REAL_PROVIDERS === "1") {
      return next();
    }

    const user = (req as any).user;
    const fallbackIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const key = keyOf ? keyOf(req) : user?.id ? `user:${user.id}` : `ip:${fallbackIp}`;

    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      return res.status(429).json({
        message: `요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도해주세요.`,
        code: "RATE_LIMITED",
        label,
        retryAfter: retryAfterSec,
      });
    }

    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(max - bucket.count));
    next();
  };
}

/**
 * Shared limiter profiles for OpenAI-backed routes.
 * Tuned conservatively so a legitimate user cannot trivially hit them,
 * but a loop-script attacker exhausts budget within seconds.
 */
export const aiFeedbackLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 12,
  label: "ai-feedback",
});

export const aiGenerationLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 8,
  label: "ai-generation",
});

export const aiTtsLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  label: "ai-tts",
});

export const aiSttLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  label: "ai-stt",
});
