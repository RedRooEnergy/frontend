#!/usr/bin/env node
/**
 * Phase 11 — Cross-Subsystem Orchestration Harness (Happy Path v1.0 / Step 11.20)
 *
 * Boundaries:
 * - Calls platform only via existing APIs (no direct DB mutation).
 * - No authority expansion.
 * - No new business logic; harness is a consumer.
 *
 * Output:
 * - orchestration-report.json (always written, PASS/FAIL)
 *
 * Determinism:
 * - No random sleeps.
 * - Poll loops: maxAttempts + fixed interval.
 * - HTTP timeouts: 8s via AbortController.
 *
 * Fail-fast policy (user selected "A"):
 * - Missing required contracts (404/405) FAIL IMMEDIATELY.
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

const POLL_INTERVAL_MS = parseInt(process.env.ORCH_POLL_INTERVAL_MS || "1000", 10);
const POLL_MAX_ATTEMPTS = parseInt(process.env.ORCH_POLL_MAX_ATTEMPTS || "20", 10);

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
    pollIntervalMs: POLL_INTERVAL_MS,
    pollMaxAttempts: POLL_MAX_ATTEMPTS,
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
    phase: "Phase 11 — Cross-Subsystem Orchestration Harness",
    version: "v1.0-happy-path",
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
      complianceCaseId: null, // optional for Phase 11
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

  report.summary.passCount = report.steps.filter((s) => s.status === "PASS").length;
  report.summary.failCount = report.steps.filter((s) => s.status === "FAIL").length;
  report.summary.warnCount = report.steps.filter((s) => s.status === "WARN").length;
  report.summary.notImplementedCount = report.steps.filter((s) => s.status === "NOT_IMPLEMENTED").length;
  report.summary.skippedCount = report.steps.filter((s) => s.status === "SKIPPED").length;
  report.summary.spikesCount = report.steps.filter((s) => s.spike === true).length;

  report.status = report.summary.failCount > 0 ? "FAIL" : "PASS";

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

function skippedEvidence(reason, details) {
  return { __stepStatus: "SKIPPED", evidence: { reason, details: details ?? null } };
}

function isMissingContractStatus(status) {
  return status === 404 || status === 405;
}

/**
 * Fail-fast required contract check (policy A)
 */
function assertRequiredContract(res, contractName, { method, path }) {
  if (isMissingContractStatus(res.status)) {
    const msg = `Missing required contract: ${contractName} (${method} ${path}) returned ${res.status}`;
    const err = new Error(msg);
    err.__orchContractFailure = true;
    err.__orchContract = { contractName, method, path, status: res.status, body: res.bodyJson || res.bodyText };
    throw err;
  }
}

/**
 * Parse fixture JSON env or fall back to default object.
 */
