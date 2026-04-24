import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../../server/middleware/rateLimit";

type CapturedResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
};

function mockReq(overrides: Partial<Record<string, unknown>> = {}): any {
  return {
    ip: "127.0.0.1",
    headers: {},
    ...overrides,
  };
}

function mockRes(): { res: any; captured: CapturedResponse } {
  const captured: CapturedResponse = { statusCode: 200, headers: {}, body: undefined };
  const res: any = {
    setHeader(name: string, value: string | number) {
      captured.headers[name.toLowerCase()] = String(value);
    },
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    json(body: unknown) {
      captured.body = body;
      return res;
    },
  };
  return { res, captured };
}

function callLimiter(limiter: ReturnType<typeof createRateLimiter>, req: any): {
  captured: CapturedResponse;
  nextCalled: boolean;
} {
  const { res, captured } = mockRes();
  let nextCalled = false;
  limiter(req, res, () => {
    nextCalled = true;
  });
  return { captured, nextCalled };
}

test("createRateLimiter allows traffic under the max and blocks once exceeded", () => {
  // Disable QA short-circuits that skip the limiter in smoke mode.
  const originalMock = process.env.QA_MOCK_EXTERNALS;
  const originalReal = process.env.QA_REAL_PROVIDERS;
  delete process.env.QA_MOCK_EXTERNALS;
  delete process.env.QA_REAL_PROVIDERS;

  try {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, label: "test" });
    const req = mockReq({ user: { id: "user-under-test" } });

    for (let i = 0; i < 3; i += 1) {
      const { captured, nextCalled } = callLimiter(limiter, req);
      assert.equal(nextCalled, true, `call ${i + 1} should pass`);
      assert.equal(captured.statusCode, 200);
    }

    const blocked = callLimiter(limiter, req);
    assert.equal(blocked.nextCalled, false, "fourth call must be rejected");
    assert.equal(blocked.captured.statusCode, 429);
    assert.equal((blocked.captured.body as any)?.code, "RATE_LIMITED");
    assert.ok(blocked.captured.headers["retry-after"], "retry-after header must be set");
  } finally {
    if (originalMock !== undefined) process.env.QA_MOCK_EXTERNALS = originalMock;
    if (originalReal !== undefined) process.env.QA_REAL_PROVIDERS = originalReal;
  }
});

test("createRateLimiter isolates buckets per user", () => {
  const originalMock = process.env.QA_MOCK_EXTERNALS;
  const originalReal = process.env.QA_REAL_PROVIDERS;
  delete process.env.QA_MOCK_EXTERNALS;
  delete process.env.QA_REAL_PROVIDERS;

  try {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, label: "per-user" });

    for (let i = 0; i < 2; i += 1) {
      const result = callLimiter(limiter, mockReq({ user: { id: "alice" } }));
      assert.equal(result.nextCalled, true);
    }

    // Alice is now at the limit but Bob should still get through fully.
    for (let i = 0; i < 2; i += 1) {
      const result = callLimiter(limiter, mockReq({ user: { id: "bob" } }));
      assert.equal(result.nextCalled, true, `bob call ${i + 1} should pass`);
    }

    const aliceBlocked = callLimiter(limiter, mockReq({ user: { id: "alice" } }));
    assert.equal(aliceBlocked.captured.statusCode, 429);
  } finally {
    if (originalMock !== undefined) process.env.QA_MOCK_EXTERNALS = originalMock;
    if (originalReal !== undefined) process.env.QA_REAL_PROVIDERS = originalReal;
  }
});

test("createRateLimiter short-circuits in QA mock mode", () => {
  const original = process.env.QA_MOCK_EXTERNALS;
  process.env.QA_MOCK_EXTERNALS = "1";
  try {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, label: "qa-bypass" });
    const req = mockReq({ user: { id: "qa" } });
    for (let i = 0; i < 5; i += 1) {
      const result = callLimiter(limiter, req);
      assert.equal(result.nextCalled, true, `QA call ${i + 1} should bypass limits`);
    }
  } finally {
    if (original === undefined) delete process.env.QA_MOCK_EXTERNALS;
    else process.env.QA_MOCK_EXTERNALS = original;
  }
});

test("parseEnv enforces SESSION_SECRET length in production", async () => {
  const { parseEnv } = await import("../../server/env");
  const baseValidEnv = {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
  } as NodeJS.ProcessEnv;

  // Missing secret → must throw.
  assert.throws(() => parseEnv({ ...baseValidEnv }), /SESSION_SECRET/);

  // Short secret → must throw.
  assert.throws(
    () => parseEnv({ ...baseValidEnv, SESSION_SECRET: "short" }),
    /SESSION_SECRET/,
  );

  // Placeholder → must throw.
  assert.throws(
    () => parseEnv({ ...baseValidEnv, SESSION_SECRET: "inrise-dev-secret-key-2025" }),
    /placeholder/,
  );

  // Valid secret → must succeed.
  const parsed = parseEnv({
    ...baseValidEnv,
    SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  });
  assert.equal(parsed.NODE_ENV, "production");
});

test("parseEnv requires DATABASE_URL", async () => {
  const { parseEnv } = await import("../../server/env");
  assert.throws(
    () => parseEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv),
    /DATABASE_URL/,
  );
});

test("parseEnv allows short SESSION_SECRET in development", async () => {
  const { parseEnv } = await import("../../server/env");
  const parsed = parseEnv({
    NODE_ENV: "development",
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
    SESSION_SECRET: "dev-short-secret",
  } as NodeJS.ProcessEnv);
  assert.equal(parsed.NODE_ENV, "development");
});
