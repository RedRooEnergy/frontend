import "../../../../../lib/payments/bootstrap";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { resolvePaymentsRuntimeConfig } from "../../../../../lib/payments/config";
import { logPaymentEvent } from "../../../../../lib/payments/logging";
import { recordRuntimeMetricEvent } from "../../../../../lib/payments/metrics/runtime";
import { runPaymentsReconciliation, type ReconciliationSource } from "../../../../../lib/payments/reconciliation";

function safeEqualHex(left: string, right: string) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function verifyReconciliationJobSignature(rawBody: string, headers: Headers) {
  const secret = String(process.env.PAYMENTS_RECONCILIATION_JOB_SECRET || "").trim();
  if (!secret) {
    throw new Error("PAYMENTS_RECONCILIATION_JOB_SECRET_NOT_CONFIGURED");
  }

  const signature = String(headers.get("x-rre-job-signature") || "").trim();
  const timestampRaw = String(headers.get("x-rre-job-timestamp") || "").trim();
  const timestamp = Number(timestampRaw);

  if (!signature || !Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error("PAYMENTS_RECONCILIATION_SIGNATURE_HEADER_INVALID");
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(nowUnix - Math.floor(timestamp)) > 300) {
    throw new Error("PAYMENTS_RECONCILIATION_SIGNATURE_STALE");
  }

  const expected = crypto.createHmac("sha256", secret).update(`${Math.floor(timestamp)}.${rawBody}`, "utf8").digest("hex");
  if (!safeEqualHex(signature, expected)) {
    throw new Error("PAYMENTS_RECONCILIATION_SIGNATURE_INVALID");
  }
}

function parseSource(input: unknown): ReconciliationSource {
  const source = String(input || "").trim();
  if (source === "cli_local" || source === "cli_http") {
    return source;
  }
  return "api_internal";
}

function emitMetricsEvent(
  enabled: boolean,
  event: string,
  context: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
) {
  if (!enabled) return;
  recordRuntimeMetricEvent({
    metric: event,
    labels: context as Record<string, string | number | boolean | null | undefined>,
  });
  logPaymentEvent(level, event, context);
}

export async function POST(request: Request) {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  if (!runtimeConfig.flags.reconciliationEnabled) {
    return NextResponse.json({ error: "Payments reconciliation disabled" }, { status: 404 });
  }
  const metricsEnabled = runtimeConfig.flags.metricsEnabled;

  const rawBody = await request.text();

  try {
    verifyReconciliationJobSignature(rawBody, request.headers);
  } catch (error: any) {
    const code = String(error?.message || "PAYMENTS_RECONCILIATION_SIGNATURE_FAILED");
    if (code === "PAYMENTS_RECONCILIATION_JOB_SECRET_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "Reconciliation job secret not configured",
          code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Reconciliation signature verification failed",
        code,
      },
      { status: 401 }
    );
  }

  let payload: {
    source?: ReconciliationSource;
    orderId?: string;
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
  };

  try {
    payload = rawBody ? (JSON.parse(rawBody) as typeof payload) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const report = await runPaymentsReconciliation({
    source: parseSource(payload?.source),
    tenantId: String(payload?.tenantId || "").trim() || null,
    filters: {
      orderId: payload?.orderId,
      fromUtc: payload?.fromUtc,
      toUtc: payload?.toUtc,
      limit: payload?.limit,
    },
  });

  emitMetricsEvent(
    metricsEnabled,
    "payments_metrics_reconciliation_summary",
    {
      provider: "reconciliation",
      source: report.source,
      discrepanciesTotal: report.summary.discrepanciesTotal,
      criticalCount: report.summary.bySeverity.CRITICAL,
      warningCount: report.summary.bySeverity.WARNING,
      infoCount: report.summary.bySeverity.INFO,
      settlementContradictions: report.summary.byCode.SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION,
      identityMismatch: report.summary.byCode.IDENTITY_MISMATCH,
      deterministicHashSha256: report.deterministicHashSha256,
    },
    report.summary.bySeverity.CRITICAL > 0 ? "warn" : "info"
  );

  return NextResponse.json(report);
}
