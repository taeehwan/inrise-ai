import pino from "pino";
import type { IncomingMessage, ServerResponse } from "http";
import pinoHttp from "pino-http";
import crypto from "crypto";
import type { RequestHandler } from "express";

const isTest = process.env.NODE_ENV === "test";
const isSmoke = process.env.QA_MOCK_EXTERNALS === "1";

/**
 * Shared structured logger. In production we emit JSON lines so collectors
 * (Loki, Cloud Logging, Datadog, etc.) can parse them cheaply. In development
 * we keep the raw JSON but bump the level down so noisy framework internals
 * don't flood the terminal — a pino-pretty transport can be added later by
 * piping stdout.
 *
 * During unit tests (NODE_ENV=test) and smoke QA (QA_MOCK_EXTERNALS=1) we go
 * silent — the test harness owns assertions and extra log noise hurts signal.
 */
export const log = pino({
  name: "inrise",
  level: isTest || isSmoke ? "silent" : process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.headers['x-forwarded-for']",
      "res.headers['set-cookie']",
      "body.password",
      "body.passwordHash",
      "body.currentPassword",
      "body.newPassword",
      "body.otp",
    ],
    remove: true,
  },
  base: { env: process.env.NODE_ENV ?? "development" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Express middleware that attaches a per-request logger (`req.log`) with a
 * stable request ID. Downstream handlers can log with `req.log.info({...})`
 * and every line gets the same `requestId`, making it easy to trace a flow.
 */
export const requestLogger: RequestHandler = pinoHttp({
  logger: log,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const existing = (req.headers["x-request-id"] as string | undefined)?.trim();
    const id = existing && existing.length > 0 && existing.length <= 128 ? existing : crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
