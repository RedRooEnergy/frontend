#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const BASE_URL = (process.env.RUNTIME_BASE_URL || "http://127.0.0.1:4010").replace(/\/+$/, "");
const RUNTIME_PORT = Number(process.env.RUNTIME_PORT || "4010");
const REPORT_PATH = process.env.RUNTIME_BOOT_REPORT_PATH || "runtime-boot-contract-report.json";
const STARTUP_TIMEOUT_MS = Number(process.env.RUNTIME_STARTUP_TIMEOUT_MS || "30000");
const REQUEST_TIMEOUT_MS = Number(process.env.RUNTIME_REQUEST_TIMEOUT_MS || "8000");
const WATCHDOG_TIMEOUT_MS = Number(process.env.RUNTIME_WATCHDOG_TIMEOUT_MS || "1000");
const WATCHDOG_MAX_WAIT_MS = Number(process.env.RUNTIME_WATCHDOG_MAX_WAIT_MS || "12000");
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGO_DB_NAME = process.env.MONGODB_DB_NAME || "redroo_backend";

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withRequestTimeout(fetchPromise, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    promise: fetchPromise(controller.signal).finally(() => clearTimeout(timer)),
  };
}

async function http(method, pathSuffix, { headers = {}, json } = {}) {
  const { controller, promise } = withRequestTimeout(
    (signal) =>
      fetch(`${BASE_URL}${pathSuffix}`, {
        method,
        headers: {
          accept: "application/json",
          ...(json ? { "content-type": "application/json" } : {}),
          ...headers,
        },
        body: json ? JSON.stringify(json) : undefined,
        signal,
      }),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await promise;
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    const aborted =
      error?.name === "AbortError" || String(error?.message || error).includes("AbortError");
    return {
      ok: false,
      status: aborted ? 599 : 598,
      body: { error: String(error?.message || error), aborted },
    };
  } finally {
    controller.abort();
  }
}

function makeCheck(name, expected) {
  return {
    name,
    expected,
    status: "PENDING",
    actual: null,
    details: null,
  };
}

function getCheck(checks, name) {
  const check = checks.find((entry) => entry.name === name);
  if (!check) {
    throw new Error(`CHECK_NOT_FOUND:${name}`);
  }
  return check;
}

function markPass(check, actual, details) {
  check.status = "PASS";
  check.actual = actual;
  check.details = details ?? null;
}

function markFail(check, actual, details) {
  check.status = "FAIL";
  check.actual = actual;
  check.details = details ?? null;
}

function spawnRuntime({ envOverrides = {}, logPrefix = "runtime" } = {}) {
  const env = {
    ...process.env,
    PORT: String(RUNTIME_PORT),
    ...envOverrides,
  };

  const child = spawn("node", ["dist/server.js"], {
    env,
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });

  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  return {
    child,
    getLogs() {
      return {
        [logPrefix]: {
          stdoutTail: stdout.split("\n").slice(-25).join("\n"),
          stderrTail: stderr.split("\n").slice(-25).join("\n"),
        },
      };
    },
  };
}

async function waitForHealth(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await http("GET", "/healthz");
    if (res.status === 200) {
      return true;
    }
    await sleep(400);
  }
  return false;
}

async function stopRuntime(child) {
  if (child.exitCode !== null) return;

  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 4000);

    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function runWatchdogProbe() {
  const child = spawn("node", ["dist/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(RUNTIME_PORT + 1),
      MONGODB_URI: "mongodb://127.0.0.1:1",
      DB_STARTUP_TIMEOUT_MS: String(WATCHDOG_TIMEOUT_MS),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  const result = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve({ exitCode: child.exitCode, signal: child.signalCode, output, timedOut: true });
    }, WATCHDOG_MAX_WAIT_MS);

    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: code, signal, output, timedOut: false });
    });
  });

  return {
    ...result,
    containsDbStartupTimeout: String(result.output || "").includes("DB_STARTUP_TIMEOUT"),
  };
}

