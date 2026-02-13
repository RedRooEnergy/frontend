import "../../../../../lib/payments/bootstrap";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getOrders, writeStore, getAdminFlags, type OrderRecord } from "../../../../../lib/store";
import { canSettle, markSettlementInitiated, markSettled } from "../../../../../lib/escrow";
import { recordAudit } from "../../../../../lib/audit";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { dispatchFreightAuditLifecycleHook } from "../../../../../lib/freightAudit/FreightAuditLifecycleHooks";
import { executePayoutWithSoftEnforcement } from "../../../../../lib/freightAudit/FreightSoftEnforcementService";
import { emitAuthorityObserveDecision } from "../../../../../lib/governance/authority/observe";
import { resolvePaymentsRuntimeConfig } from "../../../../../lib/payments/config";
import { getPaymentIdempotencyRecord } from "../../../../../lib/payments/idempotencyStore";
import { logPaymentEvent } from "../../../../../lib/payments/logging";
import { recordRuntimeMetricEvent } from "../../../../../lib/payments/metrics/runtime";
import {
  applyWiseProviderStatusToIntent,
  createOrLoadWiseTransferIntent,
  isWiseWebhookConfigured,
  pollWiseIntentUntilTerminal,
  transitionWiseIntentAccepted,
  transitionWiseIntentFailedAtRequest,
  transitionWiseIntentRequested,
} from "../../../../../lib/payments/wiseTransferService";
import { mapWiseProviderError } from "../../../../../lib/payments/wiseErrors";
import { markWiseTransferAccepted, markWiseTransferTerminal } from "../../../../../lib/payments/wiseOrderLifecycle";
import { type WiseTransferIntentState } from "../../../../../lib/payments/wiseTransferIntentStore";

function isAuditOrder(orderId: string) {
  return process.env.NODE_ENV !== "production" && orderId.startsWith("ORD-AUDIT-");
}

