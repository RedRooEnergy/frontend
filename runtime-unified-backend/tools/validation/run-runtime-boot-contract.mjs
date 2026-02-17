#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = (process.env.RUNTIME_BASE_URL || "http://127.0.0.1:4010").replace(/\/+$/, "");
const RUNTIME_PORT = Number(process.env.RUNTIME_PORT || "4010");
const REPORT_PATH = process.env.RUNTIME_BOOT_REPORT_PATH || "runtime-boot-contract-report.json";
const STARTUP_TIMEOUT_MS = Number(process.env.RUNTIME_STARTUP_TIMEOUT_MS || "30000");
const REQUEST_TIMEOUT_MS = Number(process.env.RUNTIME_REQUEST_TIMEOUT_MS || "8000");
const WATCHDOG_TIMEOUT_MS = Number(process.env.RUNTIME_WATCHDOG_TIMEOUT_MS || "1000");
const WATCHDOG_MAX_WAIT_MS = Number(process.env.RUNTIME_WATCHDOG_MAX_WAIT_MS || "12000");

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
      refundRequestId: null,
      queueItemId: null,
      holdId: null,
    },
    watchdog: null,
    logs: {},
    failureSummary: [],
  };

  const checks = [
    makeCheck("healthz", "200"),
    makeCheck("admin queues unauthenticated", "401"),
    makeCheck("admin queues forbidden role", "403"),
    makeCheck("refund create", "201 + ids"),
    makeCheck("admin queues authorized list", "200"),
    makeCheck("settlement hold create", "201 + holdId"),
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
      const check = checks[0];
      markFail(check, "timeout", { timeoutMs: STARTUP_TIMEOUT_MS });
      throw new Error("RUNTIME_STARTUP_TIMEOUT");
    }

    {
      const check = checks[0];
      const res = await http("GET", "/healthz");
      if (res.status === 200 && res.body?.status === "ok") {
        markPass(check, `${res.status}`, res.body);
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = checks[1];
      const res = await http("GET", "/api/admin/queues");
      if (res.status === 401) {
        markPass(check, `${res.status}`, res.body);
      } else {
        markFail(check, `${res.status}`, res.body);
      }
    }

    {
      const check = checks[2];
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
      const check = checks[3];
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
      const check = checks[4];
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
      const check = checks[5];
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
      const check = checks[6];
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
      const check = checks[7];
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
    const check = checks[8];
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