async function seedCrmCaseFixture() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  try {
    const db = client.db(MONGO_DB_NAME);
    const collection = db.collection("crm_cases");
    const now = nowIso();
    const entityType = "order";
    const entityId = `order_crm_case_${Date.now()}`;
    const insert = await collection.insertOne({
      entityType,
      entityId,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    });
    return {
      caseId: insert.insertedId.toString(),
      entityType,
      entityId,
    };
  } finally {
    await client.close();
  }
}

async function main() {
  const report = {
    phase: "10.5.60-runtime-boot-contract",
    startedAt: nowIso(),
    finishedAt: null,
    status: "FAIL",
    baseUrl: BASE_URL,
    runtimePort: RUNTIME_PORT,
    checks: [],
    entities: {
      snapshotId: null,
      snapshotHash: null,
      orderId: null,
      paymentId: null,
      shipmentId: null,
      selectedQuoteId: null,
      refundRequestId: null,
      queueItemId: null,
      holdId: null,
      crmCaseId: null,
      crmEntityType: null,
      crmEntityId: null,
    },
    watchdog: null,
    logs: {},
    failureSummary: [],
  };

  const checks = [
    makeCheck("healthz", "200"),
    makeCheck("pricing checkout create", "201 + snapshotId + snapshotHash"),
    makeCheck("pricing snapshot read", "200 + same snapshotId + same snapshotHash"),
    makeCheck("payments checkout create", "201 + paymentId + status"),
    makeCheck("payments status read", "200 + same paymentId"),
    makeCheck("shipping quote create", "201 + shipmentId + quotes std/exp"),
    makeCheck("shipping select", "200 + selectedQuoteId"),
    makeCheck("shipping shipment read", "200 + SELECTED state"),
    makeCheck("admin queues unauthenticated", "401"),
    makeCheck("admin queues forbidden role", "403"),
    makeCheck("refund create", "201 + ids"),
    makeCheck("admin queues authorized list", "200"),
    makeCheck("settlement hold create", "201 + holdId"),
    makeCheck("settlement hold read", "200 + same holdId"),
    makeCheck("crm list cases", "200 + cases array"),
    makeCheck("crm read case", "200 + same caseId"),
    makeCheck("queue resolve blocked by active hold", "409 HOLD_ACTIVE"),
    makeCheck("unknown route", "404"),
    makeCheck("watchdog startup fail-fast", "exit non-zero + DB_STARTUP_TIMEOUT"),
  ];
  report.checks = checks;

  const runtime = spawnRuntime();
  let runtimeReady = false;

  try {
    runtimeReady = await waitForHealth(STARTUP_TIMEOUT_MS);
    if (!runtimeReady) {
      const check = getCheck(checks, "healthz");
      markFail(check, "timeout", { timeoutMs: STARTUP_TIMEOUT_MS });
      throw new Error("RUNTIME_STARTUP_TIMEOUT");
    }

    {
      const check = getCheck(checks, "healthz");
      const res = await http("GET", "/healthz");
      if (res.status === 200 && res.body?.status === "ok") {
        markPass(check, `${res.status}`, res.body);
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "pricing checkout create");
      const checkoutRes = await http("POST", "/api/checkout/session", {
        headers: {
          "x-correlation-id": `runtime-boot-contract-pricing-${Date.now()}`,
        },
        json: {
          items: [
            { sku: "TEST-SKU-001", quantity: 2, unitPriceAUD: 1200 },
            { sku: "TEST-SKU-002", quantity: 1, unitPriceAUD: 800 },
          ],
          currency: "AUD",
          metadata: {
            source: "runtime-boot-contract",
          },
        },
      });

      const snapshotId = checkoutRes.body?.snapshotId || null;
      const snapshotHash = checkoutRes.body?.snapshotHash || null;
      const orderId = checkoutRes.body?.orderId || null;
      report.entities.snapshotId = snapshotId;
      report.entities.snapshotHash = snapshotHash;
      report.entities.orderId = orderId;

      if (checkoutRes.status === 201 && snapshotId && snapshotHash && orderId) {
        markPass(check, `${checkoutRes.status}`, {
          snapshotId,
          snapshotHash,
          orderId,
          totalAUD: checkoutRes.body?.totalAUD,
        });
      } else {
        markFail(check, `${checkoutRes.status}`, checkoutRes.body);
      }
    }

    {
      const check = getCheck(checks, "pricing snapshot read");
      const res = await http(
        "GET",
        `/api/pricing/snapshots/${report.entities.snapshotId || "missing"}`,
      );

      if (
        res.status === 200 &&
        res.body?.snapshotId === report.entities.snapshotId &&
        res.body?.snapshotHash === report.entities.snapshotHash &&
        res.body?.orderId === report.entities.orderId
      ) {
        markPass(check, `${res.status}`, {
          snapshotId: res.body.snapshotId,
          snapshotHash: res.body.snapshotHash,
          orderId: res.body.orderId,
          totalAUD: res.body.totalAUD,
        });
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "payments checkout create");
      const checkoutRes = await http("POST", "/api/payments/checkout", {
        headers: {
          "x-correlation-id": `runtime-boot-contract-payment-${Date.now()}`,
        },
        json: {
          snapshotId: report.entities.snapshotId,
          orderId: `order_10560_payment_${Date.now()}`,
          amountAUD: 2500,
          currency: "AUD",
          provider: "TEST",
          metadata: {
            source: "runtime-boot-contract",
          },
        },
      });

      const paymentId = checkoutRes.body?.paymentId || null;
      report.entities.paymentId = paymentId;

      if (
        checkoutRes.status === 201 &&
        paymentId &&
        (checkoutRes.body?.status === "SUCCEEDED" || checkoutRes.body?.status === "PENDING")
      ) {
        markPass(check, `${checkoutRes.status}`, {
          paymentId,
          status: checkoutRes.body.status,
        });
      } else {
        markFail(check, `${checkoutRes.status}`, checkoutRes.body);
      }
    }

    {
      const check = getCheck(checks, "payments status read");
      const res = await http("GET", `/api/payments/status/${report.entities.paymentId || "missing"}`);
      if (
        res.status === 200 &&
        res.body?.paymentId === report.entities.paymentId &&
        (res.body?.status === "SUCCEEDED" || res.body?.status === "PENDING")
      ) {
        markPass(check, `${res.status}`, {
          paymentId: res.body.paymentId,
          status: res.body.status,
        });
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "shipping quote create");
      const quoteRes = await http("POST", "/api/shipping/quote", {
        json: {
          orderId: `order_10560_ship_${Date.now()}`,
          snapshotId: report.entities.snapshotId,
          destination: { country: "AU", state: "QLD", postcode: "4000" },
          items: [
            { sku: "TEST-SKU-001", quantity: 2, weightKg: 1.2 },
            { sku: "TEST-SKU-002", quantity: 1 },
          ],
        },
      });

      const shipmentId = quoteRes.body?.shipmentId || null;
      const quotes = Array.isArray(quoteRes.body?.quotes) ? quoteRes.body.quotes : [];
      const quoteIds = new Set(quotes.map((q) => q.quoteId));

      report.entities.shipmentId = shipmentId;

      const hasStd = quoteIds.has("std");
      const hasExp = quoteIds.has("exp");

      if (quoteRes.status === 201 && shipmentId && hasStd && hasExp) {
        markPass(check, `${quoteRes.status}`, { shipmentId, quoteCount: quotes.length });
      } else {
        markFail(check, `${quoteRes.status}`, quoteRes.body);
      }
    }

    {
      const check = getCheck(checks, "shipping select");
      const selRes = await http("POST", "/api/shipping/select", {
        json: {
          shipmentId: report.entities.shipmentId,
          quoteId: "std",
        },
      });

      const selectedQuoteId = selRes.body?.selectedQuoteId || null;
      report.entities.selectedQuoteId = selectedQuoteId;

      if (selRes.status === 200 && selectedQuoteId === "std") {
        markPass(check, `${selRes.status}`, {
          shipmentId: report.entities.shipmentId,
          selectedQuoteId,
        });
      } else {
        markFail(check, `${selRes.status}`, selRes.body);
      }
    }

    {
      const check = getCheck(checks, "shipping shipment read");
      const res = await http("GET", `/api/shipping/shipments/${report.entities.shipmentId || "missing"}`);

      if (
        res.status === 200 &&
        res.body?.shipmentId === report.entities.shipmentId &&
        res.body?.status === "SELECTED" &&
        res.body?.selectedQuoteId === "std"
      ) {
        markPass(check, `${res.status}`, {
          shipmentId: res.body.shipmentId,
          status: res.body.status,
          selectedQuoteId: res.body.selectedQuoteId,
        });
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "admin queues unauthenticated");
      const res = await http("GET", "/api/admin/queues");
      if (res.status === 401) {
        markPass(check, `${res.status}`, res.body);
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "admin queues forbidden role");
      const res = await http("GET", "/api/admin/queues", {
        headers: {
          "x-test-role": "buyer",
          "x-test-userid": "buyer1",
        },
      });
      if (res.status === 403) {
        markPass(check, `${res.status}`, res.body);
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "refund create");
      const refundRes = await http("POST", "/api/payments/refunds/request", {
        json: {
          orderId: `order_10560_ci_${Date.now()}`,
          buyerUserId: "buyer1",
          buyerEmail: "buyer@example.com",
          reason: "runtime-boot-contract",
        },
      });
      const refundRequestId = refundRes.body?.refundRequestId || null;
      const queueItemId = refundRes.body?.queueItemId || null;
      report.entities.refundRequestId = refundRequestId;
      report.entities.queueItemId = queueItemId;

      if (refundRes.status === 201 && refundRequestId && queueItemId) {
        markPass(check, `${refundRes.status}`, {
          refundRequestId,
          queueItemId,
        });
      } else {
        markFail(check, `${refundRes.status}`, refundRes.body);
      }
    }

    {
      const check = getCheck(checks, "admin queues authorized list");
      const res = await http("GET", "/api/admin/queues", {
        headers: {
          "x-test-role": "admin",
          "x-test-userid": "admin1",
        },
      });
      if (res.status === 200) {
        markPass(check, `${res.status}`, Array.isArray(res.body) ? { count: res.body.length } : res.body);
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "settlement hold create");
      const holdRes = await http("POST", "/api/settlement/holds", {
        json: {
          entityType: "Refund",
          entityId: report.entities.refundRequestId,
          reason: "risk",
          createdBy: "admin1",
        },
      });
      const holdId = holdRes.body?.holdId || null;
      report.entities.holdId = holdId;

      if (holdRes.status === 201 && holdId) {
        markPass(check, `${holdRes.status}`, { holdId });
      } else {
        markFail(check, `${holdRes.status}`, holdRes.body);
      }
    }

    {
      const check = getCheck(checks, "settlement hold read");
      const res = await http("GET", `/api/settlement/holds/${report.entities.holdId || "missing"}`);
      if (res.status === 200 && res.body?.holdId === report.entities.holdId) {
        markPass(check, `${res.status}`, {
          holdId: res.body.holdId,
          status: res.body.status,
        });
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const seeded = await seedCrmCaseFixture();
      report.entities.crmCaseId = seeded.caseId;
      report.entities.crmEntityType = seeded.entityType;
      report.entities.crmEntityId = seeded.entityId;
    }

    {
      const check = getCheck(checks, "crm list cases");
      const entityType = encodeURIComponent(report.entities.crmEntityType || "order");
      const entityId = encodeURIComponent(report.entities.crmEntityId || "missing");
      const res = await http("GET", `/api/crm/cases?entityType=${entityType}&entityId=${entityId}`);

      const cases = Array.isArray(res.body)
        ? res.body
        : Array.isArray(res.body?.cases)
          ? res.body.cases
          : [];

      const found = cases.some((row) => {
        const id = row?.caseId || row?.id || null;
        return id === report.entities.crmCaseId;
      });

      if (res.status === 200 && found) {
        markPass(check, `${res.status}`, {
          caseId: report.entities.crmCaseId,
          count: cases.length,
        });
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "crm read case");
      const res = await http("GET", `/api/crm/cases/${report.entities.crmCaseId || "missing"}`);
      if (res.status === 200 && res.body?.caseId === report.entities.crmCaseId) {
        markPass(check, `${res.status}`, {
          caseId: res.body.caseId,
          entityType: res.body.entityType,
          entityId: res.body.entityId,
        });
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "queue resolve blocked by active hold");
      const res = await http("PATCH", "/api/admin/queues", {
        headers: {
          "x-test-role": "admin",
          "x-test-userid": "admin1",
        },
        json: {
          id: report.entities.queueItemId,
          newStatus: "RESOLVED",
        },
      });
      if (res.status === 409 && res.body?.error === "HOLD_ACTIVE") {
        markPass(check, `${res.status}`, res.body);
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = getCheck(checks, "unknown route");
      const res = await http("GET", "/api/not-a-real-route");
      if (res.status === 404) {
        markPass(check, `${res.status}`, res.body);
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }
  } catch (error) {
    report.failureSummary.push({
      type: "UNHANDLED",
      message: String(error?.message || error),
    });
  } finally {
    await stopRuntime(runtime.child);
    report.logs = { ...report.logs, ...runtime.getLogs() };
  }

  {
    const check = getCheck(checks, "watchdog startup fail-fast");
    const watchdog = await runWatchdogProbe();
    report.watchdog = {
      exitCode: watchdog.exitCode,
      signal: watchdog.signal,
      timedOut: watchdog.timedOut,
      containsDbStartupTimeout: watchdog.containsDbStartupTimeout,
    };
    report.logs.watchdog = {
      outputTail: String(watchdog.output || "")
        .split("\n")
        .slice(-30)
        .join("\n"),
    };

    if (
      watchdog.timedOut === false &&
      typeof watchdog.exitCode === "number" &&
      watchdog.exitCode !== 0 &&
      watchdog.containsDbStartupTimeout
    ) {
      markPass(check, `exit=${watchdog.exitCode}`, {
        containsDbStartupTimeout: watchdog.containsDbStartupTimeout,
      });
    } else {
      markFail(check, `exit=${watchdog.exitCode ?? "null"}`, {
        timedOut: watchdog.timedOut,
        containsDbStartupTimeout: watchdog.containsDbStartupTimeout,
      });
    }
  }

  const failedChecks = checks.filter((entry) => entry.status !== "PASS");
  if (failedChecks.length > 0) {
    report.failureSummary.push(
      ...failedChecks.map((entry) => ({
        type: "CHECK_FAILED",
        name: entry.name,
        actual: entry.actual,
      })),
    );
  }

  report.status = failedChecks.length === 0 && report.failureSummary.length === 0 ? "PASS" : "FAIL";
  report.finishedAt = nowIso();

  const outputPath = path.resolve(process.cwd(), REPORT_PATH);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(`runtime boot contract report written: ${outputPath}`);

  if (report.status !== "PASS") {
    process.exit(1);
  }
}

main().catch((error) => {
  const outputPath = path.resolve(process.cwd(), REPORT_PATH);
  const fallbackReport = {
    phase: "10.5.60-runtime-boot-contract",
    startedAt: nowIso(),
    finishedAt: nowIso(),
    status: "FAIL",
    failureSummary: [
      {
        type: "SCRIPT_CRASH",
        message: String(error?.message || error),
      },
    ],
  };
  fs.writeFileSync(outputPath, JSON.stringify(fallbackReport, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.error(`runtime boot contract script failed: ${String(error?.message || error)}`);
  process.exit(1);
});