function buildAuditOrder(orderId: string): OrderRecord {
  const now = new Date().toISOString();
  return {
    orderId,
    createdAt: now,
    buyerEmail: "audit-buyer@redacted.local",
    shippingAddress: {
      line1: "Redacted",
      city: "Redacted",
      state: "Redacted",
      postcode: "0000",
      country: "AU",
    },
    items: [
      {
        productSlug: "freight-audit-item",
        name: "Freight Audit Fixture",
        qty: 1,
        price: 100,
        supplierId: "SUP-AUDIT",
      },
    ],
    supplierIds: ["SUP-AUDIT"],
    total: 100,
    status: "PROCESSING",
    currency: "aud",
    escrowStatus: "HELD",
    timeline: [
      {
        status: "PROCESSING",
        timestamp: now,
        note: "Deterministic freight audit fixture created",
      },
    ],
  };
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function computeDurationMs(startedAtMs: number) {
  const elapsed = Date.now() - startedAtMs;
  return elapsed >= 0 ? elapsed : 0;
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

function resolveWiseConflictClass(mode: string) {
  if (mode === "existing_failed") return "FAILED_CONFLICT";
  if (mode === "existing_in_progress" || mode === "existing_active") return "IN_PROGRESS";
  return "SUCCEEDED_REPLAY";
}

async function emitWiseIdempotencyLatencyMetric(input: {
  enabled: boolean;
  orderId: string;
  idempotencyKey?: string | null;
  outcome?: string | null;
}) {
  if (!input.enabled) return;
  const key = String(input.idempotencyKey || "").trim();
  if (!key) return;

  try {
    const record = await getPaymentIdempotencyRecord({
      provider: "wise",
      scope: "WISE_TRANSFER_CREATE",
      key,
    });
    if (!record) return;

    const start = Date.parse(String(record.createdAt || ""));
    const end = Date.parse(String(record.updatedAt || ""));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;

    emitMetricsEvent(
      input.enabled,
      "payments_metrics_provider_latency",
      {
        provider: "wise",
        endpointClass: "wise.transfer_create",
        scope: "WISE_TRANSFER_CREATE",
        outcome: String(input.outcome || record.status || "observed"),
        orderId: input.orderId,
        idempotencyKey: key,
        durationMs: end - start,
      },
      "info"
    );
  } catch {
    // Best-effort instrumentation only.
  }
}

function dispatchEscrowEligibleAudit(input: {
  order: OrderRecord;
  orderId: string;
  tenantId: string | null;
  supplierId: string | null;
  actorId: string;
}) {
  dispatchFreightAuditLifecycleHook({
    source: "api.settlements.wise.create-transfer",
    triggerEvent: "ESCROW_ELIGIBLE",
    orderId: input.orderId,
    tenantId: input.tenantId,
    supplierId: input.supplierId,
    createdByRole: "admin",
    createdById: input.actorId,
    closedByRole: "admin",
    closedById: input.actorId,
    context: {
      source: "api.settlements.wise.create-transfer",
      phase: "settlement_initiated",
      orderId: input.orderId,
      orderStatus: input.order.status,
      escrowStatus: input.order.escrowStatus || null,
      total: input.order.total,
      currency: input.order.currency || "aud",
      availableEvidenceCodes: ["ESCROW_GATE_DECISION_RECORD", "DELIVERY_CONFIRMATION_EVENT"],
    },
  });
}

function dispatchPayoutReadyAudit(input: {
  order: OrderRecord;
  orderId: string;
  tenantId: string | null;
  supplierId: string | null;
  actorId: string;
  settlementMode: string;
  transferId?: string | null;
}) {
  dispatchFreightAuditLifecycleHook({
    source: "api.settlements.wise.create-transfer",
    triggerEvent: "PAYOUT_READY",
    orderId: input.orderId,
    tenantId: input.tenantId,
    supplierId: input.supplierId,
    createdByRole: "admin",
    createdById: input.actorId,
    closedByRole: "admin",
    closedById: input.actorId,
    context: {
      source: "api.settlements.wise.create-transfer",
      phase: "payout_ready",
      settlementMode: input.settlementMode,
      orderId: input.orderId,
      transferId: input.transferId || null,
      orderStatus: input.order.status,
      escrowStatus: input.order.escrowStatus || null,
      availableEvidenceCodes: [
        "WEBHOOK_SIGNATURE_LOG",
        "EVIDENCE_HASH_RECORD",
        "TIMELINE_REPLAY_EXPORT",
        "EVIDENCE_PACK_MANIFEST",
      ],
    },
  });
}

function emitSettlementAuthorityObservation(input: {
  tenantId: string | null;
  orderId: string;
  requestActorId: string;
  requestActorRole: string;
  observedDecision: "WOULD_ALLOW" | "WOULD_DENY";
  reasonCodes: string[];
  metadata?: Record<string, unknown>;
}) {
  emitAuthorityObserveDecision({
    tenantId: input.tenantId,
    policyId: "gov04.authority.settlement.transfer.observe.v1",
    subjectActorId: input.orderId || "unknown_order",
    requestActorId: input.requestActorId || "unknown_request_actor",
    requestActorRole: input.requestActorRole,
    resource: "settlement.wise_transfer",
    action: "create",
    observedDecision: input.observedDecision,
    reasonCodes: input.reasonCodes,
    metadata: {
      route: "api.settlements.wise.create-transfer",
      ...(input.metadata || {}),
    },
  });
}

async function runLegacyWiseSettlement(input: {
  orderId: string;
  idx: number;
  orders: OrderRecord[];
  adminActorId: string;
  tenantId: string | null;
  primarySupplierId: string | null;
  metricsEnabled: boolean;
}) {
  const startedAtMs = Date.now();
  const apiKey = process.env.WISE_SANDBOX_API_KEY;
  const profileId = process.env.WISE_SANDBOX_PROFILE_ID;
  const useDeterministicSandbox = process.env.NODE_ENV !== "production" && (!apiKey || !profileId);
  if (!useDeterministicSandbox && (!apiKey || !profileId)) {
    throw new Error("WISE_SANDBOX_NOT_CONFIGURED");
  }

  if (useDeterministicSandbox) {
    const transferId = `sandbox-${input.orderId.toLowerCase()}`;
    input.orders[input.idx] = markSettled(input.orders[input.idx], transferId);
    writeStore("orders" as any, input.orders as any);
    recordAudit("ADMIN_SETTLEMENT_COMPLETED", { orderId: input.orderId, transferId });
    dispatchPayoutReadyAudit({
      order: input.orders[input.idx],
      orderId: input.orderId,
      tenantId: input.tenantId,
      supplierId: input.primarySupplierId,
      actorId: input.adminActorId,
      settlementMode: "deterministic-sandbox",
      transferId,
    });

    const latestTimelineEvent = input.orders[input.idx].timeline?.[input.orders[input.idx].timeline.length - 1];
    emitMetricsEvent(
      input.metricsEnabled,
      "payments_metrics_provider_latency",
      {
        provider: "wise",
        endpointClass: "wise.transfer_create",
        scope: "WISE_TRANSFER_CREATE",
        outcome: "SUCCEEDED",
        orderId: input.orderId,
        durationMs: computeDurationMs(startedAtMs),
      },
      "info"
    );
    return {
      ok: true,
      transferId,
      settlementMode: "deterministic-sandbox",
      orderId: input.orderId,
      orderStatus: input.orders[input.idx].status,
      escrowStatus: input.orders[input.idx].escrowStatus,
      timelineLatestStatus: latestTimelineEvent?.status ?? null,
    };
  }

  const transferRes = await fetch("https://api.sandbox.transferwise.tech/v1/transfers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-idempotence-uuid": crypto.randomUUID(),
    },
    body: JSON.stringify({
      targetAccount: "sandbox-recipient",
      quoteUuid: "sandbox-quote",
      customerTransactionId: input.orderId,
      details: { reference: `Order ${input.orderId}` },
    }),
  });

  if (!transferRes.ok) {
    const err = await transferRes.text();
    console.error("Wise transfer error", err);
    emitMetricsEvent(
      input.metricsEnabled,
      "payments_metrics_provider_latency",
      {
        provider: "wise",
        endpointClass: "wise.transfer_create",
        scope: "WISE_TRANSFER_CREATE",
        outcome: "FAILED",
        orderId: input.orderId,
        durationMs: computeDurationMs(startedAtMs),
      },
      "info"
    );
    throw new Error("WISE_TRANSFER_FAILED");
  }

  const transfer = (await transferRes.json()) as { id?: string };
  input.orders[input.idx] = markSettled(input.orders[input.idx], transfer.id);
  writeStore("orders" as any, input.orders as any);
  recordAudit("ADMIN_SETTLEMENT_COMPLETED", { orderId: input.orderId, transferId: transfer.id });
  dispatchPayoutReadyAudit({
    order: input.orders[input.idx],
    orderId: input.orderId,
    tenantId: input.tenantId,
    supplierId: input.primarySupplierId,
    actorId: input.adminActorId,
    settlementMode: "wise-sandbox",
    transferId: transfer.id || null,
  });

  const latestTimelineEvent = input.orders[input.idx].timeline?.[input.orders[input.idx].timeline.length - 1];
  emitMetricsEvent(
    input.metricsEnabled,
    "payments_metrics_provider_latency",
    {
      provider: "wise",
      endpointClass: "wise.transfer_create",
      scope: "WISE_TRANSFER_CREATE",
      outcome: "SUCCEEDED",
      orderId: input.orderId,
      durationMs: computeDurationMs(startedAtMs),
    },
    "info"
  );
  return {
    ok: true,
    transferId: transfer.id,
    settlementMode: "wise-sandbox",
    orderId: input.orderId,
    orderStatus: input.orders[input.idx].status,
    escrowStatus: input.orders[input.idx].escrowStatus,
    timelineLatestStatus: latestTimelineEvent?.status ?? null,
  };
}

