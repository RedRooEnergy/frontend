import crypto from "crypto";
import {
  POST,
  __setAuthorityShadowMetricsRunnerForTests,
} from "../../../app/api/internal/governance/authority/shadow/metrics/route";

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

async function testRouteDisabled() {
  await withEnv(
    {
      ENABLE_GOV04_AUTHORITY_SHADOW: "false",
      ENABLE_GOV04_AUTHORITY_SHADOW_METRICS: "false",
      ENABLE_GOV04_AUTHORITY_SHADOW_METRICS_ROUTE: "false",
      GOV04_AUTHORITY_SHADOW_METRICS_JOB_SECRET: "shadow-secret",
    },
    async () => {
      const req = new Request("http://localhost/api/internal/governance/authority/shadow/metrics", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      assert(res.status === 404, "Expected 404 when route disabled");
    }
  );
}

async function testInvalidSignature() {
  await withEnv(
    {
      ENABLE_GOV04_AUTHORITY_SHADOW: "true",
      ENABLE_GOV04_AUTHORITY_SHADOW_METRICS: "true",
      ENABLE_GOV04_AUTHORITY_SHADOW_METRICS_ROUTE: "true",
      GOV04_AUTHORITY_SHADOW_METRICS_JOB_SECRET: "shadow-secret",
    },
    async () => {
      const body = JSON.stringify({ source: "api_internal" });
      const req = new Request("http://localhost/api/internal/governance/authority/shadow/metrics", {
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

async function testValidSignature() {
  await withEnv(
    {
      ENABLE_GOV04_AUTHORITY_SHADOW: "true",
      ENABLE_GOV04_AUTHORITY_SHADOW_METRICS: "true",
      ENABLE_GOV04_AUTHORITY_SHADOW_METRICS_ROUTE: "true",
      GOV04_AUTHORITY_SHADOW_METRICS_JOB_SECRET: "shadow-secret",
    },
    async () => {
      __setAuthorityShadowMetricsRunnerForTests(async () => ({
        reportVersion: "gov04-authority-shadow-metrics.v1",
        generatedAtUtc: "2026-02-13T12:00:00.000Z",
        windowStartUtc: "2026-02-13T11:00:00.000Z",
        windowEndUtc: "2026-02-13T12:00:00.000Z",
        source: "api_internal",
        filters: {
          fromUtc: "2026-02-13T11:00:00.000Z",
          toUtc: "2026-02-13T12:00:00.000Z",
          limit: 100,
        },
        summary: {
          decisionsTotal: 1,
          wouldBlockTotal: 1,
          policyConflictTotal: 0,
          enforcementDecisionsTotal: 1,
          shadowVsEnforcementDivergenceTotal: 0,
          shadowVsEnforcementDivergenceRate: 0,
          casesOpenedTotal: 1,
          openCaseBacklog: 1,
          deterministicMismatchTotal: 0,
          deterministicMismatchRate: 0,
        },
        series: {
          wouldDecisionCounts: [{ wouldDecision: "WOULD_BLOCK", count: 1 }],
          policyConflictCounts: [],
        },
        deterministicHashSha256: "a".repeat(64),
      }));

      const body = JSON.stringify({ source: "api_internal", limit: 100 });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = sign("shadow-secret", timestamp, body);

      const req = new Request("http://localhost/api/internal/governance/authority/shadow/metrics", {
        method: "POST",
        headers: {
          "x-rre-job-timestamp": String(timestamp),
          "x-rre-job-signature": signature,
          "content-type": "application/json",
        },
        body,
      });

      const res = await POST(req);
      assert(res.status === 200, "Expected 200 for valid signature");

      const json = await res.json();
      assert(json.reportVersion === "gov04-authority-shadow-metrics.v1", "Expected shadow metrics report version");
      assert(json.deterministicHashSha256 === "a".repeat(64), "Expected deterministic hash value");
    }
  );

  __setAuthorityShadowMetricsRunnerForTests();
}

async function run() {
  await testRouteDisabled();
  await testInvalidSignature();
  await testValidSignature();
}

run();
