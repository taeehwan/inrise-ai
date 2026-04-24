import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { log, requestLogger } from "./logger";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();

// Trust proxy for deployment (required for secure cookies and sessions behind HTTPS/LB).
app.set('trust proxy', true);

// Response compression — saves 20-40% network transfer on JSON and static assets.
app.use(compression({ threshold: 512 }));

// Default JSON/urlencoded ceiling covers normal API traffic (login, CRUD, small text).
// Routes that legitimately receive large payloads (inline base64 images, bulk AI
// generation) add their own local `express.json({ limit: '<bigger>' })` middleware.
// Structured request logging — emits JSON lines with a stable requestId per
// request. Skip for health/ready probes to avoid log spam.
app.use((req, res, next) => {
  if (req.path === "/health" || req.path === "/ready") return next();
  return requestLogger(req, res, next);
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

/**
 * Startup migration: find all new-toefl writing Build-a-Sentence questions whose
 * correctOrder is sequential ([0,1,2,...n-1]) — the hallmark of the fallback bug —
 * and re-solve them using AI so the correct answer is shown to users.
 */
async function fixSequentialBuildSentenceOrders(): Promise<void> {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const { computeCorrectOrderFromWords } = await import("./ai-feedback-service");

  // Helper: is this correctOrder the identity permutation [0,1,2,...n-1]?
  function isSequential(order: number[]): boolean {
    return order.length > 0 && order.every((v, i) => v === i);
  }

  const rows = (await db.execute(sql`
    SELECT id, title, test_data
    FROM ai_generated_tests
    WHERE test_type = 'new-toefl' AND section = 'writing'
  `)) as any;

  const tests: any[] = rows.rows ?? rows;
  let totalFixed = 0;
  let totalFailed = 0;

  for (const test of tests) {
    const testData = test.test_data ?? test.testData;
    if (!testData) continue;

    const buildSentences: any[] = testData.buildSentences ?? [];
    const questions: any[] = testData.questions ?? [];
    let changed = false;

    // Fix both buildSentences[] and questions[] arrays (they mirror each other)
    const fixArray = async (arr: any[], label: string) => {
      for (let i = 0; i < arr.length; i++) {
        const q = arr[i];
        if (!Array.isArray(q.words) || q.words.length === 0) continue;
        if (!Array.isArray(q.correctOrder)) continue;
        // Re-process only when:
        // 1. answer text is missing (includes uncomputed sequential-order questions)
        // 2. single-item correctOrder (trivially wrong)
        // 3. index count doesn't match word count (data corruption)
        // Sequential orders WITH a valid answer are trusted as AI-confirmed "already in order"
        const hasValidAnswer = typeof q.answer === 'string' && q.answer.trim().length > 0;
        const needsRecompute =
          !hasValidAnswer ||
          q.correctOrder.length <= 1 ||
          q.correctOrder.length !== q.words.length;
        if (!needsRecompute) continue;

        const context = q.contextSentence || q.context || '';
        let result: any = null;
        let lastErr = '';

        // Attempt 1: with template (if present)
        // Attempt 2: without template (handles template/word-count mismatch data errors)
        for (const tmpl of [q.sentenceTemplate, undefined]) {
          try {
            result = await computeCorrectOrderFromWords(q.words, context, tmpl);
            break;
          } catch (err: any) {
            lastErr = err.message;
            if (!err.message.includes('mismatch')) break; // Only retry on mismatch
          }
        }

        if (result) {
          arr[i] = { ...q, correctOrder: result.correctOrder, answer: result.correctSentence };
          changed = true;
          totalFixed++;
          log.info(`  ✅ [${label}] Fixed Q${i + 1} "${test.title}": [${result.correctOrder.join(',')}] = "${result.correctSentence}"`);
        } else {
          totalFailed++;
          console.error(`  ✗ [${label}] Failed Q${i + 1} "${test.title}": ${lastErr}`);
        }
      }
    };

    await fixArray(buildSentences, 'buildSentences');

    // Sync fixes into questions[] as well (matching by words content)
    for (const fixed of buildSentences) {
      const qi = questions.findIndex(
        (q: any) =>
          Array.isArray(q.words) &&
          q.words.join(',') === fixed.words?.join(',')
      );
      if (qi >= 0) {
        questions[qi] = { ...questions[qi], correctOrder: fixed.correctOrder, answer: fixed.answer };
      }
    }

    if (changed) {
      const updated = { ...testData, buildSentences, questions };
      await db.execute(sql`
        UPDATE ai_generated_tests
        SET test_data = ${JSON.stringify(updated)}::jsonb
        WHERE id = ${test.id}
      `);
    }
  }

  if (totalFixed > 0 || totalFailed > 0) {
    log.info(`🔧 Build-a-Sentence migration complete: ${totalFixed} fixed, ${totalFailed} failed`);
  } else {
    log.info(`✅ Build-a-Sentence migration: no sequential correctOrder questions found`);
  }
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    // Log via the per-request logger when available so the stack trace is tied
    // to the same requestId the client saw. Don't re-throw — that just kills
    // the process on an unhandled rejection path.
    const requestLog = (req as any).log ?? log;
    requestLog.error({ err, status }, "request failed");
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    // Production: serve static files from dist/public [v2.0]
    console.log('🚀 PRODUCTION MODE STARTING [BUILD v2.0]');
    console.log('📂 Current working directory:', process.cwd());
    console.log('📂 import.meta.url:', import.meta.url);

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    console.log('📂 __dirname:', __dirname);

    const possiblePaths = [
      path.resolve(__dirname, "public"),
      path.resolve(process.cwd(), "dist", "public"),
      path.resolve(__dirname, "..", "dist", "public"),
      path.resolve("/opt/render/project/src/dist/public"),
    ];

    console.log('\n🔍 SEARCHING FOR STATIC FILES:');
    let distPath: string | null = null;
    for (const tryPath of possiblePaths) {
      const exists = fs.existsSync(tryPath);
      console.log(`  ${exists ? '✅' : '❌'} ${tryPath}`);
      if (exists && !distPath) {
        distPath = tryPath;
        const files = fs.readdirSync(tryPath);
        console.log(`  📁 Contents: ${files.join(', ')}`);
      }
    }

    if (!distPath) {
      const errorMsg = `❌ FATAL: No static files found!\n\nTried paths:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`\n✅ SERVING STATIC FILES FROM: ${distPath}\n`);

    // Hashed asset directories (Vite emits files like index-<hash>.js into /assets/):
    // cache aggressively since the content is immutable.
    app.use(
      "/assets",
      express.static(path.resolve(distPath, "assets"), {
        maxAge: "1y",
        immutable: true,
        etag: false,
      }),
    );

    // Other static files get a moderate cache; index.html falls through to 0.
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
          }
        },
      }),
    );

    app.use("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
      res.sendFile(path.resolve(distPath!, "index.html"));
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  // SO_REUSEPORT is Linux-only — enabling it on macOS throws ENOTSUP at bind time.
  const supportsReusePort = process.platform === "linux";
  const listeningServer = server.listen({
    port,
    host,
    ...(supportsReusePort ? { reusePort: true } : {}),
  }, async () => {
    log.info(`serving on ${host}:${port}`);

    try {
      const { migrateAllLocalToObjectStorage, isObjectStorageAvailable } = await import("./audioStorage");
      if (isObjectStorageAvailable()) {
        const result = await migrateAllLocalToObjectStorage();
        if (result.migrated > 0) {
          log.info(`🔄 Startup audio migration: ${result.migrated} files migrated to Object Storage`);
          const { db } = await import("./db");
          const { sql } = await import("drizzle-orm");
          try {
            const updateResult = await db.execute(sql`
              UPDATE listening_tts_assets
              SET audio_url = REPLACE(audio_url, '/uploads/', '/api/audio/')
              WHERE audio_url LIKE '/uploads/%'
            `);
            const count = Number((updateResult as any)?.rowCount || 0);
            if (count > 0) {
              log.info(`📦 Updated ${count} TTS cache URLs from /uploads/ to /api/audio/`);
            }
          } catch (dbErr) {
            console.error("DB URL update during startup migration:", dbErr);
          }
        }
      }
    } catch (migrationErr) {
      console.error("Startup audio migration error (non-fatal):", migrationErr);
    }

    // ──────────────────────────────────────────────────────────────
    // STARTUP MIGRATION: Fix Build a Sentence questions with sequential
    // correctOrder (the fallback bug: AI solve failed → stored [0,1,2,…n-1]
    // which is the scrambled order, NOT the correct answer).
    // Detects all such questions across all new-toefl writing tests and
    // re-solves them using AI. Runs in the background so startup is fast.
    // ──────────────────────────────────────────────────────────────
    fixSequentialBuildSentenceOrders().catch(err =>
      console.error("Build-sentence migration error (non-fatal):", err)
    );
  });

  // ──────────────────────────────────────────────────────────────
  // Graceful shutdown. Drain in-flight requests before exit so
  // deployments (k8s SIGTERM, render redeploy) don't cut connections mid-reply.
  // ──────────────────────────────────────────────────────────────
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`${signal} received — draining connections`);
    listeningServer.close((err) => {
      if (err) {
        console.error("Error during server.close():", err);
        process.exit(1);
      }
      log.info("server closed; exiting");
      process.exit(0);
    });
    // Hard kill if drain takes too long.
    setTimeout(() => {
      console.error("Shutdown drain timed out — forcing exit");
      process.exit(1);
    }, 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
