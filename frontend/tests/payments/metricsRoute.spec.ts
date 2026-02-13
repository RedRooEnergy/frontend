import crypto from "crypto";
import {
  POST,
  __setPaymentsMetricsSnapshotRunnerForTests,
} from "../../app/api/internal/payments/metrics/snapshot/route";

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

async function testMetricsRouteDisabled() {
  await withEnv(
    {
      ENABLE_PAYMENTS_METRICS: "false",
      ENABLE_PAYMENTS_METRICS_ROUTE: "false",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_WISE_HARDENED_FLOW: "false",
    },
    async () => {
      const req = new Request("http://localhost/api/internal/payments/metrics/snapshot", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      assert(res.status === 404, "Expected 404 when metrics route flag disabled");
    }
  );
}

async function testMethodGuard() {
  await withEnv(
    {
      ENABLE_PAYMENTS_METRICS: "true",
      ENABLE_PAYMENTS_METRICS_ROUTE: "true",
      PAYMENTS_METRICS_JOB_SECRET: "metrics-secret",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_WISE_HARDENED_FLOW: "false",
    },
    async () => {
      const req = new Request("http://localhost/api/internal/payments/metrics/snapshot", {
        method: "GET",
      });
      const res = await POST(req);
      assert(res.status === 405, "Expected 405 for non-POST method");
      assert(res.headers.get("allow") === "POST", "Expected Allow header to be POST");
    }
  );
}

async function testInvalidSignatureRejected() {
  await withEnv(
    {
      ENABLE_PAYMENTS_METRICS: "true",
      ENABLE_PAYMENTS_METRICS_ROUTE: "true",
      PAYMENTS_METRICS_JOB_SECRET: "metrics-secret",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_WISE_HARDENED_FLOW: "false",
    },
    async () => {
      const body = JSON.stringify({ source: "api_internal" });
      const req = new Request("http://localhost/api/internal/payments/metrics/snapshot", {
        method: "POST",
        headers: {
          "x-rre-job-timestamp": String(Math.floor(Date.now() / 1000)),
          "x-rre-job-signature": "invalid",
          "content-type": "application/json",
        },
        body,
      });

      const res = await POST(req);
      assert(res.status === 401, "Expected 401 for invalid metrics signature");
    }
  );
}

async function testValidSignatureReturnsSnapshot() {
  await withEnv(
    {
      ENABLE_PAYMENTS_METRICS: "true",
      ENABLE_PAYMENTS_METRICS_ROUTE: "true",
      PAYMENTS_METRICS_JOB_SECRET: "metrics-secret",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_WISE_HARDENED_FLOW: "false",
    },
    async () => {
      __setPaymentsMetricsSnapshotRunnerForTests(async () => ({
        reportVersion: "payments-metrics.v1",
        generatedAtUtc: "2026-02-13T12:00:00.000Z",
        windowStartUtc: "2026-02-13T11:00:00.000Z",
        windowEndUtc: "2026-02-13T12:00:00.000Z",
        filters: {
          source: "api_internal",
          limit: 100,
          fromUtc: "2026-02-13T11:00:00.000Z",
          toUtc: "2026-02-13T12:00:00.000Z",
        },
        aggregates: {
          providerApiLatency: [],
          webhookVerificationFailures: [],
          webhookDuplicateSuppression: [],
          idempotencyConflicts: [],
          wiseIntentLifecycleTiming: [],
          wisePollingOutcomes: [],
          reconciliationRuns: [],
          reconciliationDiscrepancies: [],
          reconciliationDiscrepancyAging: [],
        },
        slos: [],
        deterministicHashSha256: "a".repeat(64),
      }));

      const body = JSON.stringify({ source: "api_internal", limit: 100 });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = sign("metrics-secret", timestamp, body);

      const req = new Request("http://localhost/api/internal/payments/metrics/snapshot", {
        method: "POST",
        headers: {
          "x-rre-job-timestamp": String(timestamp),
          "x-rre-job-signature": signature,
          "content-type": "application/json",
        },
        body,
      });

      const res = await POST(req);
      assert(res.status === 200, "Expected 200 for valid metrics snapshot request");

      const json = await res.json();
      assert(json.reportVersion === "payments-metrics.v1", "Expected metrics report version");
      assert(typeof json.deterministicHashSha256 === "string", "Expected deterministic hash field");
    }
  );

  __setPaymentsMetricsSnapshotRunnerForTests();
}

async function run() {
  await testMetricsRouteDisabled();
  await testMethodGuard();
  await testInvalidSignatureRejected();
  await testValidSignatureReturnsSnapshot();
}

run();
