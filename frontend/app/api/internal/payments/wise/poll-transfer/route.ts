import "../../../../../../lib/payments/bootstrap";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { resolvePaymentsRuntimeConfig } from "../../../../../../lib/payments/config";
import { logPaymentEvent } from "../../../../../../lib/payments/logging";
import { recordRuntimeMetricEvent } from "../../../../../../lib/payments/metrics/runtime";
import {
  getWiseTransferIntentByIntentId,
  getWiseTransferIntentByTransferId,
  type WiseTransferIntentRecord,
} from "../../../../../../lib/payments/wiseTransferIntentStore";
import { pollWiseIntentUntilTerminal } from "../../../../../../lib/payments/wiseTransferService";
import { markWiseTransferTerminal } from "../../../../../../lib/payments/wiseOrderLifecycle";
import { recordAudit } from "../../../../../../lib/audit";
import { dispatchFreightAuditLifecycleHook } from "../../../../../../lib/freightAudit/FreightAuditLifecycleHooks";

function safeEqualHex(left: string, right: string) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
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

function verifyPollingJobSignature(rawBody: string, headers: Headers) {
  const secret = String(process.env.WISE_POLLING_JOB_SECRET || "").trim();
  if (!secret) {
    throw new Error("WISE_POLLING_JOB_SECRET_NOT_CONFIGURED");
  }

  const signature = String(headers.get("x-rre-job-signature") || "").trim();
  const timestampRaw = String(headers.get("x-rre-job-timestamp") || "").trim();
  const timestamp = Number(timestampRaw);

  if (!signature || !Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error("WISE_POLLING_SIGNATURE_HEADER_INVALID");
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(nowUnix - Math.floor(timestamp)) > 300) {
    throw new Error("WISE_POLLING_SIGNATURE_STALE");
  }

  const expected = crypto.createHmac("sha256", secret).update(`${Math.floor(timestamp)}.${rawBody}`, "utf8").digest("hex");
  if (!safeEqualHex(signature, expected)) {
    throw new Error("WISE_POLLING_SIGNATURE_INVALID");
  }
}

async function resolveIntent(input: { intentId?: string; transferId?: string }) {
  const intentId = String(input.intentId || "").trim();
  const transferId = String(input.transferId || "").trim();

  if (intentId) {
    return getWiseTransferIntentByIntentId(intentId);
  }
  if (transferId) {
    return getWiseTransferIntentByTransferId(transferId);
  }
  return null;
}

function applyTerminalMutation(intent: WiseTransferIntentRecord) {
  if (intent.state === "COMPLETED") {
    const completed = markWiseTransferTerminal(intent.orderId, "COMPLETED", intent.transferId, "WISE_POLLING_COMPLETED");
    recordAudit("ADMIN_SETTLEMENT_COMPLETED", {
      orderId: intent.orderId,
      transferId: intent.transferId,
      source: "wise.polling",
    });
    if (completed) {
      dispatchFreightAuditLifecycleHook({
        source: "api.internal.payments.wise.poll-transfer",
        triggerEvent: "PAYOUT_READY",
        orderId: intent.orderId,
        createdByRole: "system",
        createdById: "wise-polling-job",
        closedByRole: "system",
        closedById: "wise-polling-job",
        context: {
          source: "api.internal.payments.wise.poll-transfer",
          phase: "payout_ready",
          settlementMode: "wise-polling",
          orderId: intent.orderId,
          transferId: intent.transferId || null,
          orderStatus: completed.status,
          escrowStatus: completed.escrowStatus || null,
          availableEvidenceCodes: [
            "WEBHOOK_SIGNATURE_LOG",
            "EVIDENCE_HASH_RECORD",
            "TIMELINE_REPLAY_EXPORT",
            "EVIDENCE_PACK_MANIFEST",
          ],
        },
      });
    }
    return;
  }

  if (intent.state === "FAILED") {
    markWiseTransferTerminal(intent.orderId, "FAILED", intent.transferId, intent.lastErrorCode || "WISE_PROVIDER_FAILED");
    return;
  }
  if (intent.state === "CANCELLED") {
    markWiseTransferTerminal(intent.orderId, "CANCELLED", intent.transferId, intent.lastErrorCode || "WISE_PROVIDER_CANCELLED");
    return;
  }
  if (intent.state === "TIMED_OUT") {
    markWiseTransferTerminal(intent.orderId, "TIMED_OUT", intent.transferId, intent.lastErrorCode || "WISE_PROVIDER_TIMEOUT");
  }
}

export async function POST(request: Request) {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  if (!runtimeConfig.flags.wiseHardenedFlowEnabled) {
    return NextResponse.json({ error: "Wise hardened flow disabled" }, { status: 404 });
  }
  const metricsEnabled = runtimeConfig.flags.metricsEnabled;

  const rawBody = await request.text();
  try {
    verifyPollingJobSignature(rawBody, request.headers);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Polling signature verification failed",
        code: String(error?.message || "WISE_POLLING_SIGNATURE_FAILED"),
      },
      { status: 401 }
    );
  }

  let payload: { intentId?: string; transferId?: string; maxAttempts?: number; intervalMs?: number };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const intent = await resolveIntent(payload || {});
  if (!intent) {
    return NextResponse.json({ error: "Wise transfer intent not found" }, { status: 404 });
  }

  const poll = await pollWiseIntentUntilTerminal({
    intentId: intent.intentId,
    maxAttempts: Number(payload.maxAttempts || 0) || undefined,
    intervalMs: Number(payload.intervalMs || 0) || undefined,
  });
  const result = poll.intent;

  emitMetricsEvent(
    metricsEnabled,
    "payments_metrics_wise_polling_outcome",
    {
      provider: "wise",
      route: "/api/internal/payments/wise/poll-transfer",
      outcome: poll.terminalEventId ? "TERMINAL_EVENT_BACKED" : "NO_TERMINAL_EVENT",
      state: result.state,
      orderId: result.orderId,
      wiseTransferId: result.transferId || null,
      wiseIntentId: result.intentId,
      terminalEventId: poll.terminalEventId || null,
    },
    "info"
  );

  if (poll.terminalEventId) {
    applyTerminalMutation(result);
  }

  return NextResponse.json({
    ok: true,
    intentId: result.intentId,
    orderId: result.orderId,
    transferId: result.transferId,
    state: result.state,
    autoRetryBlocked: result.autoRetryBlocked,
    pollAttempts: result.pollAttempts,
    maxPollAttempts: result.maxPollAttempts,
    terminalEventId: poll.terminalEventId,
  });
}
