#!/usr/bin/env node
/**
 * Phase 11 - Cross-Subsystem Orchestration Harness (Scaffold v1.0)
 * Scope: read/write via existing APIs only. No new authority. No new business logic.
 * Output: orchestration-report.json (always written, PASS/FAIL)
 *
 * Usage:
 *   BACKEND_URL=http://localhost:4000 node tools/integration/run-orchestrated-e2e.mjs
 *
 * Notes:
 * - Deterministic: bounded polling loops; no random sleeps.
 * - Timeouts: 8s per HTTP request via AbortController.
 * - Step spike guard: 15s default threshold; records spikes.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_BACKEND_URL = "http://localhost:4000";
const BACKEND_URL = (process.env.BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
const REPORT_PATH = process.env.ORCH_REPORT_PATH || "orchestration-report.json";

const REQUEST_TIMEOUT_MS = parseInt(process.env.ORCH_HTTP_TIMEOUT_MS || "8000", 10);
const STEP_SPIKE_GUARD_MS = parseInt(process.env.ORCH_STEP_SPIKE_GUARD_MS || "15000", 10);
const TOTAL_DURATION_GUARD_MS = parseInt(process.env.ORCH_TOTAL_DURATION_GUARD_MS || "60000", 10);

const TEST_ROLE = process.env.ORCH_TEST_ROLE || "admin";
const TEST_USERID = process.env.ORCH_TEST_USERID || "admin1";
const CORRELATION_ID =
  process.env.ORCH_CORRELATION_ID ||
  `orch_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

const RUN_META = {
  backendUrl: BACKEND_URL,
  gitSha: process.env.GITHUB_SHA || process.env.GIT_SHA || null,
  runId: process.env.GITHUB_RUN_ID || null,
  attempt: process.env.GITHUB_RUN_ATTEMPT || null,
  actor: process.env.GITHUB_ACTOR || null,
  correlationId: CORRELATION_ID,
  startedAtIso: new Date().toISOString(),
  config: {
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    stepSpikeGuardMs: STEP_SPIKE_GUARD_MS,
    totalDurationGuardMs: TOTAL_DURATION_GUARD_MS,
    testRole: TEST_ROLE,
    testUserid: TEST_USERID,
  },
};

function nowMs() {
  return Date.now();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function redactHeaders(h) {
  const out = {};
  for (const [k, v] of Object.entries(h || {})) {
    const lk = k.toLowerCase();
    if (lk.includes("authorization") || lk.includes("cookie") || lk.includes("token")) continue;
    out[k] = v;
  }
  return out;
}

function createReport() {
  return {
    phase: "Phase 11 - Cross-Subsystem Orchestration Harness",
    version: "v1.0-scaffold",
    status: "UNKNOWN", // PASS | FAIL
    runMeta: RUN_META,
    startedAtMs: nowMs(),
    finishedAtMs: null,
    totalDurationMs: null,
    guards: {
      totalDurationGuardMs: TOTAL_DURATION_GUARD_MS,
      stepSpikeGuardMs: STEP_SPIKE_GUARD_MS,
    },
    entities: {
      correlationId: CORRELATION_ID,
      orderId: null,
      snapshotId: null,
      paymentId: null,
      shipmentId: null,
      complianceCaseId: null,
      holdId: null,
      crmCaseId: null,
      emailMessageId: null,
    },
    steps: [],
    summary: {
      passCount: 0,
      failCount: 0,
      warnCount: 0,
      notImplementedCount: 0,
      skippedCount: 0,
      spikesCount: 0,
    },
    failures: [],
  };
}

async function writeReport(report) {
  const finishedAtMs = nowMs();
  report.finishedAtMs = finishedAtMs;
  report.totalDurationMs = finishedAtMs - report.startedAtMs;

  // Derive final PASS/FAIL
  report.summary.passCount = report.steps.filter((s) => s.status === "PASS").length;
  report.summary.failCount = report.steps.filter((s) => s.status === "FAIL").length;
  report.summary.warnCount = report.steps.filter((s) => s.status === "WARN").length;
  report.summary.notImplementedCount = report.steps.filter((s) => s.status === "NOT_IMPLEMENTED").length;
  report.summary.skippedCount = report.steps.filter((s) => s.status === "SKIPPED").length;
  report.summary.spikesCount = report.steps.filter((s) => s.spike === true).length;

  report.status = report.summary.failCount > 0 ? "FAIL" : "PASS";

  // Total duration guard
  if (report.totalDurationMs > TOTAL_DURATION_GUARD_MS) {
    report.status = "FAIL";
    report.failures.push({
      type: "TOTAL_DURATION_GUARD",
      message: `Total duration ${report.totalDurationMs}ms exceeded guard ${TOTAL_DURATION_GUARD_MS}ms`,
    });
  }

  const abs = path.resolve(process.cwd(), REPORT_PATH);
  fs.writeFileSync(abs, JSON.stringify(report, null, 2), "utf8");
  return abs;
}

/**
 * http() - standardized request wrapper with:
 * - AbortController timeout
 * - correlation headers
 * - consistent evidence capture
 */
