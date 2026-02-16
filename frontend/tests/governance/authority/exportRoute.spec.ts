import crypto from "crypto";
import { POST } from "../../../app/api/internal/governance/authority/export/route";
import { setAuthorityExportRunnerForTests } from "../../../lib/internal/authorityExportTestHooks";

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
      ENABLE_GOV04_AUTHORITY_OBSERVE: "false",
      GOV04_AUTHORITY_EXPORT_JOB_SECRET: "authority-secret",
    },
    async () => {
      const req = new Request("http://localhost/api/internal/governance/authority/export", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      assert(res.status === 404, "Expected 404 when authority observe disabled");
    }
  );
}

async function testMethodGuard() {
  await withEnv(
    {
      ENABLE_GOV04_AUTHORITY_OBSERVE: "true",
      GOV04_AUTHORITY_EXPORT_JOB_SECRET: "authority-secret",
    },
    async () => {
      const req = new Request("http://localhost/api/internal/governance/authority/export", {
        method: "GET",
      });
      const res = await POST(req);
      assert(res.status === 405, "Expected 405 for method guard");
      assert(res.headers.get("allow") === "POST", "Expected Allow header");
    }
  );
}

async function testInvalidSignature() {
  await withEnv(
    {
      ENABLE_GOV04_AUTHORITY_OBSERVE: "true",
      GOV04_AUTHORITY_EXPORT_JOB_SECRET: "authority-secret",
    },
    async () => {
      const body = JSON.stringify({ source: "api_internal" });
      const req = new Request("http://localhost/api/internal/governance/authority/export", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rre-job-timestamp": String(Math.floor(Date.now() / 1000)),
          "x-rre-job-signature": "invalid",
        },
        body,
      });

      const res = await POST(req);
      assert(res.status === 401, "Expected 401 for invalid signature");
    }
  );
}

async function testValidSignatureReturnsExport() {
  await withEnv(
    {
      ENABLE_GOV04_AUTHORITY_OBSERVE: "true",
      GOV04_AUTHORITY_EXPORT_JOB_SECRET: "authority-secret",
    },
    async () => {
      setAuthorityExportRunnerForTests(async () => ({
        reportVersion: "gov04-authority-export.v1",
        generatedAtUtc: "2026-02-13T12:00:00.000Z",
        windowStartUtc: "2026-02-13T11:00:00.000Z",
        windowEndUtc: "2026-02-13T12:00:00.000Z",
        filters: {
          source: "api_internal",
          fromUtc: "2026-02-13T11:00:00.000Z",
          toUtc: "2026-02-13T12:00:00.000Z",
          limit: 100,
          tenantId: "TENANT-1",
          policyId: "policy-1",
        },
        summary: {
          policyVersions: 1,
          policyLifecycleEvents: 1,
          delegationEvents: 1,
          approvalDecisions: 1,
          eventsInHashChain: 4,
        },
        policyVersions: [],
        policyLifecycleEvents: [],
        delegationEvents: [],
        approvalDecisions: [],
        hashChain: [],
        deterministicHashSha256: "a".repeat(64),
        exportRootHash: "b".repeat(64),
        signatures: {
          scheme: "INTERNAL_UNSIGNED_V1",
          signedAtUtc: "2026-02-13T12:00:00.000Z",
          exportRootHash: "b".repeat(64),
          signatureRef: null,
        },
      }));

      const body = JSON.stringify({ source: "api_internal", limit: 100 });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = sign("authority-secret", timestamp, body);

      const req = new Request("http://localhost/api/internal/governance/authority/export", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rre-job-timestamp": String(timestamp),
          "x-rre-job-signature": signature,
        },
        body,
      });

      const res = await POST(req);
      assert(res.status === 200, "Expected 200 with valid signature");
      const json = await res.json();
      assert(json.reportVersion === "gov04-authority-export.v1", "Expected authority export version");
      assert(json.deterministicHashSha256 === "a".repeat(64), "Expected deterministic hash in response");
    }
  );

  setAuthorityExportRunnerForTests();
}

async function run() {
  await testRouteDisabled();
  await testMethodGuard();
  await testInvalidSignature();
  await testValidSignatureReturnsExport();
}

run();