function readFixtureEnv(envKey, fallbackObj) {
  const raw = process.env[envKey];
  if (!raw || raw.trim().length === 0) return fallbackObj;
  try {
    return JSON.parse(raw);
  } catch {
    // If env is invalid JSON, fail deterministically.
    throw new Error(`Invalid JSON in ${envKey}`);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll helper: bounded attempts, fixed interval.
 * The predicate returns {done:boolean, value:any, status?:string}
 */
async function poll(name, fn, { maxAttempts = POLL_MAX_ATTEMPTS, intervalMs = POLL_INTERVAL_MS } = {}) {
  let last = null;
  for (let i = 1; i <= maxAttempts; i++) {
    last = await fn(i);
    if (last && last.done) return { ok: true, attempts: i, value: last.value };
    if (i < maxAttempts) await sleep(intervalMs);
  }
  return { ok: false, attempts: maxAttempts, value: last?.value ?? last };
}

/**
 * Health fan-out.
 * If a subsystem health endpoint is absent, record NOT_IMPLEMENTED (do not fail).
 * If present but unhealthy (>=400), FAIL only for /healthz; WARN for others.
 */
async function healthFanout(report) {
  const healthEndpoints = [
    { name: "Health — core", path: "/healthz", required: true },
    { name: "Health — payments", path: "/api/payments/health", required: false },
    { name: "Health — shipping", path: "/api/shipping/health", required: false },
    { name: "Health — settlement", path: "/api/settlement/health", required: false },
    { name: "Health — crm", path: "/api/crm/health", required: false },
    { name: "Health — email", path: "/api/email/health", required: false },
    // Compliance optional by Phase 11 decision (no enforcement here)
    { name: "Health — compliance (optional)", path: "/api/compliance/health", required: false },
  ];

  for (const ep of healthEndpoints) {
    await step(
      report,
      ep.name,
      async () => {
        const res = await http("GET", ep.path);

        if (!ep.required && isMissingContractStatus(res.status)) return notImplementedEvidence(res);

        if (ep.required) {
          if (!res.ok) return failEvidence("Core health endpoint failed", { status: res.status, body: res.bodyJson || res.bodyText });
          return passEvidence({ status: res.status, body: res.bodyJson || res.bodyText });
        }

        if (!res.ok) {
          return { __stepStatus: "WARN", evidence: { status: res.status, body: res.bodyJson || res.bodyText } };
        }

        return passEvidence({ status: res.status, body: res.bodyJson || res.bodyText });
      },
      { optional: !ep.required }
    );
  }
}

/**
 * Phase 11 required contracts (user-defined list).
 * Defaults match blueprint; can be overridden via env if your repo differs.
 *
 * Override examples:
 *   ORCH_EP_CHECKOUT_POST=/api/checkout/session
 *   ORCH_EP_SNAPSHOT_GET=/api/pricing/snapshots/:id
 */
const CONTRACTS = {
  pricing: {
    checkoutPost: process.env.ORCH_EP_CHECKOUT_POST || "/api/checkout/session",
    snapshotGet: process.env.ORCH_EP_SNAPSHOT_GET || "/api/pricing/snapshots/:id",
  },
  payments: {
    checkoutPost: process.env.ORCH_EP_PAYMENTS_CHECKOUT_POST || "/api/payments/checkout",
    statusGet: process.env.ORCH_EP_PAYMENTS_STATUS_GET || "/api/payments/status/:id",
  },
  shipping: {
    quotePost: process.env.ORCH_EP_SHIPPING_QUOTE_POST || "/api/shipping/quote",
    selectPost: process.env.ORCH_EP_SHIPPING_SELECT_POST || "/api/shipping/select",
    shipmentGet: process.env.ORCH_EP_SHIPPING_SHIPMENT_GET || "/api/shipping/shipments/:id",
  },
  settlement: {
    holdPost: process.env.ORCH_EP_SETTLEMENT_HOLD_POST || "/api/settlement/holds",
    holdGet: process.env.ORCH_EP_SETTLEMENT_HOLD_GET || "/api/settlement/holds/:id",
  },
  crm: {
    casesQueryGet: process.env.ORCH_EP_CRM_CASES_QUERY_GET || "/api/crm/cases?entityType=order&entityId=:id",
    caseGet: process.env.ORCH_EP_CRM_CASE_GET || "/api/crm/cases/:id",
  },
  email: {
    queuePost: process.env.ORCH_EP_EMAIL_QUEUE_POST || "/api/admin/email/preview-or-send",
    logsGet: process.env.ORCH_EP_EMAIL_LOGS_GET || "/api/admin/email/logs?entityId=:id",
  },
};

function expandPath(template, id) {
  return template.replace(":id", encodeURIComponent(id));
}

function expandPathAny(template, map) {
  let out = template;
  for (const [k, v] of Object.entries(map)) {
    out = out.replace(`:${k}`, encodeURIComponent(String(v)));
  }
  return out;
}

/**
 * Default fixtures (override via env JSON strings):
 * - ORCH_FIXTURE_CHECKOUT
 * - ORCH_FIXTURE_PAYMENTS_CHECKOUT
 * - ORCH_FIXTURE_SHIPPING_QUOTE
 * - ORCH_FIXTURE_SHIPPING_SELECT
 * - ORCH_FIXTURE_SETTLEMENT_HOLD
 * - ORCH_FIXTURE_EMAIL_QUEUE
 */
function buildDefaultFixtures(report) {
  // Conservative defaults; if your API differs, set ORCH_FIXTURE_* envs in CI.
  const checkout = readFixtureEnv("ORCH_FIXTURE_CHECKOUT", {
    // common pattern: cart / items
    currency: "AUD",
    items: [{ sku: "TEST-SKU-001", quantity: 1 }],
    // correlationId included redundantly for traceability
    correlationId: report.entities.correlationId,
  });

  const paymentsCheckout = readFixtureEnv("ORCH_FIXTURE_PAYMENTS_CHECKOUT", {
    // Either snapshotId or orderId is typically required; we will fill snapshotId after checkout.
    snapshotId: "__FILL__",
    currency: "AUD",
    provider: "test",
    correlationId: report.entities.correlationId,
  });

  const shippingQuote = readFixtureEnv("ORCH_FIXTURE_SHIPPING_QUOTE", {
    // Many implementations accept orderId or destination + items; we will fill orderId if returned.
    orderId: "__FILL__",
    destination: { country: "AU", state: "QLD", postcode: "4000" },
    items: [{ sku: "TEST-SKU-001", quantity: 1 }],
    incoterm: "DDP",
    currency: "AUD",
    correlationId: report.entities.correlationId,
  });

  const shippingSelect = readFixtureEnv("ORCH_FIXTURE_SHIPPING_SELECT", {
    // We will fill shipmentId/quoteId as needed.
    shipmentId: "__FILL__",
    quoteId: "__FILL__",
    correlationId: report.entities.correlationId,
  });

  const settlementHold = readFixtureEnv("ORCH_FIXTURE_SETTLEMENT_HOLD", {
    // We will fill entity linkage fields if required.
    entityType: "order",
    entityId: "__FILL__",
    reason: "ORCH_E2E_HAPPY_PATH_VERIFICATION",
    correlationId: report.entities.correlationId,
  });

  const emailQueue = readFixtureEnv("ORCH_FIXTURE_EMAIL_QUEUE", {
    // Many systems accept template + entity linkage.
    mode: "queue",
    templateKey: "ORCH_SMOKE",
    entityType: "order",
    entityId: "__FILL__",
    correlationId: report.entities.correlationId,
  });

  return { checkout, paymentsCheckout, shippingQuote, shippingSelect, settlementHold, emailQueue };
}

/**
 * Step 11.20 — Chain A (Happy path) using required subsystems only.
 */
async function chainHappyPath(report) {
  const fx = buildDefaultFixtures(report);

  // 11.20.1 Pricing snapshot / checkout session
  await step(report, "Chain A — Pricing: create checkout/snapshot", async () => {
    const res = await http("POST", CONTRACTS.pricing.checkoutPost, { json: fx.checkout });
    assertRequiredContract(res, "Pricing checkout", { method: "POST", path: CONTRACTS.pricing.checkoutPost });

    if (!res.ok) return failEvidence("Pricing checkout failed", { status: res.status, body: res.bodyJson || res.bodyText });

    // Heuristics: accept common response keys
    const b = res.bodyJson || {};
    const snapshotId = b.pricingSnapshotId || b.snapshotId || b.snapshot?.id || null;
    const snapshotHash = b.pricingSnapshotHash || b.hash || b.snapshot?.hash || null;
    const orderId = b.orderId || b.order?.id || null;

    report.entities.snapshotId = snapshotId;
    report.entities.orderId = orderId;

    if (!snapshotId) return failEvidence("Pricing checkout returned no snapshotId", { body: b });

    return passEvidence({ status: res.status, snapshotId, snapshotHash, orderId });
  });

  // 11.20.2 Read snapshot status
  await step(report, "Chain A — Pricing: read snapshot", async () => {
    const id = report.entities.snapshotId;
    const pathT = expandPath(CONTRACTS.pricing.snapshotGet, id);
    const res = await http("GET", pathT);
    assertRequiredContract(res, "Pricing snapshot read", { method: "GET", path: pathT });

    if (!res.ok) return failEvidence("Pricing snapshot read failed", { status: res.status, body: res.bodyJson || res.bodyText });

    const b = res.bodyJson || {};
    return passEvidence({ status: res.status, snapshot: b });
  });

  // 11.20.3 Payments: create checkout/payment intent (test mode)
  await step(report, "Chain A — Payments: create checkout session (test mode)", async () => {
    if (!report.entities.snapshotId) return failEvidence("Missing snapshotId prior to payments checkout", null);

    const payload = { ...fx.paymentsCheckout, snapshotId: report.entities.snapshotId };
    const res = await http("POST", CONTRACTS.payments.checkoutPost, { json: payload });
    assertRequiredContract(res, "Payments checkout", { method: "POST", path: CONTRACTS.payments.checkoutPost });

    if (!res.ok) return failEvidence("Payments checkout failed", { status: res.status, body: res.bodyJson || res.bodyText });

    const b = res.bodyJson || {};
    const paymentId = b.paymentIntentId || b.paymentId || b.checkoutSessionId || b.id || null;
    report.entities.paymentId = paymentId;

    if (!paymentId) return failEvidence("Payments checkout returned no paymentId", { body: b });

    return passEvidence({ status: res.status, paymentId, body: b });
  });

  // 11.20.4 Payments: poll status until succeeded (or stable success state)
  await step(report, "Chain A — Payments: verify status (poll)", async () => {
    const id = report.entities.paymentId;
    if (!id) return failEvidence("Missing paymentId prior to payments status", null);

    const pathT = expandPath(CONTRACTS.payments.statusGet, id);

    const polled = await poll(
      "payments-status",
      async () => {
        const res = await http("GET", pathT);
        assertRequiredContract(res, "Payments status read", { method: "GET", path: pathT });

        // If auth blocks here, that's a hard fail (required for CI).
        if (!res.ok) return { done: true, value: failEvidence("Payments status read failed", { status: res.status, body: res.bodyJson || res.bodyText }) };

        const b = res.bodyJson || {};
        const status = (b.status || b.paymentStatus || "").toString().toLowerCase();

        // Accept common success values.
        const isSuccess =
          status === "succeeded" ||
          status === "paid" ||
          status === "success" ||
          status === "completed";

        if (isSuccess) return { done: true, value: passEvidence({ status: res.status, paymentStatus: b.status || b.paymentStatus || status, body: b }) };

        // If provider never transitions in CI, this will time out and FAIL deterministically.
        return { done: false, value: { lastStatus: status, body: b } };
      }
    );

    if (!polled.ok) {
      return failEvidence("Payments did not reach success state within polling budget", {
        attempts: polled.attempts,
        last: polled.value,
        path: pathT,
      });
    }

    return polled.value;
  });

  // 11.20.5 Shipping: quote
  await step(report, "Chain A — Shipping: create quote", async () => {
    const orderId = report.entities.orderId || "__UNKNOWN_ORDER__";
    const payload = { ...fx.shippingQuote, orderId };
    const res = await http("POST", CONTRACTS.shipping.quotePost, { json: payload });
    assertRequiredContract(res, "Shipping quote", { method: "POST", path: CONTRACTS.shipping.quotePost });

    if (!res.ok) return failEvidence("Shipping quote failed", { status: res.status, body: res.bodyJson || res.bodyText });

    const b = res.bodyJson || {};
    const shipmentId = b.shipmentId || b.id || b.shipment?.id || null;
    const quoteId = b.quoteId || (Array.isArray(b.quotes) ? (b.quotes[0]?.id || b.quotes[0]?.quoteId) : null) || null;

    report.entities.shipmentId = shipmentId;

    // Persist quoteId in evidence only (select payload can also be overridden via env).
    return passEvidence({ status: res.status, shipmentId, quoteId, body: b });
  });

  // 11.20.6 Shipping: select option (bind to shipment/order)
  await step(report, "Chain A — Shipping: select quote", async () => {
    const shipmentId = report.entities.shipmentId;
    if (!shipmentId) return failEvidence("Missing shipmentId prior to shipping select", null);

    // Allow user to override payload fully via env; otherwise we attempt with placeholders filled.
    const payload = {
      ...fx.shippingSelect,
      shipmentId,
      // quoteId may be required by your API; if so, set ORCH_FIXTURE_SHIPPING_SELECT in CI.
    };

    const res = await http("POST", CONTRACTS.shipping.selectPost, { json: payload });
    assertRequiredContract(res, "Shipping select", { method: "POST", path: CONTRACTS.shipping.selectPost });

    if (!res.ok) return failEvidence("Shipping select failed", { status: res.status, body: res.bodyJson || res.bodyText });

    return passEvidence({ status: res.status, body: res.bodyJson || res.bodyText });
  });

  // 11.20.7 Shipping: read shipment
  await step(report, "Chain A — Shipping: read shipment", async () => {
    const shipmentId = report.entities.shipmentId;
    if (!shipmentId) return failEvidence("Missing shipmentId prior to shipment read", null);

    const pathT = expandPath(CONTRACTS.shipping.shipmentGet, shipmentId);
    const res = await http("GET", pathT);
    assertRequiredContract(res, "Shipping shipment read", { method: "GET", path: pathT });

    if (!res.ok) return failEvidence("Shipment read failed", { status: res.status, body: res.bodyJson || res.bodyText });

    return passEvidence({ status: res.status, shipment: res.bodyJson || {} });
  });

  // 11.20.8 Settlement: create hold (read-only verification later; creation is required by your blueprint)
  await step(report, "Chain A — Settlement: create hold", async () => {
    const entityId = report.entities.orderId || report.entities.paymentId || report.entities.shipmentId;
    if (!entityId) return failEvidence("No entityId available for settlement hold creation", null);

    const payload = { ...fx.settlementHold, entityId };
    const res = await http("POST", CONTRACTS.settlement.holdPost, { json: payload });
    assertRequiredContract(res, "Settlement hold create", { method: "POST", path: CONTRACTS.settlement.holdPost });

    if (!res.ok) return failEvidence("Settlement hold creation failed", { status: res.status, body: res.bodyJson || res.bodyText });

    const b = res.bodyJson || {};
    const holdId = b.holdId || b.id || b.hold?.id || null;
    report.entities.holdId = holdId;

    if (!holdId) return failEvidence("Settlement hold returned no holdId", { body: b });

    return passEvidence({ status: res.status, holdId, body: b });
  });

  // 11.20.9 Settlement: read hold
  await step(report, "Chain A — Settlement: read hold", async () => {
    const holdId = report.entities.holdId;
    if (!holdId) return failEvidence("Missing holdId prior to hold read", null);

    const pathT = expandPath(CONTRACTS.settlement.holdGet, holdId);
    const res = await http("GET", pathT);
    assertRequiredContract(res, "Settlement hold read", { method: "GET", path: pathT });

    if (!res.ok) return failEvidence("Settlement hold read failed", { status: res.status, body: res.bodyJson || res.bodyText });

    return passEvidence({ status: res.status, hold: res.bodyJson || {} });
  });

  // 11.20.10 CRM: query case linkage by entity (happy path may be none; still must read)
  await step(report, "Chain A — CRM: query cases linked to order", async () => {
    const orderId = report.entities.orderId;
    if (!orderId) return failEvidence("Missing orderId for CRM linkage query", null);

    const qPath = expandPathAny(CONTRACTS.crm.casesQueryGet, { id: orderId });
    const res = await http("GET", qPath);
    assertRequiredContract(res, "CRM cases query", { method: "GET", path: qPath });

    if (!res.ok) return failEvidence("CRM cases query failed", { status: res.status, body: res.bodyJson || res.bodyText });

    const b = res.bodyJson || {};
    // Accept either {cases:[...]} or direct array
    const cases = Array.isArray(b) ? b : (Array.isArray(b.cases) ? b.cases : []);
    const firstCaseId = cases[0]?.id || cases[0]?.caseId || null;

    // In happy path, case may be absent; that's OK.
    report.entities.crmCaseId = firstCaseId || report.entities.crmCaseId;

    return passEvidence({ status: res.status, caseCount: cases.length, firstCaseId, body: b });
  });

  // 11.20.11 Email: queue/preview/send (no real mail delivery required; only logs)
  await step(report, "Chain A — Email: queue operational email", async () => {
    const entityId = report.entities.orderId || report.entities.paymentId || report.entities.shipmentId;
    if (!entityId) return failEvidence("No entityId available for email queue", null);

    const payload = { ...fx.emailQueue, entityId };
    const res = await http("POST", CONTRACTS.email.queuePost, { json: payload });
    assertRequiredContract(res, "Email queue", { method: "POST", path: CONTRACTS.email.queuePost });

    if (!res.ok) return failEvidence("Email queue failed", { status: res.status, body: res.bodyJson || res.bodyText });

    const b = res.bodyJson || {};
    const msgId = b.messageId || b.id || b.queueId || b.logId || null;
    report.entities.emailMessageId = msgId;

    // messageId may not be returned; logs verification is the enforcement.
    return passEvidence({ status: res.status, messageId: msgId, body: b });
  });

  // 11.20.12 Email: read logs for entity
  await step(report, "Chain A — Email: verify send log exists (poll)", async () => {
    const entityId = report.entities.orderId || report.entities.paymentId || report.entities.shipmentId;
    if (!entityId) return failEvidence("No entityId available for email logs", null);

    const logPath = expandPathAny(CONTRACTS.email.logsGet, { id: entityId });

    const polled = await poll(
      "email-logs",
      async () => {
        const res = await http("GET", logPath);
        assertRequiredContract(res, "Email logs read", { method: "GET", path: logPath });

        if (!res.ok) return { done: true, value: failEvidence("Email logs read failed", { status: res.status, body: res.bodyJson || res.bodyText }) };

        const b = res.bodyJson || {};
        const logs = Array.isArray(b) ? b : (Array.isArray(b.logs) ? b.logs : (Array.isArray(b.items) ? b.items : []));
        if (logs.length > 0) return { done: true, value: passEvidence({ status: res.status, logCount: logs.length, body: b }) };

        return { done: false, value: { logCount: 0, body: b } };
      }
    );

    if (!polled.ok) {
      return failEvidence("Email log did not appear within polling budget", {
        attempts: polled.attempts,
        last: polled.value,
        path: logPath,
      });
    }

    return polled.value;
  });

  // Compliance is optional: explicit skip with reason
  await step(report, "Chain A — Compliance (optional): skipped", async () => {
    return skippedEvidence("Compliance is optional for Phase 11 until deterministic test seam exists", {
      note: "Will be enforced once compliance test seam is declared deterministic and CI-available.",
    });
  }, { optional: true });
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
    await step(report, "Scaffold — environment", async () => {
      return passEvidence({
        backendUrl: BACKEND_URL,
        correlationId: CORRELATION_ID,
        timeoutMs: REQUEST_TIMEOUT_MS,
        poll: { intervalMs: POLL_INTERVAL_MS, maxAttempts: POLL_MAX_ATTEMPTS },
        headers: redactHeaders({
          "x-test-role": TEST_ROLE,
          "x-test-userid": TEST_USERID,
          "x-correlation-id": CORRELATION_ID,
        }),
        contracts: CONTRACTS,
      });
    });

    await healthFanout(report);

    // Step 11.20 — Happy path chain (Required subsystems only)
    await chainHappyPath(report);

    await exitWith(report.status === "FAIL" ? 1 : 0);
  } catch (err) {
    // Contract failures are treated as hard FAIL
    if (err && err.__orchContractFailure) {
      report.failures.push({
        type: "MISSING_READ_CONTRACT",
        message: err.message,
        contract: err.__orchContract || null,
      });
    } else {
      report.failures.push({
        type: "UNHANDLED",
        message: err?.message || String(err),
      });
    }
    await exitWith(1);
  }
}

main();
