import crypto from "crypto";
import { POST } from "../../app/api/internal/payments/reconcile/route";

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

function sign(secret: string, timestamp: number, rawBody: string) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

async function testReconciliationDisabled() {
  await withEnv(
    {
      ENABLE_PAYMENTS_RECONCILIATION: "false",
      PAYMENTS_RECONCILIATION_JOB_SECRET: "secret",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_WISE_HARDENED_FLOW: "false",
    },
    async () => {
      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      assert(res.status === 404, "Expected 404 when reconciliation flag disabled");
    }
  );
}

async function testInvalidSignatureRejected() {
  await withEnv(
    {
      ENABLE_PAYMENTS_RECONCILIATION: "true",
      PAYMENTS_RECONCILIATION_JOB_SECRET: "secret",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_WISE_HARDENED_FLOW: "false",
    },
    async () => {
      const body = JSON.stringify({ source: "api_internal" });
      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        method: "POST",
        headers: {
          "x-rre-job-timestamp": String(Math.floor(Date.now() / 1000)),
          "x-rre-job-signature": "invalid",
          "content-type": "application/json",
        },
        body,
      });

      const res = await POST(req);
      assert(res.status === 401, "Expected 401 for invalid signature");
    }
  );
}

async function testValidSignatureReturnsReport() {
  await withEnv(
    {
      ENABLE_PAYMENTS_RECONCILIATION: "true",
      PAYMENTS_RECONCILIATION_JOB_SECRET: "secret",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_WISE_HARDENED_FLOW: "false",
    },
    async () => {
      const body = JSON.stringify({ source: "api_internal", limit: 25 });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = sign("secret", timestamp, body);

      const req = new Request("http://localhost/api/internal/payments/reconcile", {
        method: "POST",
        headers: {
          "x-rre-job-timestamp": String(timestamp),
          "x-rre-job-signature": signature,
          "content-type": "application/json",
        },
        body,
      });

      const res = await POST(req);
      assert(res.status === 200, "Expected 200 for valid reconciliation request");

      const json = await res.json();
      assert(json.reportVersion === "payments-reconciliation.v1", "Expected reconciliation report version");
      assert(json.source === "api_internal", "Expected report source api_internal");
      assert(json.summary?.ordersScanned === 0, "Expected zero orders in empty store reconciliation");
    }
  );
}

async function run() {
  await testReconciliationDisabled();
  await testInvalidSignatureRejected();
  await testValidSignatureReturnsReport();
}

run();
