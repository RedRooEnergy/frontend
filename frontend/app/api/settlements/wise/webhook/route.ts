import "../../../../../lib/payments/bootstrap";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { appendPaymentProviderEvent, updatePaymentProviderEventStatus } from "../../../../../lib/payments/providerEventStore";
import { resolvePaymentsRuntimeConfig } from "../../../../../lib/payments/config";
import { deriveWiseProviderEventId } from "../../../../../lib/payments/wiseEvents";
import { sha256Hex, stableStringify } from "../../../../../lib/payments/pricingSnapshot";
import { applyWiseProviderStatusToIntent } from "../../../../../lib/payments/wiseTransferService";
import { markWiseTransferTerminal } from "../../../../../lib/payments/wiseOrderLifecycle";
import { logPaymentEvent } from "../../../../../lib/payments/logging";
import { recordRuntimeMetricEvent } from "../../../../../lib/payments/metrics/runtime";
import { recordAudit } from "../../../../../lib/audit";
import { dispatchFreightAuditLifecycleHook } from "../../../../../lib/freightAudit/FreightAuditLifecycleHooks";

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

function parseOccurredAtUnix(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0) return Math.floor(asNumber);
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed / 1000);
  }
  return null;
}

function extractWiseEventPayload(payload: any) {
  const transferId = String(
    payload?.transferId || payload?.data?.transferId || payload?.resource?.id || payload?.transfer?.id || ""
  ).trim();
  const status = String(payload?.status || payload?.data?.status || payload?.currentStatus || "unknown").trim();
  const eventType = String(payload?.type || payload?.eventType || payload?.topic || "transfer.status").trim();
  const incomingEventId = String(payload?.id || payload?.eventId || payload?.deliveryId || "").trim();
  const occurredAtUnix =
    parseOccurredAtUnix(payload?.occurredAt) ||
    parseOccurredAtUnix(payload?.createdAt) ||
    parseOccurredAtUnix(payload?.timestamp) ||
    parseOccurredAtUnix(payload?.created);

  return {
    transferId,
    status,
    eventType,
    incomingEventId: incomingEventId || null,
    occurredAtUnix,
  };
}

function verifyWiseWebhookAuth(request: Request, rawBody: string) {
  const hmacSecret = String(process.env.WISE_WEBHOOK_HMAC_SECRET || "").trim();
  if (hmacSecret) {
    const header = String(request.headers.get("x-wise-signature") || "").trim();
    const signature = header.startsWith("sha256=") ? header.slice(7) : header;
    if (!signature) {
      throw new Error("WISE_WEBHOOK_SIGNATURE_MISSING");
    }

    const expected = crypto.createHmac("sha256", hmacSecret).update(rawBody, "utf8").digest("hex");
    if (!safeEqualHex(signature, expected)) {
      throw new Error("WISE_WEBHOOK_SIGNATURE_INVALID");
    }
    return;
  }

  const token = String(process.env.WISE_WEBHOOK_TOKEN || "").trim();
  if (token) {
    const authHeader = String(request.headers.get("authorization") || "").trim();
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const tokenHeader = String(request.headers.get("x-wise-webhook-token") || "").trim();
    if (bearer !== token && tokenHeader !== token) {
      throw new Error("WISE_WEBHOOK_TOKEN_INVALID");
    }
    return;
  }

  throw new Error("WISE_WEBHOOK_AUTH_NOT_CONFIGURED");
}

