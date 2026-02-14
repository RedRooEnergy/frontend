import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

import { WECHAT_EVENTS, getWeChatEventMeta, isWeChatEventCode } from "../../lib/wechat/events";
import { renderWeChatMessage } from "../../lib/wechat/renderer";
import { validateWeChatRenderedPayloadPolicy } from "../../lib/wechat/policyValidator";
import { HttpWeChatProviderAdapter } from "../../lib/wechat/provider";
import { seedWeChatTemplates } from "../../lib/wechat/seedTemplates";
import { generatePdfFromLines } from "../../lib/email/pdf";
import { canonicalPayloadHash } from "../../lib/wechat/hash";
import { appendWeChatAuditAttestation } from "../../lib/wechat/store";

type CheckResult = {
  id: string;
  description: string;
  passed: boolean;
  details?: string;
};

type Scorecard = {
  runId: string;
  generatedAtUtc: string;
  overall: "PASS" | "FAIL";
  summary: {
    totalChecks: number;
    passCount: number;
    failCount: number;
    trendStatus: "STABLE" | "REGRESSION" | "IMPROVING";
    trendReasons: string[];
  };
  checks: CheckResult[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(FRONTEND_DIR, "artefacts", "wechat");
const HISTORY_DIR = path.join(OUT_DIR, "history");

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function listScorecardsNewestFirst() {
  if (!fs.existsSync(HISTORY_DIR)) return [] as string[];
  return fs
    .readdirSync(HISTORY_DIR)
    .filter((name) => name.startsWith("scorecard.") && name.endsWith(".json"))
    .map((name) => path.join(HISTORY_DIR, name))
    .map((filePath) => {
      try {
        const stat = fs.statSync(filePath);
        return { filePath, mtimeMs: stat.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.mtimeMs - a.mtimeMs)
    .map((entry: any) => entry.filePath);
}

function loadScorecard(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Scorecard;
  } catch {
    return null;
  }
}

function analyzeTrend(current: Scorecard, previous: Scorecard[]) {
  const reasons: string[] = [];
  if (previous.length === 0) {
    return { trendStatus: "STABLE" as const, reasons: ["No prior runs available."] };
  }

  const prev = previous[0];
  if (current.summary.failCount > prev.summary.failCount) {
    reasons.push(`failCount increased: ${prev.summary.failCount} -> ${current.summary.failCount}`);
    return { trendStatus: "REGRESSION" as const, reasons };
  }

  const window = [current, ...previous].slice(0, 5);
  let degraded = 0;
  for (let index = 0; index < window.length - 1; index += 1) {
    const newer = safeNumber(window[index].summary.passCount);
    const older = safeNumber(window[index + 1].summary.passCount);
    if (newer < older) degraded += 1;
  }

  if (degraded >= 2) {
    reasons.push(`passCount degraded in ${degraded} comparisons within last ${window.length} runs`);
    return { trendStatus: "REGRESSION" as const, reasons };
  }

  if (current.summary.passCount > prev.summary.passCount || current.summary.failCount < prev.summary.failCount) {
    reasons.push("improving vs previous run");
    return { trendStatus: "IMPROVING" as const, reasons };
  }

  return {
    trendStatus: "STABLE" as const,
    reasons: ["No regression signals detected."],
  };
}

function check(id: string, description: string, fn: () => Promise<void> | void): Promise<CheckResult> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => ({ id, description, passed: true }))
    .catch((error: any) => ({
      id,
      description,
      passed: false,
      details: String(error?.message || error),
    }));
}

async function runChecks() {
  const results: CheckResult[] = [];

  results.push(
    await check("CHK-WECHAT-01", "Taxonomy completeness", () => {
      const events = Object.values(WECHAT_EVENTS);
      assert(events.length > 0, "No WeChat events registered");
      for (const eventCode of events) {
        assert(isWeChatEventCode(eventCode), `Invalid event code ${eventCode}`);
        const meta = getWeChatEventMeta(eventCode);
        assert(meta.requiredPlaceholders.length > 0, `No placeholders declared for ${eventCode}`);
        assert(meta.allowedRecipients.length > 0, `No recipient scope declared for ${eventCode}`);
      }

      const collections = new Map<string, any[]>();
      const getRows = (name: string) => {
        if (!collections.has(name)) collections.set(name, []);
        return collections.get(name) as any[];
      };

      const deps = {
        getCollection: async (name: string) => ({
          async createIndex() {
            return;
          },
          async updateOne(query: Record<string, unknown>, update: Record<string, unknown>, options?: any) {
            const rows = getRows(name);
            const index = rows.findIndex((row) =>
              Object.entries(query).every(([key, value]) => row[key] === value)
            );
            const nextRow = { ...(index >= 0 ? rows[index] : {}), ...((update as any).$set || {}) };
            if (index >= 0) rows[index] = nextRow;
            else if (options?.upsert) rows.push(nextRow);
            return { acknowledged: true };
          },
          async findOne(query: Record<string, unknown>) {
            const rows = getRows(name);
            return rows.find((row) => Object.entries(query).every(([key, value]) => row[key] === value)) || null;
          },
          find(query: Record<string, unknown>) {
            const rows = getRows(name).filter((row) =>
              Object.entries(query).every(([key, value]) => row[key] === value)
            );
            return {
              sort() {
                return {
                  toArray: async () => rows,
                  skip(value: number) {
                    return {
                      limit(limitValue: number) {
                        return {
                          toArray: async () => rows.slice(value, value + limitValue),
                        };
                      },
                    };
                  },
                  limit(value: number) {
                    return {
                      toArray: async () => rows.slice(0, value),
                    };
                  },
                };
              },
              toArray: async () => rows,
            };
          },
          async countDocuments(query: Record<string, unknown>) {
            const rows = getRows(name).filter((row) =>
              Object.entries(query).every(([key, value]) => row[key] === value)
            );
            return rows.length;
          },
          async insertOne(doc: any) {
            const rows = getRows(name);
            rows.push(doc);
            return { insertedId: String(rows.length) };
          },
        }),
        now: () => new Date("2026-02-14T00:00:00.000Z"),
        randomBytes: (size: number) => Buffer.alloc(size, 1),
      };

      return seedWeChatTemplates({ status: "LOCKED", schemaVersion: "v1" }, deps).then((seeded) => {
        assert.equal(
          seeded.createdOrUpdated,
          events.length * 2,
          "Template registry seeding should cover all event codes across both languages"
        );
      });
    })
  );

  results.push(
    await check("CHK-WECHAT-02", "Forbidden free-form endpoint absent", () => {
      const forbiddenRoute = path.join(FRONTEND_DIR, "app", "api", "admin", "wechat", "send-freeform", "route.ts");
      assert(!fs.existsSync(forbiddenRoute), "Forbidden route /api/admin/wechat/send-freeform exists");

      const routeDir = path.join(FRONTEND_DIR, "app", "api", "admin", "wechat");
      const files = fs.readdirSync(routeDir, { recursive: true }) as string[];
      const combined = files
        .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))
        .map((entry) => fs.readFileSync(path.join(routeDir, entry), "utf8"))
        .join("\n");
      assert(!combined.includes("send-freeform"), "Forbidden endpoint reference detected in admin routes");
    })
  );

  results.push(
    await check("CHK-WECHAT-03", "Renderer determinism", () => {
      const template = {
        eventCode: WECHAT_EVENTS.ORDER_DOCS_REQUIRED_PROMPT_V1,
        templateKey: "wechat_order_docs_required_prompt_v1",
        wechatTemplateId: "wechat_template_order_docs_required_v1",
        language: "en-AU" as const,
        schemaVersion: "v1",
        requiredPlaceholders: ["orderId", "actionUrl", "requiredDocuments"],
        allowedLinks: ["/dashboard/*"],
        status: "LOCKED" as const,
        renderTemplate:
          "Order {{orderId}} requires documents. Provide {{requiredDocuments}} in RRE: {{actionUrl}}",
        hashOfTemplateContractSha256: "a".repeat(64),
        createdAt: "2026-02-14T00:00:00.000Z",
      };

      const payload = {
        orderId: "ORD-100",
        requiredDocuments: "Commercial Invoice",
        actionUrl: "https://app.redrooenergy.com/dashboard/orders/ORD-100",
      };

      const first = renderWeChatMessage({ template, placeholders: payload });
      const second = renderWeChatMessage({ template, placeholders: payload });

      assert.equal(first.renderedPayloadHashSha256, second.renderedPayloadHashSha256, "Render hash mismatch");
      assert.equal(first.renderedPayload, second.renderedPayload, "Rendered payload mismatch");
    })
  );

  results.push(
    await check("CHK-WECHAT-04", "RBAC guards on admin/regulator routes", async () => {
      process.env.ENABLE_WECHAT_EXTENSION = "false";
      process.env.ENABLE_WECHAT_WEBHOOK = "false";

      const { GET: adminDispatchesGet } = await import("../../app/api/admin/wechat/dispatches/route");
      const { GET: regulatorOverviewGet } = await import("../../app/api/regulator/wechat/overview/route");

      const supplierReq = new Request("http://localhost/api/admin/wechat/dispatches", {
        method: "GET",
        headers: { "x-dev-supplier": "1" },
      });
      const supplierRes = await adminDispatchesGet(supplierReq);
      assert.equal(supplierRes.status, 403, "Supplier should be forbidden from admin dispatch route");

      const adminReq = new Request("http://localhost/api/admin/wechat/dispatches", {
        method: "GET",
        headers: { "x-dev-admin": "1" },
      });
      const adminRes = await adminDispatchesGet(adminReq);
      assert.equal(adminRes.status, 404, "Admin should pass RBAC, then hit feature flag gate");

      const adminOnRegReq = new Request("http://localhost/api/regulator/wechat/overview", {
        method: "GET",
        headers: { "x-dev-admin": "1" },
      });
      const adminOnRegRes = await regulatorOverviewGet(adminOnRegReq);
      assert.equal(adminOnRegRes.status, 403, "Admin should be forbidden from regulator read-only route");

      const regulatorReq = new Request("http://localhost/api/regulator/wechat/overview", {
        method: "GET",
        headers: { "x-dev-regulator": "1" },
      });
      const regulatorRes = await regulatorOverviewGet(regulatorReq);
      assert.equal(regulatorRes.status, 404, "Regulator should pass RBAC, then hit feature flag gate");
    })
  );

  results.push(
    await check("CHK-WECHAT-05", "Dispatch immutability contract", () => {
      const dispatchServicePath = path.join(FRONTEND_DIR, "lib", "wechat", "dispatchService.ts");
      const storePath = path.join(FRONTEND_DIR, "lib", "wechat", "store.ts");
      const dispatchSource = fs.readFileSync(dispatchServicePath, "utf8");
      const storeSource = fs.readFileSync(storePath, "utf8");

      const createdAtIndex = dispatchSource.indexOf("createWeChatDispatchRecord(");
      const providerSendIndex = dispatchSource.indexOf("sendTemplateMessage(");
      assert(createdAtIndex >= 0 && providerSendIndex >= 0, "Missing dispatch creation/provider send markers");
      assert(createdAtIndex < providerSendIndex, "Dispatch record is not created before provider call");

      assert(!/dispatches\.updateOne\(/.test(storeSource), "Dispatch collection update detected; immutability violated");
      assert(/appendWeChatDispatchStatusEvent/.test(storeSource), "Status events append API missing");
    })
  );

  results.push(
    await check("CHK-WECHAT-06", "Link allowlist enforcement", () => {
      let threw = false;
      try {
        validateWeChatRenderedPayloadPolicy({
          language: "en-AU",
          allowedLinks: ["/dashboard/*"],
          renderedPayload: "Open https://evil.example.com/pwn",
        });
      } catch (error: any) {
        threw = String(error?.message || "").includes("WECHAT_POLICY_VIOLATION");
      }
      assert(threw, "Disallowed link host should be rejected");
    })
  );

  results.push(
    await check("CHK-WECHAT-07", "Binding verification required before dispatch", () => {
      const source = fs.readFileSync(path.join(FRONTEND_DIR, "lib", "wechat", "dispatchService.ts"), "utf8");
      assert(source.includes("recipient binding missing"), "Missing binding presence guard");
      assert(source.includes("recipient binding not VERIFIED"), "Missing VERIFIED binding guard");
    })
  );

  results.push(
    await check("CHK-WECHAT-08", "Provider response redaction", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async () =>
          new Response(
            JSON.stringify({
              msgid: "mid-1",
              token: "secret-token",
              signature: "sig-1",
              errcode: 0,
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          )) as any;

        const provider = new HttpWeChatProviderAdapter("https://api.wechat.example/send", "access-token");
        const result = await provider.sendTemplateMessage({
          toUserId: "openid-1",
          appId: "app-1",
          eventCode: WECHAT_EVENTS.ORDER_CREATED_NOTIFY_V1,
          templateId: "template-1",
          language: "en-AU",
          renderedPayload: "payload",
        });

        assert.equal(result.providerStatus, "SENT", "Expected successful provider status");
        assert.equal(result.providerResponseRedacted?.token, "[REDACTED]", "token should be redacted");
        assert.equal(result.providerResponseRedacted?.signature, "[REDACTED]", "signature should be redacted");
      } finally {
        globalThis.fetch = originalFetch;
      }
    })
  );

  return results;
}