async function http(method, urlPath, { headers = {}, json = undefined, body = undefined } = {}) {
  const url = `${BACKEND_URL}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const baseHeaders = {
    accept: "application/json",
    "x-test-role": TEST_ROLE,
    "x-test-userid": TEST_USERID,
    "x-correlation-id": CORRELATION_ID,
    ...headers,
  };

  let finalBody = body;
  if (json !== undefined) {
    baseHeaders["content-type"] = "application/json";
    finalBody = JSON.stringify(json);
  }

  const startedAt = nowMs();
  try {
    const res = await fetch(url, {
      method,
      headers: baseHeaders,
      body: finalBody,
      signal: controller.signal,
    });

    const text = await res.text();
    const parsed = safeJsonParse(text);

    return {
      ok: res.ok,
      status: res.status,
      durationMs: nowMs() - startedAt,
      headers: {
        "content-type": res.headers.get("content-type"),
      },
      bodyText: text,
      bodyJson: parsed,
    };
  } catch (err) {
    const isAbort = err && (err.name === "AbortError" || String(err).includes("AbortError"));
    return {
      ok: false,
      status: isAbort ? 599 : 598,
      durationMs: nowMs() - startedAt,
      headers: {},
      bodyText: "",
      bodyJson: null,
      error: {
        name: err?.name || "Error",
        message: err?.message || String(err),
        aborted: isAbort,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function step(report, name, fn, { optional = false } = {}) {
  const atMs = nowMs() - report.startedAtMs;
  const stepRec = {
    name,
    atMs,
    startedAtIso: new Date().toISOString(),
    status: "UNKNOWN", // PASS | FAIL | WARN | NOT_IMPLEMENTED | SKIPPED
    optional,
    durationMs: null,
    spike: false,
    evidence: null,
  };

  const started = nowMs();
  try {
    const result = await fn();
    stepRec.durationMs = nowMs() - started;

    if (stepRec.durationMs > STEP_SPIKE_GUARD_MS) stepRec.spike = true;

    // If fn returns a structured status, use it; else PASS.
    if (result && typeof result === "object" && result.__stepStatus) {
      stepRec.status = result.__stepStatus;
      stepRec.evidence = result.evidence || null;
    } else {
      stepRec.status = "PASS";
      stepRec.evidence = result ?? null;
    }
  } catch (err) {
    stepRec.durationMs = nowMs() - started;
    if (stepRec.durationMs > STEP_SPIKE_GUARD_MS) stepRec.spike = true;

    const errInfo = {
      name: err?.name || "Error",
      message: err?.message || String(err),
      stack: (err?.stack || "").split("\n").slice(0, 8).join("\n"),
    };

    if (optional) {
      stepRec.status = "WARN";
      stepRec.evidence = { error: errInfo };
    } else {
      stepRec.status = "FAIL";
      stepRec.evidence = { error: errInfo };
      report.failures.push({
        type: "STEP_FAILURE",
        step: name,
        message: errInfo.message,
      });
    }
  } finally {
    report.steps.push(stepRec);
  }
}

function notImplementedEvidence(res) {
  return {
    __stepStatus: "NOT_IMPLEMENTED",
    evidence: {
      reason: "Endpoint not implemented or not available",
      status: res?.status ?? null,
      body: res?.bodyJson ?? res?.bodyText ?? null,
    },
  };
}

function failEvidence(reason, details) {
  return {
    __stepStatus: "FAIL",
    evidence: { reason, details: details ?? null },
  };
}

function passEvidence(details) {
  return { __stepStatus: "PASS", evidence: details ?? null };
}

/**
 * Health fan-out.
 * If a subsystem health endpoint is absent, record NOT_IMPLEMENTED (do not fail).
 * If present but unhealthy (>=400), FAIL only for /healthz; WARN for others in scaffold.
 */
async function healthFanout(report) {
  const healthEndpoints = [
    { name: "Health - core", path: "/api/healthz", required: true },
    { name: "Health - payments", path: "/api/payments/health", required: false },
    { name: "Health - shipping", path: "/api/shipping/health", required: false },
    { name: "Health - compliance", path: "/api/compliance/health", required: false },
    { name: "Health - settlement", path: "/api/settlement/health", required: false },
    { name: "Health - crm", path: "/api/crm/health", required: false },
    { name: "Health - email", path: "/api/email/health", required: false },
  ];

  for (const ep of healthEndpoints) {
    await step(
      report,
      ep.name,
      async () => {
        const res = await http("GET", ep.path);

        // If 404, treat as NOT_IMPLEMENTED for optional endpoints
        if (!ep.required && (res.status === 404 || res.status === 405)) return notImplementedEvidence(res);

        // Core healthz is required
        if (ep.required) {
          if (!res.ok) return failEvidence("Core health endpoint failed", { status: res.status, body: res.bodyJson || res.bodyText });
          return passEvidence({ status: res.status, body: res.bodyJson || res.bodyText });
        }

        // Optional subsystem health: WARN on non-ok (but not fail scaffold)
        if (!res.ok) {
          return {
            __stepStatus: "WARN",
            evidence: { status: res.status, body: res.bodyJson || res.bodyText },
          };
        }

        return passEvidence({ status: res.status, body: res.bodyJson || res.bodyText });
      },
      { optional: !ep.required }
    );
  }
}

async function main() {
  const report = createReport();

  const exitWith = async (code) => {
    const outPath = await writeReport(report);
    // eslint-disable-next-line no-console
    console.log(`orchestration report written: ${outPath}`);
    process.exit(code);
  };

  try {
    await step(report, "Scaffold - environment", async () => {
      return passEvidence({
        backendUrl: BACKEND_URL,
        correlationId: CORRELATION_ID,
        timeoutMs: REQUEST_TIMEOUT_MS,
        headers: redactHeaders({
          "x-test-role": TEST_ROLE,
          "x-test-userid": TEST_USERID,
          "x-correlation-id": CORRELATION_ID,
        }),
      });
    });

    await healthFanout(report);

    // Placeholder hooks for Step 11.20+ (chain execution will be added in later milestones)
    await step(
      report,
      "Scaffold - chain placeholder (no-op)",
      async () => {
        return {
          __stepStatus: "SKIPPED",
          evidence: {
            reason: "Step 11.10 scaffold only. Chain steps start at 11.20.",
          },
        };
      },
      { optional: true }
    );

    // If core health failed, report already contains failure and will FAIL.
    await exitWith(report.status === "FAIL" ? 1 : 0);
  } catch (err) {
    report.failures.push({
      type: "UNHANDLED",
      message: err?.message || String(err),
    });
    await exitWith(1);
  }
}

main();
