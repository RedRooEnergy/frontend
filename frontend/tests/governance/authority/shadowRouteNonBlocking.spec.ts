import { POST as wiseCreateTransferPost } from "../../../app/api/settlements/wise/create-transfer/route";
import { writeStore } from "../../../lib/store";
import { __setAuthorityShadowDispatcherForTests } from "../../../lib/governance/authority/observe";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function withEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const snapshot = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }

  try {
    await fn();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(snapshot)) {
      process.env[key] = value;
    }
  }
}

function seedOrder(orderId: string) {
  const now = new Date().toISOString();
  writeStore(
    "orders" as any,
    [
      {
        orderId,
        createdAt: now,
        buyerEmail: "buyer@example.com",
        shippingAddress: {
          line1: "1 Test Street",
          city: "Sydney",
          state: "NSW",
          postcode: "2000",
          country: "AU",
        },
        items: [
          {
            productSlug: "prod-1",
            name: "Product 1",
            qty: 1,
            price: 100,
            supplierId: "SUP-1",
          },
        ],
        supplierIds: ["SUP-1"],
        total: 100,
        status: "DELIVERED",
        currency: "aud",
        escrowStatus: "HELD",
        timeline: [
          {
            status: "DELIVERED",
            timestamp: now,
            note: "Delivered",
          },
        ],
      },
    ] as any
  );
}

async function testShadowWouldBlockDoesNotChangeRouteBehavior() {
  await withEnv(
    {
      ENABLE_GOV04_AUTHORITY_OBSERVE: "true",
      ENABLE_GOV04_AUTHORITY_SHADOW: "true",
      ENABLE_GOV04_AUTHORITY_SHADOW_CASE_SCAFFOLD: "true",
      ENABLE_FREIGHT_SOFT_ENFORCEMENT_PILOT: "false",
      ENABLE_WISE_HARDENED_FLOW: "false",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_PAYMENTS_METRICS: "false",
      ENABLE_PAYMENTS_RECONCILIATION: "false",
    },
    async () => {
      const orderId = "ORD-GOV04-SHADOW-NONBLOCK-1";
      seedOrder(orderId);

      __setAuthorityShadowDispatcherForTests(async () => ({
        processed: true,
        created: true,
        caseScaffolded: true,
        caseCreated: true,
        caseId: "case-shadow-1",
        decision: {
          decisionId: "shadow-decision-1",
        } as any,
        evaluation: {
          wouldDecision: "WOULD_BLOCK",
          wouldBlock: true,
          reasonCodes: ["NO_ACTIVE_POLICY"],
          policyConflictCode: "NO_ACTIVE_POLICY",
        } as any,
      }));

      const req = new Request("http://localhost/api/settlements/wise/create-transfer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-admin": "1",
          "x-dev-admin-user": "admin-shadow-test",
        },
        body: JSON.stringify({ orderId, tenantId: "TENANT-1" }),
      });

      const res = await wiseCreateTransferPost(req);
      assert(res.status === 200, "Expected 200 even when shadow would-block is emitted");
      const json = await res.json();
      assert(json.ok === true, "Expected payout route success response to remain unchanged");
    }
  );

  __setAuthorityShadowDispatcherForTests();
  writeStore("orders" as any, [] as any);
}

async function run() {
  await testShadowWouldBlockDoesNotChangeRouteBehavior();
}

run();