function buildBadgeSvg(pass: boolean) {
  const label = "wechat-governance";
  const value = pass ? "pass" : "fail";
  const color = pass ? "#16a34a" : "#dc2626";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="220" height="20" role="img" aria-label="${label}: ${value}">\n<title>${label}: ${value}</title>\n<rect width="130" height="20" fill="#374151"/>\n<rect x="130" width="90" height="20" fill="${color}"/>\n<text x="65" y="14" fill="#fff" font-family="Arial" font-size="11" text-anchor="middle">${label}</text>\n<text x="175" y="14" fill="#fff" font-family="Arial" font-size="11" text-anchor="middle">${value}</text>\n</svg>\n`;
}

function sha256File(filePath: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function signScorecardPayload(payload: string) {
  const secret = String(process.env.WECHAT_AUDIT_SIGNING_SECRET || "dev-wechat-audit-signing-secret");
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(HISTORY_DIR, { recursive: true });

  const runId = `wechat-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
  const checks = await runChecks();

  const passCount = checks.filter((checkRow) => checkRow.passed).length;
  const failCount = checks.length - passCount;

  const scorecardBase: Scorecard = {
    runId,
    generatedAtUtc: new Date().toISOString(),
    overall: failCount === 0 ? "PASS" : "FAIL",
    summary: {
      totalChecks: checks.length,
      passCount,
      failCount,
      trendStatus: "STABLE",
      trendReasons: [],
    },
    checks,
  };

  const previousScorecards = listScorecardsNewestFirst()
    .map((filePath) => loadScorecard(filePath))
    .filter(Boolean) as Scorecard[];

  const trend = analyzeTrend(scorecardBase, previousScorecards);
  scorecardBase.summary.trendStatus = trend.trendStatus;
  scorecardBase.summary.trendReasons = trend.reasons;

  if (trend.trendStatus === "REGRESSION") {
    scorecardBase.overall = "FAIL";
  }

  const scorecardPath = path.join(OUT_DIR, `scorecard.${runId}.json`);
  fs.writeFileSync(scorecardPath, JSON.stringify(scorecardBase, null, 2));

  const signedPayload = JSON.stringify(scorecardBase);
  const signatureSha256 = signScorecardPayload(signedPayload);

  const attestationPdf = generatePdfFromLines([
    "RRE WeChat Governance Attestation",
    `Run ID: ${runId}`,
    `Generated: ${scorecardBase.generatedAtUtc}`,
    `Overall: ${scorecardBase.overall}`,
    `Checks: ${scorecardBase.summary.totalChecks}`,
    `Pass: ${scorecardBase.summary.passCount}`,
    `Fail: ${scorecardBase.summary.failCount}`,
    `Trend: ${scorecardBase.summary.trendStatus}`,
    `Signature (HMAC-SHA256): ${signatureSha256}`,
    `Deterministic hash: ${canonicalPayloadHash(scorecardBase)}`,
  ]);

  const summaryPdf = generatePdfFromLines([
    "RRE WeChat Governance Summary",
    `Run ID: ${runId}`,
    `Overall: ${scorecardBase.overall}`,
    `Pass/Fail: ${scorecardBase.summary.passCount}/${scorecardBase.summary.failCount}`,
    `Trend: ${scorecardBase.summary.trendStatus}`,
    `Reasons: ${scorecardBase.summary.trendReasons.join(" | ") || "none"}`,
  ]);

  const attestationPath = path.join(OUT_DIR, `attestation.${runId}.pdf`);
  const summaryPath = path.join(OUT_DIR, `summary.${runId}.pdf`);
  const badgePath = path.join(OUT_DIR, "badge.wechat-governance.svg");
  const manifestPath = path.join(OUT_DIR, `manifest.${runId}.json`);

  fs.writeFileSync(attestationPath, attestationPdf.buffer);
  fs.writeFileSync(summaryPath, summaryPdf.buffer);
  fs.writeFileSync(badgePath, buildBadgeSvg(scorecardBase.overall === "PASS"));

  const manifest = {
    runId,
    generatedAtUtc: scorecardBase.generatedAtUtc,
    overall: scorecardBase.overall,
    scorecardPath,
    signatureSha256,
    files: [
      { path: scorecardPath, sha256: sha256File(scorecardPath) },
      { path: attestationPath, sha256: sha256File(attestationPath) },
      { path: summaryPath, sha256: sha256File(summaryPath) },
      { path: badgePath, sha256: sha256File(badgePath) },
    ],
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, `manifest.${runId}.sha256`), `${sha256File(manifestPath)}  manifest.${runId}.json\n`);

  fs.copyFileSync(scorecardPath, path.join(HISTORY_DIR, path.basename(scorecardPath)));

  try {
    await appendWeChatAuditAttestation({
      runId,
      scorecardJson: scorecardBase as unknown as Record<string, unknown>,
      signedPdfPath: attestationPath,
      summaryPdfPath: summaryPath,
      hashManifestPath: manifestPath,
    });
  } catch {
    // Non-blocking for local/offline runs where Mongo is unavailable.
  }

  process.stdout.write(`${JSON.stringify({ runId, overall: scorecardBase.overall, trend: trend.trendStatus, scorecardPath }, null, 2)}\n`);

  if (scorecardBase.overall !== "PASS") {
    process.exitCode = 2;
  }
}

run().catch((error: any) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
