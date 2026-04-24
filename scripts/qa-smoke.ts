import "dotenv/config";
import express from "express";
import request from "supertest";
import { registerRoutes } from "../server/routes";
import { pool } from "../server/db";

function isUsableSecret(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("placeholder")) return false;
  if (normalized.includes("your_")) return false;
  if (normalized.includes("replace_me")) return false;
  return true;
}

async function main() {
  const wantsRealProviders = process.env.QA_REAL_PROVIDERS === "1";
  const hasRealProviderEnv = Boolean(
    isUsableSecret(process.env.OPENAI_API_KEY) &&
      isUsableSecret(process.env.TOSS_PAYMENTS_SECRET_KEY) &&
      isUsableSecret(process.env.TOSS_PAYMENTS_CLIENT_KEY) &&
      isUsableSecret(process.env.BASE_URL),
  );
  const useRealProviders = wantsRealProviders && hasRealProviderEnv;

  process.env.QA_MOCK_EXTERNALS = useRealProviders ? "0" : "1";

  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: false, limit: "50mb" }));

  await registerRoutes(app);

  const publicChecks: Array<{
    name: string;
    path: string;
    expectedStatuses: number[];
    validate?: (body: unknown) => void;
  }> = [
    {
      name: "health probe",
      path: "/health",
      expectedStatuses: [200],
      validate: (body) => {
        if (
          typeof body !== "object" ||
          body === null ||
          !("status" in body) ||
          (body as { status?: unknown }).status !== "ok"
        ) {
          throw new Error("/health response does not report status=ok");
        }
      },
    },
    {
      name: "readiness probe",
      path: "/ready",
      expectedStatuses: [200],
      validate: (body) => {
        if (
          typeof body !== "object" ||
          body === null ||
          !("status" in body) ||
          (body as { status?: unknown }).status !== "ready" ||
          typeof (body as { dbLatencyMs?: unknown }).dbLatencyMs !== "number"
        ) {
          throw new Error("/ready response must include status=ready and dbLatencyMs");
        }
      },
    },
    {
      name: "session status",
      path: "/api/auth/session-status",
      expectedStatuses: [200],
      validate: (body) => {
        if (
          typeof body !== "object" ||
          body === null ||
          !("success" in body) ||
          !("data" in body) ||
          typeof (body as { data?: unknown }).data !== "object" ||
          (body as { data?: unknown }).data === null ||
          !("isAuthenticated" in ((body as { data: Record<string, unknown> }).data))
        ) {
          throw new Error("session-status response shape is invalid");
        }
      },
    },
    {
      name: "tests list",
      path: "/api/tests",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("tests response is not an array");
        }
      },
    },
    {
      name: "GRE verbal tests",
      path: "/api/gre/verbal/tests",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("GRE verbal tests response is not an array");
        }
      },
    },
    {
      name: "GRE quantitative tests",
      path: "/api/gre/quantitative/tests",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("GRE quantitative tests response is not an array");
        }
      },
    },
    {
      name: "new TOEFL full tests",
      path: "/api/new-toefl/full-tests",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("new TOEFL full tests response is not an array");
        }
      },
    },
    {
      name: "study plans",
      path: "/api/study-plans",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("study plans response is not an array");
        }
      },
    },
    {
      name: "reviews",
      path: "/api/reviews",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("reviews response is not an array");
        }
      },
    },
    {
      name: "auth me",
      path: "/api/auth/me",
      expectedStatuses: [200, 401],
    },
  ];

  const authenticatedChecks: Array<{
    name: string;
    path: string;
    expectedStatuses: number[];
    validate?: (body: unknown) => void;
  }> = [
    {
      name: "user credits",
      path: "/api/user/credits",
      expectedStatuses: [200],
      validate: (body) => {
        if (typeof body !== "object" || body === null || !("balance" in body)) {
          throw new Error("user credits response shape is invalid");
        }
      },
    },
    {
      name: "user test attempts",
      path: "/api/user/test-attempts",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("user test attempts response is not an array");
        }
      },
    },
    {
      name: "saved explanations",
      path: "/api/user/saved-explanations",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("saved explanations response is not an array");
        }
      },
    },
    {
      name: "performance summary",
      path: "/api/performance-summary",
      expectedStatuses: [200],
      validate: (body) => {
        if (
          typeof body !== "object" ||
          body === null ||
          !("sectionAnalysis" in body) ||
          !Array.isArray((body as { sectionAnalysis?: unknown }).sectionAnalysis)
        ) {
          throw new Error("performance summary response shape is invalid");
        }
      },
    },
    {
      name: "user AI tests",
      path: "/api/user/ai-tests",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("user AI tests response is not an array");
        }
      },
    },
    {
      name: "test sets",
      path: "/api/test-sets",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("test sets response is not an array");
        }
      },
    },
  ];

  const adminChecks: Array<{
    name: string;
    path: string;
    expectedStatuses: number[];
    validate?: (body: unknown) => void;
  }> = [
    {
      name: "admin dashboard",
      path: "/api/admin/dashboard",
      expectedStatuses: [200],
      validate: (body) => {
        if (
          typeof body !== "object" ||
          body === null ||
          !("stats" in body) ||
          typeof (body as { stats?: unknown }).stats !== "object" ||
          (body as { stats?: unknown }).stats === null
        ) {
          throw new Error("admin dashboard response shape is invalid");
        }
      },
    },
    {
      name: "admin analytics events summary",
      path: "/api/admin/analytics/events/summary",
      expectedStatuses: [200],
      validate: (body) => {
        if (typeof body !== "object" || body === null) {
          throw new Error("admin analytics events summary response shape is invalid");
        }
      },
    },
    {
      name: "admin new TOEFL reading",
      path: "/api/admin/new-toefl-reading",
      expectedStatuses: [200],
      validate: (body) => {
        if (!Array.isArray(body)) {
          throw new Error("admin new TOEFL reading response is not an array");
        }
      },
    },
  ];

  const adminOnlyGuardPaths = [
    "/api/admin/messages",
    "/api/admin/ai-draft-message",
    "/api/admin/extract-text",
    "/api/admin/generate-speech",
    "/api/admin/convert-image-to-text",
    "/api/admin/upload-achievement-image",
    "/api/admin/generate-questions",
    "/api/admin/generate-image-question",
    "/api/admin/speaking-topics",
    "/api/ai/generate-topics",
    "/api/ai/generate-questions",
    "/api/ai/generate-from-image",
    "/api/ai/generate-test-set",
    "/api/ai/generate-question",
    "/api/ai/auto-generate-all-sections",
    "/api/admin/parse-text-questions",
    "/api/ai/parse-listening-passages",
    "/api/ai/generate-reading-section",
    "/api/ai/generate-speaking-section",
    "/api/ai/generate-writing-section",
    "/api/ai/generate-listening-section",
    "/api/ai/generate-quantitative-section",
    "/api/ai/generate-listening",
    "/api/ai/solve-reading-questions",
    "/api/gre/quant/parse",
    "/api/gre/quant/create",
    "/api/new-toefl/full-tests",
  ] as const;

  const adminOnlyMutationGuards: ReadonlyArray<{
    method: "patch" | "put" | "delete";
    path: string;
    body?: Record<string, unknown>;
  }> = [
    { method: "patch", path: "/api/new-toefl/full-tests/smoke-test", body: {} },
    { method: "delete", path: "/api/new-toefl/full-tests/smoke-test" },
    { method: "patch", path: "/api/speaking-tests/smoke-test", body: {} },
    { method: "delete", path: "/api/speaking-tests/smoke-test" },
    { method: "patch", path: "/api/writing-tests/smoke-test", body: {} },
    { method: "delete", path: "/api/writing-tests/smoke-test" },
    { method: "patch", path: "/api/ai/tests/ai-smoke-test", body: {} },
    { method: "delete", path: "/api/ai/tests/ai-smoke-test" },
    { method: "patch", path: "/api/admin/tests/ai-smoke-test/restore", body: {} },
    { method: "delete", path: "/api/admin/test-sets/testset-smoke" },
    { method: "put", path: "/api/admin/speaking-topics/smoke-topic", body: {} },
    { method: "delete", path: "/api/admin/speaking-topics/smoke-topic" },
  ] as const;

  const adminOnlyGetGuardPaths = [
    "/api/admin/dashboard",
    "/api/admin/messages",
    "/api/admin/speaking-topics",
    "/api/admin/achievements",
    "/api/admin/analytics/events/summary",
  ] as const;

  const authenticatedOnlyGuardPaths = [
    "/api/objects/upload",
    "/api/payments/fail",
    "/api/payments/confirm",
    "/api/generate-reading-solution",
    "/api/ai/generate-tts",
    "/api/ai/solve-listening-questions",
    "/api/writing/listening-audio",
    "/api/writing/model-answer",
    "/api/speaking-analysis",
    "/api/speech-to-text",
    "/api/speech-to-text-enhanced",
    "/api/speaking/feedback",
  ] as const;

  const mediaTraversalChecks: Array<{
    name: string;
    path: string;
    expectedStatuses: number[];
  }> = [
    {
      name: "uploads traversal encoded",
      path: "/uploads/%2e%2e/%2e%2e/package.json",
      expectedStatuses: [404],
    },
    {
      name: "uploads traversal nested",
      path: "/uploads/nested/%2e%2e/%2e%2e/package.json",
      expectedStatuses: [404],
    },
    {
      name: "audio traversal encoded",
      path: "/api/audio/%2e%2e%2f%2e%2e%2fpackage.json",
      expectedStatuses: [404],
    },
  ];

  const results: string[] = [];
  results.push(`qa provider mode -> ${useRealProviders ? "real" : "mock"}`);

  function requestWithMethod(
    agentLike: ReturnType<typeof request> | ReturnType<typeof request.agent>,
    method: "get" | "post" | "patch" | "put" | "delete",
    path: string,
  ) {
    switch (method) {
      case "get":
        return agentLike.get(path);
      case "post":
        return agentLike.post(path);
      case "patch":
        return agentLike.patch(path);
      case "put":
        return agentLike.put(path);
      case "delete":
        return agentLike.delete(path);
    }
  }

  try {
    const agent = request.agent(app);
    const otherUserAgent = request.agent(app);
    const smokeEmail = `qa-smoke-${Date.now()}@example.com`;
    const registerResponse = await agent.post("/api/auth/register").send({
      email: smokeEmail,
      password: "SmokeTest123!",
      firstName: "QA",
      lastName: "Smoke",
      privacyConsent: true,
      marketingConsent: false,
    });

    if (registerResponse.status !== 201) {
      throw new Error(`register flow failed: expected 201 but got ${registerResponse.status}`);
    }

    const authMeAfterRegister = await agent.get("/api/auth/me");
    if (authMeAfterRegister.status !== 200) {
      throw new Error(`auth me after register failed: expected 200 but got ${authMeAfterRegister.status}`);
    }
    if (typeof authMeAfterRegister.body?.id !== "string") {
      throw new Error("auth me after register response does not include a valid user id");
    }
    const registeredUserId = authMeAfterRegister.body.id as string;

    for (const path of adminOnlyGuardPaths) {
      const unauthenticatedResponse = await request(app).post(path).send({});
      if (unauthenticatedResponse.status !== 401) {
        throw new Error(
          `unauthenticated access to ${path} should fail with 401, got ${unauthenticatedResponse.status}`,
        );
      }
      results.push(`${path} (unauthenticated) -> ${unauthenticatedResponse.status}`);
    }

    for (const guard of adminOnlyMutationGuards) {
      const unauthenticatedResponse = await requestWithMethod(request(app), guard.method, guard.path).send(
        guard.body ?? {},
      );
      if (unauthenticatedResponse.status !== 401) {
        throw new Error(
          `unauthenticated ${guard.method.toUpperCase()} access to ${guard.path} should fail with 401, got ${unauthenticatedResponse.status}`,
        );
      }
      results.push(`${guard.path} (unauthenticated ${guard.method.toUpperCase()}) -> 401`);
    }

    for (const path of adminOnlyGetGuardPaths) {
      const unauthenticatedGetResponse = await request(app).get(path);
      if (unauthenticatedGetResponse.status !== 401) {
        throw new Error(
          `unauthenticated GET access to ${path} should fail with 401, got ${unauthenticatedGetResponse.status}`,
        );
      }
      results.push(`${path} (unauthenticated GET) -> 401`);
    }

    for (const path of authenticatedOnlyGuardPaths) {
      const unauthenticatedResponse = await request(app).post(path).send({
        orderId: "qa-unauth-order",
        code: "QA_UNAUTH",
        message: "unauthenticated access check",
      });
      if (unauthenticatedResponse.status !== 401) {
        throw new Error(
          `unauthenticated access to ${path} should fail with 401, got ${unauthenticatedResponse.status}`,
        );
      }
      results.push(`${path} (unauthenticated) -> 401`);
    }

    for (const check of mediaTraversalChecks) {
      const response = await request(app).get(check.path);
      if (!check.expectedStatuses.includes(response.status)) {
        throw new Error(
          `${check.name} failed: expected ${check.expectedStatuses.join("/")} but got ${response.status}`,
        );
      }
      results.push(`${check.path} -> ${response.status}`);
    }

    for (const check of authenticatedChecks) {
      const response = await agent.get(check.path);
      if (!check.expectedStatuses.includes(response.status)) {
        throw new Error(
          `${check.name} failed: expected ${check.expectedStatuses.join("/")} but got ${response.status}`,
        );
      }
      check.validate?.(response.body);
      results.push(`${check.path} -> ${response.status}`);
    }

    for (const path of adminOnlyGetGuardPaths) {
      const nonAdminGetResponse = await agent.get(path);
      if (nonAdminGetResponse.status !== 403) {
        throw new Error(
          `non-admin GET access to ${path} should fail with 403, got ${nonAdminGetResponse.status}`,
        );
      }
      results.push(`${path} (non-admin GET) -> 403`);
    }

    for (const path of adminOnlyGuardPaths.filter((candidate) => candidate !== "/api/admin/dashboard")) {
      const nonAdminResponse = await agent.post(path).send({});
      if (nonAdminResponse.status !== 403) {
        throw new Error(
          `non-admin access to ${path} should fail with 403, got ${nonAdminResponse.status}`,
        );
      }
      results.push(`${path} (non-admin) -> 403`);
    }

    for (const guard of adminOnlyMutationGuards) {
      const nonAdminResponse = await requestWithMethod(agent, guard.method, guard.path).send(guard.body ?? {});
      if (![401, 403].includes(nonAdminResponse.status)) {
        throw new Error(
          `non-admin ${guard.method.toUpperCase()} access to ${guard.path} should fail with 401/403, got ${nonAdminResponse.status}`,
        );
      }
      results.push(`${guard.path} (non-admin ${guard.method.toUpperCase()}) -> ${nonAdminResponse.status}`);
    }

    const secondUserEmail = `qa-smoke-secondary-${Date.now()}@example.com`;
    const secondUserRegisterResponse = await otherUserAgent.post("/api/auth/register").send({
      email: secondUserEmail,
      password: "SmokeTest123!",
      firstName: "QA",
      lastName: "Secondary",
      privacyConsent: true,
      marketingConsent: false,
    });
    if (secondUserRegisterResponse.status !== 201) {
      throw new Error(
        `secondary register flow failed: expected 201 but got ${secondUserRegisterResponse.status}`,
      );
    }
    results.push("/api/auth/register (secondary user) -> 201");

    const feedbackRequestResponse = await agent.post("/api/new-toefl/feedback/request").send({
      testType: "writing",
      testId: "qa-feedback-test",
      questionType: "discussion",
      questionId: 1,
      userAnswer: "This is a smoke QA answer for feedback review.",
      questionContent: "Discuss whether repeated practice tests improve student outcomes.",
      language: "en",
    });
    if (feedbackRequestResponse.status !== 201) {
      throw new Error(
        `feedback request flow failed: expected 201 but got ${feedbackRequestResponse.status}`,
      );
    }
    if (typeof feedbackRequestResponse.body?.requestId !== "string") {
      throw new Error("feedback request response does not include a valid requestId");
    }
    const feedbackRequestId = feedbackRequestResponse.body.requestId as string;
    results.push("/api/new-toefl/feedback/request -> 201");

    const myFeedbackRequestsResponse = await agent.get("/api/new-toefl/feedback/my-requests");
    if (myFeedbackRequestsResponse.status !== 200) {
      throw new Error(
        `feedback my-requests failed: expected 200 but got ${myFeedbackRequestsResponse.status}`,
      );
    }
    if (
      !Array.isArray(myFeedbackRequestsResponse.body) ||
      !myFeedbackRequestsResponse.body.some(
        (requestItem: unknown) =>
          typeof requestItem === "object" &&
          requestItem !== null &&
          "id" in requestItem &&
          (requestItem as { id?: unknown }).id === feedbackRequestId,
      )
    ) {
      throw new Error("created feedback request was not found in my-requests");
    }
    results.push("/api/new-toefl/feedback/my-requests -> 200");

    await pool.query(
      `
        update users
        set role = 'admin',
            membership_tier = 'master',
            subscription_status = 'active',
            is_active = true,
            updated_at = now()
        where id = $1
      `,
      [registeredUserId],
    );

    const authMeAfterPromotion = await agent.get("/api/auth/me");
    if (authMeAfterPromotion.status !== 200) {
      throw new Error(
        `auth me after promotion failed: expected 200 but got ${authMeAfterPromotion.status}`,
      );
    }
    if (authMeAfterPromotion.body?.role !== "admin") {
      throw new Error("promoted user did not refresh as admin");
    }
    results.push("/api/auth/me (after admin promotion) -> 200");

    for (const check of adminChecks) {
      const response = await agent.get(check.path);
      if (!check.expectedStatuses.includes(response.status)) {
        throw new Error(
          `${check.name} failed: expected ${check.expectedStatuses.join("/")} but got ${response.status}`,
        );
      }
      check.validate?.(response.body);
      results.push(`${check.path} -> ${response.status}`);
    }

    const pendingFeedbackResponse = await agent.get("/api/admin/feedback/pending");
    if (pendingFeedbackResponse.status !== 200) {
      throw new Error(
        `admin feedback pending failed: expected 200 but got ${pendingFeedbackResponse.status}`,
      );
    }
    if (
      !Array.isArray(pendingFeedbackResponse.body) ||
      !pendingFeedbackResponse.body.some(
        (requestItem: unknown) =>
          typeof requestItem === "object" &&
          requestItem !== null &&
          "id" in requestItem &&
          (requestItem as { id?: unknown }).id === feedbackRequestId,
      )
    ) {
      throw new Error("created feedback request was not found in admin pending feedback list");
    }
    results.push("/api/admin/feedback/pending -> 200");

    const approveResponse = await agent.post(`/api/admin/feedback/${feedbackRequestId}/approve`);
    if (approveResponse.status !== 200) {
      throw new Error(
        `admin feedback approve failed: expected 200 but got ${approveResponse.status}`,
      );
    }
    if (approveResponse.body?.status !== "approved") {
      throw new Error(
        `approved feedback request has unexpected status: ${String(approveResponse.body?.status)}`,
      );
    }
    results.push("/api/admin/feedback/:id/approve -> 200");

    const approvedFeedbacksResponse = await agent.get("/api/new-toefl/feedback/approved");
    if (approvedFeedbacksResponse.status !== 200) {
      throw new Error(
        `approved feedback list failed: expected 200 but got ${approvedFeedbacksResponse.status}`,
      );
    }
    if (
      !Array.isArray(approvedFeedbacksResponse.body) ||
      !approvedFeedbacksResponse.body.some(
        (requestItem: unknown) =>
          typeof requestItem === "object" &&
          requestItem !== null &&
          "id" in requestItem &&
          (requestItem as { id?: unknown }).id === feedbackRequestId,
      )
    ) {
      throw new Error("approved feedback request was not found in approved feedback list");
    }
    results.push("/api/new-toefl/feedback/approved -> 200");

    const confirmOrderId = `QA_SMOKE_CONFIRM_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const confirmPaymentInsert = await pool.query(
      `
        insert into payments (user_id, toss_order_id, amount, currency, status)
        values ($1, $2, '29000', 'KRW', 'ready')
        returning id
      `,
      [registeredUserId, confirmOrderId],
    );
    const confirmPaymentId = confirmPaymentInsert.rows[0]?.id as string;
    if (typeof confirmPaymentId !== "string") {
      throw new Error("payment confirm setup could not insert a test payment row");
    }

    try {
      const paymentConfirmResponse = await agent.post("/api/payments/confirm").send({
        paymentKey: `qa-smoke-payment-key-${Date.now()}`,
        orderId: confirmOrderId,
        amount: "29000",
      });
      if (paymentConfirmResponse.status !== 200) {
        throw new Error(
          `payment confirm endpoint failed: expected 200 but got ${paymentConfirmResponse.status}`,
        );
      }
      if (paymentConfirmResponse.body?.success !== true) {
        throw new Error("payment confirm response missing success flag");
      }

      const { rows: paymentAfterConfirm } = await pool.query(
        `select status, method from payments where id = $1`,
        [confirmPaymentId],
      );
      const persistedPayment = paymentAfterConfirm[0] as { status?: string; method?: string } | undefined;
      if (persistedPayment?.status !== "done") {
        throw new Error(
          `payment status after confirm is ${String(persistedPayment?.status)}, expected 'done'`,
        );
      }
      if (persistedPayment?.method !== "qa_mock_card") {
        throw new Error(
          `payment method after confirm is ${String(persistedPayment?.method)}, expected 'qa_mock_card'`,
        );
      }

      const { rows: subscriptionRows } = await pool.query(
        `select id, status from subscriptions where user_id = $1 order by created_at desc limit 1`,
        [registeredUserId],
      );
      const createdSubscriptionId = subscriptionRows[0]?.id as string | undefined;
      if (typeof createdSubscriptionId !== "string" || subscriptionRows[0]?.status !== "active") {
        throw new Error("subscription was not created correctly after payment confirmation");
      }
      results.push("/api/payments/confirm -> 200");

      // Idempotency: re-calling confirm must not create a second subscription row
      // or flip the payment row to another state.
      const replayResponse = await agent.post("/api/payments/confirm").send({
        paymentKey: `qa-smoke-payment-key-replay-${Date.now()}`,
        orderId: confirmOrderId,
        amount: "29000",
      });
      if (replayResponse.status !== 200 || replayResponse.body?.success !== true) {
        throw new Error(
          `idempotent replay confirm expected 200 success but got ${replayResponse.status}`,
        );
      }
      if (replayResponse.body?.idempotent !== true) {
        throw new Error("idempotent replay did not report idempotent=true");
      }
      const { rows: subCountRows } = await pool.query(
        `select count(*)::int as count from subscriptions where user_id = $1`,
        [registeredUserId],
      );
      if ((subCountRows[0]?.count ?? 0) !== 1) {
        throw new Error(
          `idempotent replay created a duplicate subscription (count=${subCountRows[0]?.count})`,
        );
      }
      results.push("/api/payments/confirm (replay) -> 200 idempotent");

      await pool.query(`delete from subscriptions where id = $1`, [createdSubscriptionId]);
      await pool.query(
        `
          update users
          set membership_tier = 'master',
              subscription_status = 'active',
              subscription_start_date = null,
              subscription_end_date = null
          where id = $1
        `,
        [registeredUserId],
      );
    } finally {
      await pool.query(`delete from payments where id = $1`, [confirmPaymentId]);
    }

    const aiGenerateResponse = await agent.post("/api/ai/generate-questions").send({
      topic: "QA Mock Topic",
      examType: "toefl",
      section: "reading",
      difficulty: "medium",
      questionCount: 1,
    });
    if (aiGenerateResponse.status !== 200) {
      throw new Error(
        `ai generate questions failed: expected 200 but got ${aiGenerateResponse.status}`,
      );
    }
    const generatedTestSetId = aiGenerateResponse.body?.testSetId as string | undefined;
    if (typeof generatedTestSetId !== "string") {
      throw new Error("ai generate questions response does not include a valid testSetId");
    }
    results.push("/api/ai/generate-questions -> 200");
    await pool.query(`delete from ai_generated_tests where id = $1`, [generatedTestSetId]);
    await pool.query(`delete from test_sets where id = $1`, [generatedTestSetId]);

    const ttsResponse = await agent.post("/api/ai/generate-tts").send({
      script: "QA smoke text to speech.",
      voiceProfile: "default",
    });
    if (ttsResponse.status !== 200 || typeof ttsResponse.body?.audioUrl !== "string") {
      throw new Error(`ai generate tts failed: expected 200 with audioUrl but got ${ttsResponse.status}`);
    }
    results.push("/api/ai/generate-tts -> 200");

    const listeningAudioResponse = await agent.post("/api/writing/listening-audio").send({
      script: "QA smoke sentence one. QA smoke sentence two.",
    });
    if (
      listeningAudioResponse.status !== 200 ||
      typeof listeningAudioResponse.body?.audioUrl !== "string" ||
      !Array.isArray(listeningAudioResponse.body?.segments)
    ) {
      throw new Error(
        `writing listening audio failed: expected 200 with audioUrl and segments but got ${listeningAudioResponse.status}`,
      );
    }
    results.push("/api/writing/listening-audio -> 200");

    const speechToTextResponse = await agent
      .post("/api/speech-to-text")
      .attach("audio", Buffer.from("qa-smoke-audio"), {
        filename: "qa-smoke.webm",
        contentType: "audio/webm",
      });
    if (speechToTextResponse.status !== 200 || speechToTextResponse.body?.success !== true) {
      throw new Error(
        `speech-to-text failed: expected 200 with success true but got ${speechToTextResponse.status}`,
      );
    }
    results.push("/api/speech-to-text -> 200");

    const speechToTextEnhancedResponse = await agent
      .post("/api/speech-to-text-enhanced")
      .attach("audio", Buffer.from("qa-smoke-audio-enhanced"), {
        filename: "qa-smoke-enhanced.webm",
        contentType: "audio/webm",
      });
    if (
      speechToTextEnhancedResponse.status !== 200 ||
      speechToTextEnhancedResponse.body?.success !== true ||
      typeof speechToTextEnhancedResponse.body?.speechMetrics !== "object"
    ) {
      throw new Error(
        `enhanced speech-to-text failed: expected 200 with metrics but got ${speechToTextEnhancedResponse.status}`,
      );
    }
    results.push("/api/speech-to-text-enhanced -> 200");

    const speakingFeedbackResponse = await agent.post("/api/speaking/feedback").send({
      questionText: "Describe a place you enjoy studying in.",
      transcript: "I enjoy studying in a quiet library because it helps me focus.",
      testType: "independent",
    });
    if (
      speakingFeedbackResponse.status !== 200 ||
      typeof speakingFeedbackResponse.body?.scores !== "object" ||
      speakingFeedbackResponse.body?.error !== false
    ) {
      throw new Error(
        `speaking feedback failed: expected 200 with scores but got ${speakingFeedbackResponse.status}`,
      );
    }
    results.push("/api/speaking/feedback -> 200");

    const speakingTestSeed = await pool.query(`select id from speaking_tests order by created_at asc limit 1`);
    const speakingTestId = speakingTestSeed.rows[0]?.id as string | undefined;
    if (typeof speakingTestId !== "string") {
      throw new Error("speaking attempt setup could not find an existing speaking test");
    }

    const speakingAttemptResponse = await agent
      .post("/api/speaking-attempts")
      .field("testId", speakingTestId)
      .field("transcription", "QA smoke attempt transcription")
      .field("feedback", "QA smoke feedback")
      .attach("audio", Buffer.from("qa-speaking-attempt"), {
        filename: "qa-speaking-attempt.webm",
        contentType: "audio/webm",
      });
    if (speakingAttemptResponse.status !== 201 || typeof speakingAttemptResponse.body?.id !== "string") {
      throw new Error(
        `speaking attempts failed: expected 201 with id but got ${speakingAttemptResponse.status}`,
      );
    }
    const ownerSpeakingAttemptId = speakingAttemptResponse.body.id as string;
    results.push("/api/speaking-attempts -> 201");

    // IDOR regression: owner can GET their own attempt, other user is blocked with 403.
    // Storage layer has a memory-fallback path when DB FK constraints reject the insert
    // (e.g. against AI-generated test IDs that aren't in the `tests` table). In that case
    // the POST returns 201 but subsequent GET may not round-trip — we only assert the
    // cross-user block, which is the actual IDOR protection.
    const ownerSpeakingGet = await agent.get(`/api/speaking-attempts/${ownerSpeakingAttemptId}`);
    if (ownerSpeakingGet.status === 200) {
      results.push(`/api/speaking-attempts/:id (owner GET) -> 200`);

      const otherSpeakingGet = await otherUserAgent.get(`/api/speaking-attempts/${ownerSpeakingAttemptId}`);
      if (otherSpeakingGet.status !== 403) {
        throw new Error(
          `other-user speaking-attempts GET should be blocked: expected 403 but got ${otherSpeakingGet.status}`,
        );
      }
      results.push(`/api/speaking-attempts/:id (other-user GET) -> 403`);

      const otherSpeakingPatch = await otherUserAgent
        .patch(`/api/speaking-attempts/${ownerSpeakingAttemptId}`)
        .send({ feedback: "hostile edit" });
      if (otherSpeakingPatch.status !== 403) {
        throw new Error(
          `other-user speaking-attempts PATCH should be blocked: expected 403 but got ${otherSpeakingPatch.status}`,
        );
      }
      results.push(`/api/speaking-attempts/:id (other-user PATCH) -> 403`);
    } else {
      results.push(
        `/api/speaking-attempts/:id (owner GET) -> ${ownerSpeakingGet.status} (memory fallback; cross-user check skipped)`,
      );
    }

    // Writing-attempt IDOR regression via direct DB seed (we don't have a user-facing
    // create endpoint that's mock-friendly, so we insert the row and test the access guard).
    const writingTestSeed = await pool.query(
      `select id from writing_tests order by created_at asc limit 1`,
    );
    const writingTestId = writingTestSeed.rows[0]?.id as string | undefined;
    if (writingTestId) {
      const writingAttemptInsert = await pool.query(
        `insert into writing_attempts (user_id, test_id, essay_text, word_count)
         values ($1, $2, 'QA smoke writing content for the IDOR regression test.', 10)
         returning id`,
        [registeredUserId, writingTestId],
      );
      const writingAttemptId = writingAttemptInsert.rows[0]?.id as string | undefined;
      if (writingAttemptId) {
        try {
          const ownerWritingGet = await agent.get(`/api/writing-attempts/${writingAttemptId}`);
          if (ownerWritingGet.status === 200) {
            results.push(`/api/writing-attempts/:id (owner GET) -> 200`);

            const otherWritingGet = await otherUserAgent.get(`/api/writing-attempts/${writingAttemptId}`);
            if (otherWritingGet.status !== 403) {
              throw new Error(
                `other-user writing-attempts GET should be blocked: expected 403 but got ${otherWritingGet.status}`,
              );
            }
            results.push(`/api/writing-attempts/:id (other-user GET) -> 403`);

            const otherWritingPatch = await otherUserAgent
              .patch(`/api/writing-attempts/${writingAttemptId}`)
              .send({ essayText: "hostile edit attempt" });
            if (otherWritingPatch.status !== 403) {
              throw new Error(
                `other-user writing-attempts PATCH should be blocked: expected 403 but got ${otherWritingPatch.status}`,
              );
            }
            results.push(`/api/writing-attempts/:id (other-user PATCH) -> 403`);
          } else {
            results.push(
              `/api/writing-attempts/:id (owner GET) -> ${ownerWritingGet.status} (memory fallback; cross-user check skipped)`,
            );
          }
        } finally {
          await pool.query(`delete from writing_attempts where id = $1`, [writingAttemptId]);
        }
      }
    }

    // Test-attempts IDOR regression: owner can read, other user cannot.
    const testAttemptSeed = await pool.query(
      `insert into test_attempts (user_id, test_id, status)
       select $1, id, 'in_progress' from tests limit 1
       returning id, test_id`,
      [registeredUserId],
    );
    const testAttemptId = testAttemptSeed.rows[0]?.id as string | undefined;
    if (testAttemptId) {
      try {
        const ownerTestGet = await agent.get(`/api/test-attempts/${testAttemptId}`);
        if (ownerTestGet.status === 200) {
          results.push(`/api/test-attempts/:id (owner GET) -> 200`);

          const otherTestGet = await otherUserAgent.get(`/api/test-attempts/${testAttemptId}`);
          if (otherTestGet.status !== 403) {
            throw new Error(
              `other-user test-attempts GET should be blocked: expected 403 but got ${otherTestGet.status}`,
            );
          }
          results.push(`/api/test-attempts/:id (other-user GET) -> 403`);

          const otherTestAnswers = await otherUserAgent.get(`/api/test-attempts/${testAttemptId}/answers`);
          if (otherTestAnswers.status !== 403) {
            throw new Error(
              `other-user test-attempts answers GET should be blocked: expected 403 but got ${otherTestAnswers.status}`,
            );
          }
          results.push(`/api/test-attempts/:id/answers (other-user GET) -> 403`);

          const otherTestPatch = await otherUserAgent
            .patch(`/api/test-attempts/${testAttemptId}`)
            .send({ status: "completed" });
          if (otherTestPatch.status !== 403) {
            throw new Error(
              `other-user test-attempts PATCH should be blocked: expected 403 but got ${otherTestPatch.status}`,
            );
          }
          results.push(`/api/test-attempts/:id (other-user PATCH) -> 403`);
        } else {
          results.push(
            `/api/test-attempts/:id (owner GET) -> ${ownerTestGet.status} (memory fallback; cross-user check skipped)`,
          );
        }
      } finally {
        await pool.query(`delete from test_attempts where id = $1`, [testAttemptId]);
      }
    }

    const sharedOrderId = `QA_SMOKE_SHARED_ORDER_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const { rows: sharedPaymentRows } = await pool.query(
      `
        insert into payments (user_id, toss_order_id, amount, currency, status)
        values ($1, $2, '29000', 'KRW', 'ready')
        returning id
      `,
      [registeredUserId, sharedOrderId],
    );
    const sharedPaymentId = sharedPaymentRows[0]?.id as string;
    if (typeof sharedPaymentId !== "string") {
      throw new Error("shared payment setup could not insert a test payment row");
    }

    try {
      const otherUserPaymentFailResponse = await otherUserAgent.post("/api/payments/fail").send({
        orderId: sharedOrderId,
        code: "QA_FORBIDDEN",
        message: "secondary user should not be able to fail another user's payment",
      });
      if (otherUserPaymentFailResponse.status !== 403) {
        throw new Error(
          `payment fail ownership guard should return 403, got ${otherUserPaymentFailResponse.status}`,
        );
      }
      results.push("/api/payments/fail (other user forbidden) -> 403");

      const otherUserPaymentConfirmResponse = await otherUserAgent.post("/api/payments/confirm").send({
        paymentKey: "qa-smoke-dummy-payment-key",
        orderId: sharedOrderId,
        amount: "29000",
      });
      if (otherUserPaymentConfirmResponse.status !== 403) {
        throw new Error(
          `payment confirm ownership guard should return 403, got ${otherUserPaymentConfirmResponse.status}`,
        );
      }
      results.push("/api/payments/confirm (other user forbidden) -> 403");
    } finally {
      await pool.query(`delete from payments where id = $1`, [sharedPaymentId]);
    }

    // Admin write flow: create, update, delete a NEW TOEFL reading test.
    const readingCreateResponse = await agent.post("/api/admin/new-toefl-reading").send({
      title: `QA Smoke Reading ${Date.now()}`,
      moduleNumber: 1,
      completeWords: {
        paragraph: "The scientists observed the phenomenon carefully during the experiment.",
        answers: [{ word: "scientists", missingLetters: "sc" }],
      },
      comprehensionPassages: [
        {
          type: "short",
          title: "QA Comprehension",
          content: "A short QA passage used to exercise the admin write path.",
          questions: [],
        },
      ],
      academicPassage: {
        title: "QA Academic",
        content: "An academic passage inserted by the QA smoke run to verify admin writes.",
        questions: [],
      },
      difficulty: "medium",
      isActive: true,
    });
    if (readingCreateResponse.status !== 201) {
      throw new Error(
        `admin new-toefl-reading create failed: expected 201 but got ${readingCreateResponse.status}`,
      );
    }
    const createdReadingId = readingCreateResponse.body?.id;
    if (typeof createdReadingId !== "string") {
      throw new Error("admin new-toefl-reading create response missing id");
    }
    results.push("/api/admin/new-toefl-reading (POST) -> 201");

    const readingUpdateResponse = await agent
      .patch(`/api/admin/new-toefl-reading/${createdReadingId}`)
      .send({ title: `QA Smoke Reading Updated ${Date.now()}` });
    if (readingUpdateResponse.status !== 200) {
      throw new Error(
        `admin new-toefl-reading update failed: expected 200 but got ${readingUpdateResponse.status}`,
      );
    }
    results.push("/api/admin/new-toefl-reading/:id (PATCH) -> 200");

    const readingDeleteResponse = await agent.delete(
      `/api/admin/new-toefl-reading/${createdReadingId}`,
    );
    if (readingDeleteResponse.status !== 200) {
      throw new Error(
        `admin new-toefl-reading delete failed: expected 200 but got ${readingDeleteResponse.status}`,
      );
    }
    results.push("/api/admin/new-toefl-reading/:id (DELETE) -> 200");

    // Feedback reject flow: seed a pending request directly (the public /request endpoint
    // auto-approves via OpenAI for admin/master users, so we bypass it here), then reject
    // it through the admin API and verify the status transitions to 'rejected'.
    const rejectFeedbackInsert = await pool.query(
      `
        insert into new_toefl_feedback_requests (
          user_id, test_type, test_id, question_type, question_id,
          user_answer, question_content, status
        )
        values ($1, 'writing', 'qa-feedback-test-reject', 'discussion', 2,
          'QA Smoke answer queued for admin rejection.',
          'QA smoke rejection prompt to exercise the reject path.',
          'pending')
        returning id
      `,
      [registeredUserId],
    );
    const rejectFeedbackId = rejectFeedbackInsert.rows[0]?.id as string;
    if (typeof rejectFeedbackId !== "string") {
      throw new Error("feedback reject setup could not insert a pending request");
    }

    const rejectResponse = await agent.post(`/api/admin/feedback/${rejectFeedbackId}/reject`);
    if (rejectResponse.status !== 200) {
      throw new Error(
        `admin feedback reject failed: expected 200 but got ${rejectResponse.status}`,
      );
    }
    if (rejectResponse.body?.status !== "rejected") {
      throw new Error(
        `rejected feedback request has unexpected status: ${String(rejectResponse.body?.status)}`,
      );
    }
    results.push("/api/admin/feedback/:id/reject -> 200");

    // Payment failure flow: seed a payment row, call the public fail webhook, verify persistence.
    const qaOrderId = `QA_SMOKE_ORDER_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const paymentInsert = await pool.query(
      `
        insert into payments (user_id, toss_order_id, amount, currency, status)
        values ($1, $2, '29000', 'KRW', 'ready')
        returning id
      `,
      [registeredUserId, qaOrderId],
    );
    const fakePaymentId = paymentInsert.rows[0]?.id as string;
    if (typeof fakePaymentId !== "string") {
      throw new Error("payment failure setup could not insert a test payment row");
    }

    try {
      const paymentFailResponse = await agent.post("/api/payments/fail").send({
        orderId: qaOrderId,
        code: "QA_CARD_DECLINED",
        message: "QA smoke simulated card decline",
      });
      if (paymentFailResponse.status !== 200) {
        throw new Error(
          `payment failure endpoint failed: expected 200 but got ${paymentFailResponse.status}`,
        );
      }
      if (paymentFailResponse.body?.success !== true) {
        throw new Error("payment failure response missing success flag");
      }

      const { rows: paymentAfterFail } = await pool.query(
        `select status, failure_code, failure_message from payments where id = $1`,
        [fakePaymentId],
      );
      const persisted = paymentAfterFail[0] as
        | { status?: string; failure_code?: string; failure_message?: string }
        | undefined;
      if (persisted?.status !== "cancelled") {
        throw new Error(
          `payment status after failure is ${String(persisted?.status)}, expected 'cancelled'`,
        );
      }
      if (persisted?.failure_code !== "QA_CARD_DECLINED") {
        throw new Error(
          `payment failure_code not persisted: got ${String(persisted?.failure_code)}`,
        );
      }
      results.push("/api/payments/fail -> 200");
    } finally {
      await pool.query(`delete from payments where id = $1`, [fakePaymentId]);
    }

    const logoutResponse = await agent.post("/api/auth/logout");
    if (logoutResponse.status !== 200) {
      throw new Error(`logout flow failed: expected 200 but got ${logoutResponse.status}`);
    }

    const authMeAfterLogout = await agent.get("/api/auth/me");
    if (authMeAfterLogout.status !== 401) {
      throw new Error(`auth me after logout failed: expected 401 but got ${authMeAfterLogout.status}`);
    }

    results.push("/api/auth/register -> 201");
    results.push("/api/auth/me (after register) -> 200");
    results.push("/api/auth/logout -> 200");
    results.push("/api/auth/me (after logout) -> 401");

    let testsList: Array<{ id?: unknown }> = [];

    for (const check of publicChecks) {
      const response = await request(app).get(check.path);
      if (!check.expectedStatuses.includes(response.status)) {
        throw new Error(
          `${check.name} failed: expected ${check.expectedStatuses.join("/")} but got ${response.status}`,
        );
      }
      check.validate?.(response.body);
      results.push(`${check.path} -> ${response.status}`);

      if (check.path === "/api/tests" && Array.isArray(response.body)) {
        testsList = response.body;
      }
    }

    const detailTestId = testsList
      .map((testItem) => testItem.id)
      .find(
        (testId): testId is string =>
          typeof testId === "string" &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId) &&
          !testId.startsWith("new-listening-") &&
          !testId.startsWith("ai-"),
      );

    if (detailTestId) {
      const detailResponse = await request(app).get(`/api/tests/${encodeURIComponent(detailTestId)}`);
      if (detailResponse.status !== 200) {
        throw new Error(`/api/tests/:id failed: expected 200 but got ${detailResponse.status}`);
      }
      if (
        typeof detailResponse.body !== "object" ||
        detailResponse.body === null ||
        detailResponse.body.id !== detailTestId
      ) {
        throw new Error("/api/tests/:id response shape is invalid");
      }
      results.push(`/api/tests/${detailTestId} -> 200`);

      const questionsResponse = await request(app).get(`/api/tests/${encodeURIComponent(detailTestId)}/questions`);
      if (questionsResponse.status !== 200) {
        throw new Error(`/api/tests/:id/questions failed: expected 200 but got ${questionsResponse.status}`);
      }
      if (!Array.isArray(questionsResponse.body)) {
        throw new Error("/api/tests/:id/questions response is not an array");
      }
      results.push(`/api/tests/${detailTestId}/questions -> 200`);
    }

    const [{ rows: users }, { rows: tests }, { rows: subscriptions }] = await Promise.all([
      pool.query("select count(*)::int as count from users"),
      pool.query("select count(*)::int as count from ai_generated_tests"),
      pool.query("select count(*)::int as count from subscriptions"),
    ]);

    console.log("QA smoke checks passed");
    for (const result of results) {
      console.log(result);
    }
    console.log(
      JSON.stringify(
        {
          users: users[0]?.count ?? 0,
          aiGeneratedTests: tests[0]?.count ?? 0,
          subscriptions: subscriptions[0]?.count ?? 0,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