export async function POST(request: Request) {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  const hardenedEnabled = runtimeConfig.flags.wiseHardenedFlowEnabled;
  const metricsEnabled = runtimeConfig.flags.metricsEnabled;

  const rawBody = await request.text();

  try {
    verifyWiseWebhookAuth(request, rawBody);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Wise webhook authentication failed",
        code: String(error?.message || "WISE_WEBHOOK_AUTH_FAILED"),
      },
      { status: 401 }
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = extractWiseEventPayload(payload);
  if (!parsed.transferId) {
    return NextResponse.json({ error: "transferId missing" }, { status: 400 });
  }

  const payloadHashSha256 = sha256Hex(rawBody || stableStringify(payload || {}));
  const eventId = deriveWiseProviderEventId({
    incomingEventId: parsed.incomingEventId,
    transferId: parsed.transferId,
    eventType: parsed.eventType,
    status: parsed.status,
    occurredAtUnix: parsed.occurredAtUnix,
    payloadHashSha256,
  });

  if (!hardenedEnabled) {
    const appended = await appendPaymentProviderEvent({
      provider: "wise",
      eventId,
      eventType: parsed.eventType,
      transferId: parsed.transferId,
      payloadHashSha256,
      payload,
      occurredAt: parsed.occurredAtUnix ? new Date(parsed.occurredAtUnix * 1000).toISOString() : null,
    });

    if (appended.created) {
      await updatePaymentProviderEventStatus({
        provider: "wise",
        eventId,
        status: "PROCESSED",
        metadata: {
          outcome: "LOG_ONLY_NON_HARDENED",
          transferId: parsed.transferId,
          providerStatus: parsed.status,
        },
      });
    }

    emitMetricsEvent(
      metricsEnabled,
      "payments_metrics_wise_polling_outcome",
      {
        provider: "wise",
        route: "/api/settlements/wise/webhook",
        outcome: "LOG_ONLY_NON_HARDENED",
        state: parsed.status || "unknown",
        transferId: parsed.transferId,
      },
      "info"
    );

    return NextResponse.json({ received: true, mode: "log_only_non_hardened" });
  }

  const applied = await applyWiseProviderStatusToIntent({
    transferId: parsed.transferId,
    eventType: parsed.eventType,
    providerStatus: parsed.status,
    payload,
    incomingEventId: parsed.incomingEventId,
    occurredAtUnix: parsed.occurredAtUnix,
  });

  const isTerminalTransition =
    applied.transitionState === "COMPLETED" ||
    applied.transitionState === "FAILED" ||
    applied.transitionState === "CANCELLED" ||
    applied.transitionState === "TIMED_OUT";

  if (applied.intent && applied.transitioned && !applied.duplicate && isTerminalTransition) {
    if (applied.transitionState === "COMPLETED") {
      const completed = markWiseTransferTerminal(
        applied.intent.orderId,
        "COMPLETED",
        applied.intent.transferId,
        "WISE_PROVIDER_COMPLETED"
      );
      recordAudit("ADMIN_SETTLEMENT_COMPLETED", {
        orderId: applied.intent.orderId,
        transferId: applied.intent.transferId,
        source: "wise.webhook",
      });
      if (completed) {
        dispatchFreightAuditLifecycleHook({
          source: "api.settlements.wise.webhook",
          triggerEvent: "PAYOUT_READY",
          orderId: applied.intent.orderId,
          createdByRole: "system",
          createdById: "wise-webhook",
          closedByRole: "system",
          closedById: "wise-webhook",
          context: {
            source: "api.settlements.wise.webhook",
            phase: "payout_ready",
            settlementMode: "wise-webhook",
            orderId: applied.intent.orderId,
            transferId: applied.intent.transferId || null,
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
    } else if (applied.transitionState === "FAILED") {
      markWiseTransferTerminal(applied.intent.orderId, "FAILED", applied.intent.transferId, "WISE_PROVIDER_FAILED");
      console.warn("wise_settlement_failed", {
        orderId: applied.intent.orderId,
        transferId: applied.intent.transferId,
        source: "wise.webhook",
      });
    } else if (applied.transitionState === "CANCELLED") {
      markWiseTransferTerminal(applied.intent.orderId, "CANCELLED", applied.intent.transferId, "WISE_PROVIDER_CANCELLED");
      console.warn("wise_settlement_cancelled", {
        orderId: applied.intent.orderId,
        transferId: applied.intent.transferId,
        source: "wise.webhook",
      });
    } else if (applied.transitionState === "TIMED_OUT") {
      markWiseTransferTerminal(applied.intent.orderId, "TIMED_OUT", applied.intent.transferId, "WISE_PROVIDER_TIMEOUT");
      console.warn("wise_settlement_timeout", {
        orderId: applied.intent.orderId,
        transferId: applied.intent.transferId,
        source: "wise.webhook",
      });
    }
  }

  emitMetricsEvent(
    metricsEnabled,
    "payments_metrics_wise_polling_outcome",
    {
      provider: "wise",
      route: "/api/settlements/wise/webhook",
      outcome: applied.duplicate
        ? "DUPLICATE"
        : isTerminalTransition && applied.transitioned
        ? "TERMINAL_EVENT_BACKED"
        : applied.transitioned
        ? "TRANSITIONED_NON_TERMINAL"
        : "NO_TRANSITION",
      state: applied.transitionState || parsed.status || "unknown",
      transferId: parsed.transferId,
      eventId,
      wiseIntentId: applied.intent?.intentId || null,
    },
    "info"
  );

  return NextResponse.json({
    received: true,
    duplicate: applied.duplicate,
    transitioned: applied.transitioned,
    transitionState: applied.transitionState,
  });
}