function terminalStateToReason(state: WiseTransferIntentState, fallback?: string | null) {
  if (fallback) return fallback;
  if (state === "FAILED") return "WISE_PROVIDER_FAILED";
  if (state === "CANCELLED") return "WISE_PROVIDER_CANCELLED";
  if (state === "TIMED_OUT") return "WISE_PROVIDER_TIMEOUT";
  return "WISE_PROVIDER_TERMINAL";
}

async function runHardenedWiseSettlement(input: {
  orderId: string;
  order: OrderRecord;
  adminActorId: string;
  tenantId: string | null;
  primarySupplierId: string | null;
  adminSettlementOverride: boolean;
  metricsEnabled: boolean;
}) {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  const wiseConfig = runtimeConfig.wise;
  const hasWiseCredentials = Boolean(wiseConfig?.apiKey && wiseConfig?.profileId);
  const useDeterministicSandbox = process.env.NODE_ENV !== "production" && !hasWiseCredentials;

  if (!useDeterministicSandbox && !hasWiseCredentials) {
    throw new Error("WISE_SANDBOX_NOT_CONFIGURED");
  }

  const maxPollAttempts = parsePositiveInt(process.env.WISE_HARDENED_MAX_POLL_ATTEMPTS, 3);
  const pollIntervalMs = parsePositiveInt(process.env.WISE_HARDENED_POLL_INTERVAL_MS, 750);

  const intentResolution = await createOrLoadWiseTransferIntent({
    orderId: input.orderId,
    tenantId: input.tenantId,
    wiseProfileId: wiseConfig?.profileId || "sandbox-profile",
    destinationType: "supplier_payout",
    createdByRole: "admin",
    createdById: input.adminActorId,
    maxPollAttempts,
    allowRetryBlockedOverride: input.adminSettlementOverride,
  });

  if (intentResolution.mode !== "created") {
    emitMetricsEvent(
      input.metricsEnabled,
      "payments_metrics_idempotency_conflict",
      {
        provider: "wise",
        scope: "WISE_TRANSFER_CREATE",
        conflictClass: resolveWiseConflictClass(intentResolution.mode),
        orderId: input.orderId,
        idempotencyKey: intentResolution.idempotencyKey,
      },
      intentResolution.mode === "existing_failed" ? "warn" : "info"
    );
  }

  if (intentResolution.mode === "existing_failed") {
    await emitWiseIdempotencyLatencyMetric({
      enabled: input.metricsEnabled,
      orderId: input.orderId,
      idempotencyKey: intentResolution.idempotencyKey,
      outcome: "FAILED",
    });
    throw new Error("WISE_TRANSFER_INTENT_PREVIOUS_FAILURE");
  }

  if (intentResolution.mode === "existing_in_progress") {
    await emitWiseIdempotencyLatencyMetric({
      enabled: input.metricsEnabled,
      orderId: input.orderId,
      idempotencyKey: intentResolution.idempotencyKey,
      outcome: "IN_PROGRESS",
    });
    return {
      ok: true,
      orderId: input.orderId,
      settlementMode: "wise-hardened",
      state: "REQUESTED",
      pendingProviderConfirmation: true,
      idempotencyKey: intentResolution.idempotencyKey,
    };
  }

  if (!intentResolution.intent) {
    throw new Error("WISE_TRANSFER_INTENT_UNAVAILABLE");
  }

  let intent = intentResolution.intent;

  if (intent.state === "COMPLETED") {
    const currentOrder = markWiseTransferTerminal(
      input.orderId,
      "COMPLETED",
      intent.transferId,
      terminalStateToReason(intent.state, intent.lastErrorCode)
    );
    if (currentOrder) {
      dispatchPayoutReadyAudit({
        order: currentOrder,
        orderId: input.orderId,
        tenantId: input.tenantId,
        supplierId: input.primarySupplierId,
        actorId: input.adminActorId,
        settlementMode: "wise-hardened",
        transferId: intent.transferId,
      });
    }

    await emitWiseIdempotencyLatencyMetric({
      enabled: input.metricsEnabled,
      orderId: input.orderId,
      idempotencyKey: intent.idempotencyKey,
      outcome: "SUCCEEDED",
    });

    return {
      ok: true,
      orderId: input.orderId,
      settlementMode: "wise-hardened",
      state: intent.state,
      transferId: intent.transferId,
      replayed: true,
      pendingProviderConfirmation: false,
      intentId: intent.intentId,
      idempotencyKey: intent.idempotencyKey,
      autoRetryBlocked: intent.autoRetryBlocked,
    };
  }

  if (intent.state === "TIMED_OUT" && intent.autoRetryBlocked && !input.adminSettlementOverride) {
    throw new Error("WISE_AUTO_RETRY_BLOCKED_MANUAL_OVERRIDE_REQUIRED");
  }

  if (intent.state === "INTENT_CREATED") {
    intent = await transitionWiseIntentRequested(intent);
  }

  if (!intent.transferId && (intent.state === "REQUESTED" || intent.state === "INTENT_CREATED")) {
    if (useDeterministicSandbox) {
      const transferId = `sandbox-${input.orderId.toLowerCase()}-${intent.attemptNumber}`;
      intent = await transitionWiseIntentAccepted({
        intent,
        transferId,
        providerStatus: "incoming_payment_waiting",
        payload: {
          transferId,
          status: "incoming_payment_waiting",
          mode: "deterministic-sandbox",
          intentId: intent.intentId,
        },
      });
    } else {
      const transferRequestPayload = {
        targetAccount: "sandbox-recipient",
        quoteUuid: "sandbox-quote",
        customerTransactionId: input.orderId,
        details: { reference: `Order ${input.orderId}` },
      };

      const transferRes = await fetch("https://api.sandbox.transferwise.tech/v1/transfers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${wiseConfig?.apiKey}`,
          "Content-Type": "application/json",
          "X-idempotence-uuid": intent.wiseIdempotenceUuid,
        },
        body: JSON.stringify(transferRequestPayload),
      });

      if (!transferRes.ok) {
        const errBody = await transferRes.text();
        const mapped = mapWiseProviderError(transferRes.status, errBody);

        await transitionWiseIntentFailedAtRequest({
          intent,
          errorCode: mapped.code,
          errorMessage: mapped.message || "Wise transfer request failed",
          providerStatus: `request_failed_${transferRes.status}`,
          payload: {
            httpStatus: transferRes.status,
            errorBody: errBody,
            code: mapped.code,
            transferRequestPayload,
          },
        });

        await emitWiseIdempotencyLatencyMetric({
          enabled: input.metricsEnabled,
          orderId: input.orderId,
          idempotencyKey: intent.idempotencyKey,
          outcome: "FAILED",
        });

        throw new Error(`WISE_TRANSFER_FAILED:${mapped.code}`);
      }

      const transfer = (await transferRes.json()) as { id?: string; status?: string; quoteUuid?: string };
      const transferId = String(transfer.id || "").trim();
      if (!transferId) {
        await transitionWiseIntentFailedAtRequest({
          intent,
          errorCode: "WISE_TRANSFER_ID_MISSING",
          errorMessage: "Wise accepted response missing transfer id",
          providerStatus: "request_failed_missing_transfer_id",
          payload: transfer as any,
        });
        await emitWiseIdempotencyLatencyMetric({
          enabled: input.metricsEnabled,
          orderId: input.orderId,
          idempotencyKey: intent.idempotencyKey,
          outcome: "FAILED",
        });
        throw new Error("WISE_TRANSFER_FAILED:WISE_TRANSFER_ID_MISSING");
      }

      intent = await transitionWiseIntentAccepted({
        intent,
        transferId,
        quoteId: String(transfer.quoteUuid || "").trim() || null,
        providerStatus: String(transfer.status || "accepted"),
        payload: {
          transferId,
          status: transfer.status || "accepted",
          quoteUuid: transfer.quoteUuid || null,
          mode: "wise-sandbox",
          intentId: intent.intentId,
        },
      });
    }

    if (intent.transferId) {
      markWiseTransferAccepted(input.orderId, intent.transferId);
    }
  }

  if (!intent.transferId) {
    throw new Error("WISE_TRANSFER_ID_UNAVAILABLE");
  }

  if (useDeterministicSandbox) {
    const terminalTransition = await applyWiseProviderStatusToIntent({
      transferId: intent.transferId,
      eventType: "transfer.status_simulated",
      providerStatus: "outgoing_payment_sent",
      payload: {
        intentId: intent.intentId,
        transferId: intent.transferId,
        status: "outgoing_payment_sent",
        mode: "deterministic-sandbox",
      },
      occurredAtUnix: Math.floor(Date.now() / 1000),
    });

    const terminalIntent = terminalTransition.intent || intent;
    const completionConfirmed =
      terminalTransition.transitioned &&
      !terminalTransition.duplicate &&
      terminalTransition.transitionState === "COMPLETED" &&
      terminalIntent.state === "COMPLETED";

    if (completionConfirmed) {
      const completed = markWiseTransferTerminal(
        input.orderId,
        "COMPLETED",
        intent.transferId,
        "WISE_DETERMINISTIC_SANDBOX_COMPLETED"
      );
      if (completed) {
        dispatchPayoutReadyAudit({
          order: completed,
          orderId: input.orderId,
          tenantId: input.tenantId,
          supplierId: input.primarySupplierId,
          actorId: input.adminActorId,
          settlementMode: "wise-hardened-deterministic",
          transferId: intent.transferId,
        });
      }

      recordAudit("ADMIN_SETTLEMENT_COMPLETED", {
        orderId: input.orderId,
        transferId: intent.transferId,
        mode: "wise-hardened-deterministic",
      });

      await emitWiseIdempotencyLatencyMetric({
        enabled: input.metricsEnabled,
        orderId: input.orderId,
        idempotencyKey: intent.idempotencyKey,
        outcome: "SUCCEEDED",
      });

      return {
        ok: true,
        orderId: input.orderId,
        settlementMode: "wise-hardened-deterministic",
        state: "COMPLETED",
        transferId: intent.transferId,
        pendingProviderConfirmation: false,
        intentId: intent.intentId,
        idempotencyKey: intent.idempotencyKey,
        autoRetryBlocked: false,
      };
    }

    await emitWiseIdempotencyLatencyMetric({
      enabled: input.metricsEnabled,
      orderId: input.orderId,
      idempotencyKey: terminalIntent.idempotencyKey,
      outcome: terminalIntent.state,
    });

    return {
      ok: true,
      orderId: input.orderId,
      settlementMode: "wise-hardened-deterministic",
      state: terminalIntent.state,
      transferId: terminalIntent.transferId,
      pendingProviderConfirmation: true,
      intentId: terminalIntent.intentId,
      idempotencyKey: terminalIntent.idempotencyKey,
      autoRetryBlocked: terminalIntent.autoRetryBlocked,
    };
  }

  if (isWiseWebhookConfigured()) {
    await emitWiseIdempotencyLatencyMetric({
      enabled: input.metricsEnabled,
      orderId: input.orderId,
      idempotencyKey: intent.idempotencyKey,
      outcome: intent.state,
    });
    return {
      ok: true,
      orderId: input.orderId,
      settlementMode: "wise-hardened-webhook",
      state: intent.state,
      transferId: intent.transferId,
      pendingProviderConfirmation: true,
      intentId: intent.intentId,
      idempotencyKey: intent.idempotencyKey,
      autoRetryBlocked: intent.autoRetryBlocked,
    };
  }

  const pollingResult = await pollWiseIntentUntilTerminal({
    intentId: intent.intentId,
    maxAttempts: maxPollAttempts,
    intervalMs: pollIntervalMs,
  });
  const terminalIntent = pollingResult.intent;

  if (terminalIntent.state === "COMPLETED" && pollingResult.terminalEventId) {
    const completed = markWiseTransferTerminal(
      input.orderId,
      "COMPLETED",
      terminalIntent.transferId,
      terminalStateToReason(terminalIntent.state, terminalIntent.lastErrorCode)
    );
    if (completed) {
      dispatchPayoutReadyAudit({
        order: completed,
        orderId: input.orderId,
        tenantId: input.tenantId,
        supplierId: input.primarySupplierId,
        actorId: input.adminActorId,
        settlementMode: "wise-hardened-polling",
        transferId: terminalIntent.transferId,
      });
    }

    recordAudit("ADMIN_SETTLEMENT_COMPLETED", {
      orderId: input.orderId,
      transferId: terminalIntent.transferId,
      mode: "wise-hardened-polling",
    });

    await emitWiseIdempotencyLatencyMetric({
      enabled: input.metricsEnabled,
      orderId: input.orderId,
      idempotencyKey: terminalIntent.idempotencyKey,
      outcome: "SUCCEEDED",
    });

    return {
      ok: true,
      orderId: input.orderId,
      settlementMode: "wise-hardened-polling",
      state: terminalIntent.state,
      transferId: terminalIntent.transferId,
      pendingProviderConfirmation: false,
      intentId: terminalIntent.intentId,
      idempotencyKey: terminalIntent.idempotencyKey,
      autoRetryBlocked: terminalIntent.autoRetryBlocked,
    };
  }

  if (
    pollingResult.terminalEventId &&
    (terminalIntent.state === "FAILED" || terminalIntent.state === "CANCELLED" || terminalIntent.state === "TIMED_OUT")
  ) {
    markWiseTransferTerminal(
      input.orderId,
      terminalIntent.state,
      terminalIntent.transferId,
      terminalStateToReason(terminalIntent.state, terminalIntent.lastErrorCode)
    );
  }

  await emitWiseIdempotencyLatencyMetric({
    enabled: input.metricsEnabled,
    orderId: input.orderId,
    idempotencyKey: terminalIntent.idempotencyKey,
    outcome: terminalIntent.state,
  });

  return {
    ok: true,
    orderId: input.orderId,
    settlementMode: "wise-hardened-polling",
    state: terminalIntent.state,
    transferId: terminalIntent.transferId,
    pendingProviderConfirmation:
      terminalIntent.state === "INTENT_CREATED" ||
      terminalIntent.state === "REQUESTED" ||
      terminalIntent.state === "ACCEPTED",
    intentId: terminalIntent.intentId,
    idempotencyKey: terminalIntent.idempotencyKey,
    autoRetryBlocked: terminalIntent.autoRetryBlocked,
  };
}

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    emitSettlementAuthorityObservation({
      tenantId: null,
      orderId: "unknown_order",
      requestActorId: "anonymous",
      requestActorRole: "system",
      observedDecision: "WOULD_DENY",
      reasonCodes: ["ADMIN_REQUIRED"],
      metadata: {
        status: "unauthorized",
      },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as { orderId?: string; tenantId?: string };
  const orderId = String(payload.orderId || "").trim();
  if (!orderId) {
    emitSettlementAuthorityObservation({
      tenantId: null,
      orderId: "unknown_order",
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      observedDecision: "WOULD_DENY",
      reasonCodes: ["ORDER_ID_REQUIRED"],
      metadata: {
        status: "invalid_payload",
      },
    });
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }
  const tenantId = String(payload.tenantId || "").trim() || null;

  const orders = getOrders();
  let idx = orders.findIndex((o) => o.orderId === orderId);
  if (idx === -1 && isAuditOrder(orderId)) {
    orders.push(buildAuditOrder(orderId));
    idx = orders.length - 1;
    writeStore("orders" as any, orders as any);
  }
  if (idx === -1) {
    emitSettlementAuthorityObservation({
      tenantId,
      orderId,
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      observedDecision: "WOULD_DENY",
      reasonCodes: ["ORDER_NOT_FOUND"],
      metadata: {
        status: "order_not_found",
      },
    });
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const adminFlags = getAdminFlags();
  const order = orders[idx];
  if (!canSettle(order, adminFlags.settlementOverride === true) || order.escrowStatus !== "HELD") {
    emitSettlementAuthorityObservation({
      tenantId,
      orderId,
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      observedDecision: "WOULD_DENY",
      reasonCodes: ["SETTLEMENT_NOT_ELIGIBLE"],
      metadata: {
        status: "not_eligible",
        orderStatus: order.status,
        escrowStatus: order.escrowStatus || null,
      },
    });
    return NextResponse.json({ error: "Not eligible for settlement" }, { status: 400 });
  }

  orders[idx] = markSettlementInitiated(order);
  writeStore("orders" as any, orders as any);
  recordAudit("ADMIN_SETTLEMENT_INITIATED", { orderId });

  const primarySupplierId = orders[idx].items.find((item) => !!item.supplierId)?.supplierId || null;
  dispatchEscrowEligibleAudit({
    order: orders[idx],
    orderId,
    tenantId,
    supplierId: primarySupplierId,
    actorId: admin.actorId,
  });

  const runtimeConfig = resolvePaymentsRuntimeConfig();
  const wiseHardenedEnabled = runtimeConfig.flags.wiseHardenedFlowEnabled;
  const metricsEnabled = runtimeConfig.flags.metricsEnabled;

  try {
    const guarded = await executePayoutWithSoftEnforcement({
      source: "api.settlements.wise.create-transfer",
      tenantId,
      orderId,
      supplierId: primarySupplierId,
      actorId: admin.actorId,
      actorRole: "admin",
      context: {
        source: "api.settlements.wise.create-transfer",
        phase: "payout_ready_guard",
        settlementMode: wiseHardenedEnabled ? "wise-hardened" : "wise-sandbox",
        orderId,
        orderStatus: orders[idx].status,
        escrowStatus: orders[idx].escrowStatus || null,
        availableEvidenceCodes: [
          "WEBHOOK_SIGNATURE_LOG",
          "EVIDENCE_HASH_RECORD",
          "TIMELINE_REPLAY_EXPORT",
          "EVIDENCE_PACK_MANIFEST",
        ],
      },
      executePayout: async () => {
        if (!wiseHardenedEnabled) {
          return runLegacyWiseSettlement({
            orderId,
            idx,
            orders,
            adminActorId: admin.actorId,
            tenantId,
            primarySupplierId,
            metricsEnabled,
          });
        }

        return runHardenedWiseSettlement({
          orderId,
          order: orders[idx],
          adminActorId: admin.actorId,
          tenantId,
          primarySupplierId,
          adminSettlementOverride: adminFlags.settlementOverride === true,
          metricsEnabled,
        });
      },
    });

    if (guarded.status === "REVIEW_REQUIRED") {
      emitSettlementAuthorityObservation({
        tenantId,
        orderId,
        requestActorId: admin.actorId,
        requestActorRole: admin.actorRole,
        observedDecision: "WOULD_DENY",
        reasonCodes: ["SOFT_ENFORCEMENT_REVIEW_REQUIRED"],
        metadata: {
          status: "review_required",
          holdId: guarded.hold.holdId,
          blockingFailures: guarded.hold.blockingFailures,
          criticalFailures: guarded.hold.criticalFailures,
        },
      });
      return NextResponse.json(
        {
          status: "REVIEW_REQUIRED",
          holdId: guarded.hold.holdId,
          orderId,
          hold: {
            holdId: guarded.hold.holdId,
            status: guarded.hold.status,
            reasonCode: guarded.hold.reasonCode,
            blockingFailures: guarded.hold.blockingFailures,
            criticalFailures: guarded.hold.criticalFailures,
            createdAtUtc: guarded.hold.createdAtUtc,
          },
        },
        { status: 202 }
      );
    }

    emitSettlementAuthorityObservation({
      tenantId,
      orderId,
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      observedDecision: "WOULD_ALLOW",
      reasonCodes: ["SETTLEMENT_TRANSFER_EXECUTED"],
      metadata: {
        status: "payout_attempt_executed",
        settlementMode: (guarded.result as any)?.settlementMode || null,
        transferId: (guarded.result as any)?.transferId || null,
        pendingProviderConfirmation: Boolean((guarded.result as any)?.pendingProviderConfirmation),
      },
    });
    return NextResponse.json(guarded.result);
  } catch (e: any) {
    const code = String(e?.message || "");

    emitSettlementAuthorityObservation({
      tenantId,
      orderId,
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      observedDecision: "WOULD_DENY",
      reasonCodes: [code || "WISE_TRANSFER_EXCEPTION"],
      metadata: {
        status: "exception",
        wiseHardenedEnabled,
      },
    });

    if (!wiseHardenedEnabled) {
      if (code === "WISE_SANDBOX_NOT_CONFIGURED") {
        return NextResponse.json({ error: "Wise sandbox not configured" }, { status: 500 });
      }
      if (code === "WISE_TRANSFER_FAILED") {
        return NextResponse.json({ error: "Wise transfer failed" }, { status: 502 });
      }
      console.error("Wise transfer exception", e);
      return NextResponse.json({ error: e?.message || "Wise error" }, { status: 500 });
    }

    if (code === "WISE_SANDBOX_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Wise sandbox not configured" }, { status: 500 });
    }

    if (code === "WISE_AUTO_RETRY_BLOCKED_MANUAL_OVERRIDE_REQUIRED") {
      return NextResponse.json(
        {
          error: "Wise transfer retry is blocked after timeout; manual override required",
          code,
        },
        { status: 409 }
      );
    }

    if (code.startsWith("WISE_TRANSFER_FAILED:")) {
      return NextResponse.json({ error: "Wise transfer failed", code }, { status: 502 });
    }

    if (code === "WISE_TRANSFER_INTENT_PREVIOUS_FAILURE") {
      return NextResponse.json({ error: "Previous transfer intent failed", code }, { status: 409 });
    }

    if (code === "WISE_TRANSFER_ID_UNAVAILABLE") {
      return NextResponse.json({ error: "Wise transfer id unavailable", code }, { status: 502 });
    }

    console.error("Wise transfer exception", e);
    return NextResponse.json({ error: e?.message || "Wise error" }, { status: 500 });
  }
}
