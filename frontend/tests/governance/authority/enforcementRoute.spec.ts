import { createSessionToken, SESSION_COOKIE_NAME } from "../../../lib/auth/sessionCookie";
import {
  POST as feeEnginePost,
  __setAuthorityEnforcementEvaluatorForTests,
  __setFeeLedgerEmitterForTests,
} from "../../../app/api/internal/fee-engine/route";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function buildAdminCookie() {
  const token = createSessionToken({
    role: "admin",
    email: "admin@example.com",
    userId: "admin-1",
    ttlHours: 1,
  });
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

function buildProductApprovedRequest() {
  return new Request("http://localhost/api/internal/fee-engine", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: buildAdminCookie(),
    },
    body: JSON.stringify({
      triggerEvent: "PRODUCT_APPROVED",
      productId: "product-1",
      servicePartnerId: "partner-1",
      certificationFeeBase: 100,
      currency: "AUD",
    }),
  });
}

async function testEnforcementBlockReturns403AndSkipsFeeEmission() {
  let feeEmitterCalled = 0;

  __setFeeLedgerEmitterForTests(async () => {
    feeEmitterCalled += 1;
    return {} as any;
  });
  __setAuthorityEnforcementEvaluatorForTests(async () => ({
    preconditions: {
      enabled: true,
      killSwitch: false,
      strictMode: false,
      bypassed: false,
      bypassReason: null,
    },
    shadow: {
      created: true,
      decision: {
        decisionId: "shadow-1",
      } as any,
      evaluation: {} as any,
    },
    enforcement: {
      applied: true,
      result: "BLOCK",
      created: true,
      decision: {
        enforcementDecisionId: "enforcement-1",
      } as any,
      responseMutationCode: "HTTP_403_AUTHZ_BLOCK",
      strictMode: false,
      divergenceDetected: false,
      bypassReason: null,
      failureCode: null,
    },
  }));

  const response = await feeEnginePost(buildProductApprovedRequest());
  const json = await response.json();

  assert(response.status === 403, "Expected 403 when enforcement blocks");
  assert(json.enforcementDecisionId === "enforcement-1", "Expected enforcement decision reference");
  assert(feeEmitterCalled === 0, "Fee ledger emitter must not run when enforcement blocks");
}

async function testBypassedEnforcementKeepsRouteSuccess() {
  let feeEmitterCalled = 0;

  __setFeeLedgerEmitterForTests(async () => {
    feeEmitterCalled += 1;
    return {
      eventId: "fee-event-1",
      eventType: "PARTNER_LISTING_APPROVAL_FEE",
    } as any;
  });
  __setAuthorityEnforcementEvaluatorForTests(async () => ({
    preconditions: {
      enabled: false,
      killSwitch: false,
      strictMode: false,
      bypassed: true,
      bypassReason: "ENFORCEMENT_FLAG_DISABLED",
    },
    shadow: {
      created: true,
      decision: {
        decisionId: "shadow-2",
      } as any,
      evaluation: {} as any,
    },
    enforcement: {
      applied: false,
      result: "ALLOW",
      created: false,
      decision: null,
      responseMutationCode: null,
      strictMode: false,
      divergenceDetected: false,
      bypassReason: "ENFORCEMENT_FLAG_DISABLED",
      failureCode: null,
    },
  }));

  const response = await feeEnginePost(buildProductApprovedRequest());
  const json = await response.json();

  assert(response.status === 200, "Expected success when enforcement is bypassed");
  assert(json.ok === true, "Expected unchanged success payload");
  assert(feeEmitterCalled === 1, "Fee ledger emitter should run on bypass");
}

async function testStrictModeInternalFailureBlocks() {
  let feeEmitterCalled = 0;

  __setFeeLedgerEmitterForTests(async () => {
    feeEmitterCalled += 1;
    return {} as any;
  });
  __setAuthorityEnforcementEvaluatorForTests(async () => ({
    preconditions: {
      enabled: true,
      killSwitch: false,
      strictMode: true,
      bypassed: false,
      bypassReason: null,
    },
    shadow: {
      created: true,
      decision: {
        decisionId: "shadow-3",
      } as any,
      evaluation: {} as any,
    },
    enforcement: {
      applied: true,
      result: "BLOCK",
      created: false,
      decision: null,
      responseMutationCode: "HTTP_403_AUTHZ_BLOCK_STRICT_INTERNAL_ERROR",
      strictMode: true,
      divergenceDetected: false,
      bypassReason: null,
      failureCode: "AUTHORITY_ENFORCEMENT_PERSIST_FAILED",
    },
  }));

  const response = await feeEnginePost(buildProductApprovedRequest());
  const json = await response.json();

  assert(response.status === 403, "Expected strict mode internal failure to block");
  assert(json.code === "AUTHORITY_ENFORCEMENT_PERSIST_FAILED", "Expected strict failure code");
  assert(feeEmitterCalled === 0, "Fee ledger emitter must not run on strict mode block");
}

async function run() {
  try {
    await testEnforcementBlockReturns403AndSkipsFeeEmission();
    await testBypassedEnforcementKeepsRouteSuccess();
    await testStrictModeInternalFailureBlocks();
  } finally {
    __setAuthorityEnforcementEvaluatorForTests();
    __setFeeLedgerEmitterForTests();
  }
}

run();
