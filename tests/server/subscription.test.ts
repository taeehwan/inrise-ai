import test from "node:test";
import assert from "node:assert/strict";
import { requireAIAccess, requireAdvancedAI, requireCoaching, requirePaidMember } from "../../server/middleware/subscription";

type CapturedResponse = {
  statusCode: number;
  body: unknown;
};

function mockRes(): { res: any; captured: CapturedResponse } {
  const captured: CapturedResponse = { statusCode: 200, body: undefined };
  const res: any = {
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

function run(mw: (req: any, res: any, next: any) => unknown, req: any): {
  captured: CapturedResponse;
  nextCalled: boolean;
} {
  const { res, captured } = mockRes();
  let nextCalled = false;
  mw(req, res, () => {
    nextCalled = true;
  });
  return { captured, nextCalled };
}

test("requirePaidMember rejects unauthenticated requests with 401", () => {
  const { captured, nextCalled } = run(requirePaidMember, {});
  assert.equal(nextCalled, false);
  assert.equal(captured.statusCode, 401);
});

test("requirePaidMember rejects guest tier with 403", () => {
  const { captured, nextCalled } = run(requirePaidMember, {
    user: { id: "u1", role: "user", membershipTier: "guest", subscriptionStatus: "inactive" },
  });
  assert.equal(nextCalled, false);
  assert.equal(captured.statusCode, 403);
  assert.equal((captured.body as any)?.currentTier, "guest");
});

test("requirePaidMember allows every paid tier", () => {
  for (const tier of ["light", "pro", "max", "master"] as const) {
    const { nextCalled, captured } = run(requirePaidMember, {
      user: { id: "u1", role: "user", membershipTier: tier, subscriptionStatus: "active" },
    });
    assert.equal(nextCalled, true, `${tier} should pass`);
    assert.equal(captured.statusCode, 200);
  }
});

test("requireAIAccess is an alias for requirePaidMember", () => {
  // guest blocked
  const guest = run(requireAIAccess, {
    user: { id: "u1", role: "user", membershipTier: "guest", subscriptionStatus: "inactive" },
  });
  assert.equal(guest.nextCalled, false);
  assert.equal(guest.captured.statusCode, 403);

  // light allowed
  const paid = run(requireAIAccess, {
    user: { id: "u1", role: "user", membershipTier: "light", subscriptionStatus: "active" },
  });
  assert.equal(paid.nextCalled, true);
});

test("requireAdvancedAI blocks light and allows pro+", () => {
  const light = run(requireAdvancedAI, {
    user: { id: "u1", role: "user", membershipTier: "light", subscriptionStatus: "active" },
  });
  assert.equal(light.nextCalled, false);
  assert.equal(light.captured.statusCode, 403);
  assert.equal((light.captured.body as any)?.requiredTier, "pro");

  for (const tier of ["pro", "max", "master"] as const) {
    const { nextCalled } = run(requireAdvancedAI, {
      user: { id: "u1", role: "user", membershipTier: tier, subscriptionStatus: "active" },
    });
    assert.equal(nextCalled, true, `${tier} should pass requireAdvancedAI`);
  }
});

test("requireCoaching blocks pro and allows max+", () => {
  const pro = run(requireCoaching, {
    user: { id: "u1", role: "user", membershipTier: "pro", subscriptionStatus: "active" },
  });
  assert.equal(pro.nextCalled, false);
  assert.equal(pro.captured.statusCode, 403);

  for (const tier of ["max", "master"] as const) {
    const { nextCalled } = run(requireCoaching, {
      user: { id: "u1", role: "user", membershipTier: tier, subscriptionStatus: "active" },
    });
    assert.equal(nextCalled, true, `${tier} should pass requireCoaching`);
  }
});

test("tier gating rejects unauthenticated on advanced tiers as well", () => {
  const advanced = run(requireAdvancedAI, {});
  assert.equal(advanced.nextCalled, false);
  assert.equal(advanced.captured.statusCode, 401);

  const coaching = run(requireCoaching, {});
  assert.equal(coaching.nextCalled, false);
  assert.equal(coaching.captured.statusCode, 401);
});
