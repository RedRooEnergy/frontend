import crypto from "crypto";
import {
  acquirePaymentIdempotencyLock,
  buildScopedPaymentIdempotencyKey,
  getPaymentIdempotencyRecord,
  markPaymentIdempotencyResult,
} from "./idempotencyStore";
import { appendPaymentProviderEvent, updatePaymentProviderEventStatus } from "./providerEventStore";
import { resolvePaymentsRuntimeConfig } from "./config";
import { sha256Hex, stableStringify } from "./pricingSnapshot";
import { deriveWiseProviderEventId } from "./wiseEvents";
import { buildWiseTransferReferenceId, uuidV5 } from "./wiseIdentity";
import {
  createWiseTransferIntent,
  getLatestWiseTransferIntentForOrder,
  getWiseTransferIntentByIdempotencyKey,
  getWiseTransferIntentByIntentId,
  getWiseTransferIntentByTransferId,
  transitionWiseTransferIntent,
  type WiseTransferIntentRecord,
  type WiseTransferIntentState,
} from "./wiseTransferIntentStore";
import { mapWiseProviderError } from "./wiseErrors";

export const WISE_TRANSFER_TERMINAL_STATES: WiseTransferIntentState[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
];

export type WiseTransferEventSource = "CREATE_INTENT" | "CREATE_TRANSFER" | "WEBHOOK" | "POLL" | "SYSTEM";

export function isWiseTerminalState(state: WiseTransferIntentState) {
  return WISE_TRANSFER_TERMINAL_STATES.includes(state);
}

export function isWiseWebhookConfigured(env: NodeJS.ProcessEnv = process.env) {
  const token = String(env.WISE_WEBHOOK_TOKEN || "").trim();
  const hmacSecret = String(env.WISE_WEBHOOK_HMAC_SECRET || "").trim();
  return token.length > 0 || hmacSecret.length > 0;
}

function normalizeProviderStatus(status: string) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_");
}

export function resolveWiseTransferStateFromProviderStatus(status: string): {
  terminalState: WiseTransferIntentState | null;
  normalizedStatus: string;
} {
  const normalizedStatus = normalizeProviderStatus(status);

  const completedStatuses = new Set([
    "outgoing_payment_sent",
    "completed",
    "sent",
    "funds_sent",
    "paid",
    "payment_sent",
  ]);
  const failedStatuses = new Set(["failed", "rejected", "error", "chargeback", "reversed"]);
  const cancelledStatuses = new Set(["cancelled", "canceled"]);

  if (completedStatuses.has(normalizedStatus)) {
    return { terminalState: "COMPLETED", normalizedStatus };
  }
  if (failedStatuses.has(normalizedStatus)) {
    return { terminalState: "FAILED", normalizedStatus };
  }
  if (cancelledStatuses.has(normalizedStatus)) {
    return { terminalState: "CANCELLED", normalizedStatus };
  }

  return {
    terminalState: null,
    normalizedStatus,
  };
}

function makeIntentId(now: Date) {
  const randomSegment = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `wise-intent-${now.toISOString().replace(/[-:.TZ]/g, "")}-${randomSegment}`;
}

function parseAttemptNumber(releaseAttemptId: string) {
  const match = String(releaseAttemptId || "").match(/^attempt-(\d+)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function deriveNextReleaseAttemptId(latest: WiseTransferIntentRecord | null) {
  if (!latest) return "attempt-1";

  const parsed = parseAttemptNumber(latest.releaseAttemptId);
  if (parsed) return `attempt-${parsed + 1}`;
  return `attempt-${(latest.attemptNumber || 0) + 1}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function appendWiseProviderEventAndMarkProcessed(input: {
  eventType: string;
  status: string;
  orderId: string;
  transferId?: string | null;
  incomingEventId?: string | null;
  occurredAtUnix?: number | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const payloadHashSha256 = sha256Hex(stableStringify(input.payload));
  const eventId = deriveWiseProviderEventId({
    incomingEventId: input.incomingEventId || null,
    transferId: input.transferId || null,
    eventType: input.eventType,
    status: input.status,
    occurredAtUnix: input.occurredAtUnix ?? null,
    payloadHashSha256,
  });

  const appended = await appendPaymentProviderEvent({
    provider: "wise",
    eventId,
    eventType: input.eventType,
    orderId: input.orderId,
    transferId: input.transferId || null,
    occurredAt: input.occurredAtUnix ? new Date(input.occurredAtUnix * 1000).toISOString() : null,
    payloadHashSha256,
    payload: input.payload,
  });

  if (!appended.created) {
    return {
      created: false,
      eventId,
      event: appended.event,
    };
  }

  await updatePaymentProviderEventStatus({
    provider: "wise",
    eventId,
    status: "PROCESSED",
    metadata: {
      status: input.status,
      ...(input.metadata || {}),
    },
  });

  return {
    created: true,
    eventId,
    event: appended.event,
  };
}

export async function createOrLoadWiseTransferIntent(input: {
  orderId: string;
  tenantId?: string | null;
  wiseProfileId: string;
  destinationType: string;
  createdById: string;
  createdByRole: "admin" | "system";
  maxPollAttempts: number;
  releaseAttemptId?: string | null;
  allowRetryBlockedOverride: boolean;
}) {
  const latestIntent = await getLatestWiseTransferIntentForOrder(input.orderId);

  if (latestIntent && latestIntent.autoRetryBlocked && !input.allowRetryBlockedOverride) {
    throw new Error("WISE_AUTO_RETRY_BLOCKED_MANUAL_OVERRIDE_REQUIRED");
  }

  const activeStates: WiseTransferIntentState[] = ["INTENT_CREATED", "REQUESTED", "ACCEPTED"];
  if (latestIntent && activeStates.includes(latestIntent.state)) {
    return {
      mode: "existing_active" as const,
      intent: latestIntent,
      idempotencyKey: latestIntent.idempotencyKey,
      wiseIdempotenceUuid: latestIntent.wiseIdempotenceUuid,
    };
  }

  if (latestIntent && latestIntent.state === "COMPLETED") {
    return {
      mode: "existing_completed" as const,
      intent: latestIntent,
      idempotencyKey: latestIntent.idempotencyKey,
      wiseIdempotenceUuid: latestIntent.wiseIdempotenceUuid,
    };
  }

  const releaseAttemptId = String(input.releaseAttemptId || "").trim() || deriveNextReleaseAttemptId(latestIntent);
  const attemptNumber = parseAttemptNumber(releaseAttemptId) || (latestIntent?.attemptNumber || 0) + 1;

  const referenceId = buildWiseTransferReferenceId({
    releaseAttemptId,
    wiseProfileId: input.wiseProfileId,
    destinationType: input.destinationType,
  });

  const idempotencyKey = buildScopedPaymentIdempotencyKey({
    provider: "wise",
    scope: "WISE_TRANSFER_CREATE",
    tenantId: input.tenantId || "",
    orderId: input.orderId,
    operation: "create_transfer_intent",
    referenceId,
    attemptClass: "phase3_v1",
  });

  const wiseIdempotenceUuid = uuidV5(idempotencyKey);

  const requestHash = sha256Hex(
    stableStringify({
      orderId: input.orderId,
      tenantId: input.tenantId || null,
      releaseAttemptId,
      wiseProfileId: input.wiseProfileId,
      destinationType: input.destinationType,
      maxPollAttempts: input.maxPollAttempts,
    })
  );

  const lock = await acquirePaymentIdempotencyLock({
    provider: "wise",
    scope: "WISE_TRANSFER_CREATE",
    key: idempotencyKey,
    operation: "create_transfer_intent",
    requestHashSha256: requestHash,
    tenantId: input.tenantId || null,
    orderId: input.orderId,
    referenceId,
    metadata: {
      releaseAttemptId,
      destinationType: input.destinationType,
      wiseProfileId: input.wiseProfileId,
      wiseIdempotenceUuid,
    },
  });

  if (!lock.acquired) {
    const existing = await getWiseTransferIntentByIdempotencyKey(idempotencyKey);
    if (existing) {
      return {
        mode: "existing_by_idempotency" as const,
        intent: existing,
        idempotencyKey,
        wiseIdempotenceUuid,
      };
    }

    const idempotencyRecord = await getPaymentIdempotencyRecord({
      provider: "wise",
      scope: "WISE_TRANSFER_CREATE",
      key: idempotencyKey,
    });

    if (idempotencyRecord?.status === "FAILED") {
      return {
        mode: "existing_failed" as const,
        intent: null,
        idempotencyKey,
        wiseIdempotenceUuid,
      };
    }

    return {
      mode: "existing_in_progress" as const,
      intent: null,
      idempotencyKey,
      wiseIdempotenceUuid,
    };
  }

  const now = new Date();
  const createdIntent = await createWiseTransferIntent({
    intentId: makeIntentId(now),
    tenantId: input.tenantId || null,
    orderId: input.orderId,
    releaseAttemptId,
    attemptNumber,
    destinationType: input.destinationType,
    wiseProfileId: input.wiseProfileId,
    idempotencyKey,
    wiseIdempotenceUuid,
    transferId: null,
    quoteId: null,
    providerStatus: "intent_created",
    providerStatusAtUtc: now.toISOString(),
    lastErrorCode: null,
    lastErrorMessage: null,
    maxPollAttempts: Math.max(1, input.maxPollAttempts),
    createdByRole: input.createdByRole,
    createdById: input.createdById,
  });

  await appendWiseProviderEventAndMarkProcessed({
    eventType: "transfer.intent_created",
    status: "intent_created",
    orderId: input.orderId,
    transferId: null,
    payload: {
      intentId: createdIntent.intentId,
      orderId: input.orderId,
      releaseAttemptId,
      idempotencyKey,
      wiseIdempotenceUuid,
    },
    metadata: {
      lifecycleState: "INTENT_CREATED",
    },
  });

  return {
    mode: "created" as const,
    intent: createdIntent,
    idempotencyKey,
    wiseIdempotenceUuid,
  };
}

export async function transitionWiseIntentRequested(intent: WiseTransferIntentRecord) {
  const event = await appendWiseProviderEventAndMarkProcessed({
    eventType: "transfer.requested",
    status: "requested",
    orderId: intent.orderId,
    transferId: intent.transferId || null,
    payload: {
      intentId: intent.intentId,
      orderId: intent.orderId,
      state: "REQUESTED",
    },
    metadata: {
      lifecycleState: "REQUESTED",
    },
  });

  if (!event.created) {
    const current = await getWiseTransferIntentByIntentId(intent.intentId);
    if (!current) throw new Error("WISE_TRANSFER_INTENT_NOT_FOUND");
    return current;
  }

  return transitionWiseTransferIntent({
    intentId: intent.intentId,
    toState: "REQUESTED",
    providerStatus: "requested",
  });
}

export async function transitionWiseIntentAccepted(input: {
  intent: WiseTransferIntentRecord;
  transferId: string;
  quoteId?: string | null;
  providerStatus: string;
  payload: Record<string, unknown>;
}) {
  const event = await appendWiseProviderEventAndMarkProcessed({
    eventType: "transfer.accepted",
    status: input.providerStatus,
    orderId: input.intent.orderId,
    transferId: input.transferId,
    payload: input.payload,
    metadata: {
      lifecycleState: "ACCEPTED",
      transferId: input.transferId,
    },
  });

  if (!event.created) {
    const current = await getWiseTransferIntentByIntentId(input.intent.intentId);
    if (!current) throw new Error("WISE_TRANSFER_INTENT_NOT_FOUND");
    return current;
  }

  const updatedIntent = await transitionWiseTransferIntent({
    intentId: input.intent.intentId,
    toState: "ACCEPTED",
    transferId: input.transferId,
    quoteId: input.quoteId || null,
    providerStatus: input.providerStatus,
    providerStatusAtUtc: new Date().toISOString(),
  });

  await markPaymentIdempotencyResult({
    provider: "wise",
    scope: "WISE_TRANSFER_CREATE",
    key: input.intent.idempotencyKey,
    status: "SUCCEEDED",
    responseHashSha256: sha256Hex(stableStringify(input.payload)),
    metadata: {
      transferId: input.transferId,
      providerStatus: input.providerStatus,
      intentId: input.intent.intentId,
    },
  });

  return updatedIntent;
}

export async function transitionWiseIntentFailedAtRequest(input: {
  intent: WiseTransferIntentRecord;
  errorCode: string;
  errorMessage: string;
  providerStatus?: string;
  payload: Record<string, unknown>;
}) {
  await appendWiseProviderEventAndMarkProcessed({
    eventType: "transfer.request_failed",
    status: input.providerStatus || "failed",
    orderId: input.intent.orderId,
    transferId: input.intent.transferId || null,
    payload: input.payload,
    metadata: {
      lifecycleState: "FAILED",
      errorCode: input.errorCode,
    },
  });

  const updatedIntent = await transitionWiseTransferIntent({
    intentId: input.intent.intentId,
    toState: "FAILED",
    providerStatus: input.providerStatus || "failed",
    lastErrorCode: input.errorCode,
    lastErrorMessage: input.errorMessage,
  });

  await markPaymentIdempotencyResult({
    provider: "wise",
    scope: "WISE_TRANSFER_CREATE",
    key: input.intent.idempotencyKey,
    status: "FAILED",
    responseHashSha256: sha256Hex(stableStringify(input.payload)),
    metadata: {
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      intentId: input.intent.intentId,
    },
  });

  return updatedIntent;
}

export async function applyWiseProviderStatusToIntent(input: {
  transferId: string;
  eventType: string;
  providerStatus: string;
  payload: Record<string, unknown>;
  incomingEventId?: string | null;
  occurredAtUnix?: number | null;
}) {
  const intent = await getWiseTransferIntentByTransferId(input.transferId);

  const event = await appendWiseProviderEventAndMarkProcessed({
    eventType: input.eventType,
    status: input.providerStatus,
    orderId: intent?.orderId || String(input.payload?.orderId || ""),
    transferId: input.transferId,
    incomingEventId: input.incomingEventId || null,
    occurredAtUnix: input.occurredAtUnix ?? null,
    payload: input.payload,
    metadata: {
      source: "provider_status",
    },
  });

  if (!event.created) {
    return {
      intent,
      duplicate: true,
      transitioned: false,
      transitionState: null as WiseTransferIntentState | null,
      eventId: event.eventId,
      eventCreated: false,
    };
  }

  if (!intent) {
    return {
      intent: null,
      duplicate: false,
      transitioned: false,
      transitionState: null as WiseTransferIntentState | null,
      eventId: event.eventId,
      eventCreated: true,
    };
  }

  const mapped = resolveWiseTransferStateFromProviderStatus(input.providerStatus);
  if (!mapped.terminalState) {
    await transitionWiseTransferIntent({
      intentId: intent.intentId,
      toState: intent.state,
      providerStatus: mapped.normalizedStatus || input.providerStatus,
      providerStatusAtUtc: new Date().toISOString(),
      incrementPollAttempts: false,
    });

    return {
      intent: await getWiseTransferIntentByIntentId(intent.intentId),
      duplicate: false,
      transitioned: false,
      transitionState: null as WiseTransferIntentState | null,
      eventId: event.eventId,
      eventCreated: true,
    };
  }

  const transitioned = await transitionWiseTransferIntent({
    intentId: intent.intentId,
    toState: mapped.terminalState,
    providerStatus: mapped.normalizedStatus,
    providerStatusAtUtc: new Date().toISOString(),
    autoRetryBlocked: mapped.terminalState === "TIMED_OUT" ? true : intent.autoRetryBlocked,
    lastErrorCode: mapped.terminalState === "COMPLETED" ? null : `WISE_${mapped.terminalState}`,
  });

  return {
    intent: transitioned,
    duplicate: false,
    transitioned: true,
    transitionState: mapped.terminalState,
    eventId: event.eventId,
    eventCreated: true,
  };
}

export async function pollWiseIntentUntilTerminal(input: {
  intentId: string;
  maxAttempts?: number;
  intervalMs?: number;
}) {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  const wiseConfig = runtimeConfig.wise;
  if (!wiseConfig?.apiKey) {
    throw new Error("WISE_API_KEY_REQUIRED_FOR_POLLING");
  }

  let intent = await getWiseTransferIntentByIntentId(input.intentId);
  if (!intent) throw new Error("WISE_TRANSFER_INTENT_NOT_FOUND");
  if (!intent.transferId) throw new Error("WISE_TRANSFER_ID_REQUIRED_FOR_POLLING");
  if (isWiseTerminalState(intent.state)) {
    return { intent, terminalEventId: null as string | null };
  }

  const intervalMs = Math.max(100, Number(input.intervalMs || 500));
  const maxAttempts = Math.max(1, Number(input.maxAttempts || intent.maxPollAttempts || 3));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const transferRes = await fetch(`https://api.sandbox.transferwise.tech/v1/transfers/${intent.transferId}`, {
      headers: {
        Authorization: `Bearer ${wiseConfig.apiKey}`,
      },
    });

    if (!transferRes.ok) {
      const errorBody = await transferRes.text();
      const mapped = mapWiseProviderError(transferRes.status, errorBody);

      intent = await transitionWiseTransferIntent({
        intentId: intent.intentId,
        toState: intent.state,
        providerStatus: `poll_error_${transferRes.status}`,
        lastErrorCode: mapped.code,
        lastErrorMessage: mapped.message || "Wise poll failed",
        incrementPollAttempts: true,
      });

      const event = await appendWiseProviderEventAndMarkProcessed({
        eventType: "transfer.status_polled",
        status: `error_${transferRes.status}`,
        orderId: intent.orderId,
        transferId: intent.transferId,
        payload: {
          transferId: intent.transferId,
          httpStatus: transferRes.status,
          errorCode: mapped.code,
          errorBody,
          intentId: intent.intentId,
        },
        metadata: {
          lifecycleState: intent.state,
          pollAttempt: intent.pollAttempts,
        },
      });

      if (!mapped.retryable) {
        const failedIntent = await transitionWiseTransferIntent({
          intentId: intent.intentId,
          toState: "FAILED",
          providerStatus: `poll_error_${transferRes.status}`,
          lastErrorCode: mapped.code,
          lastErrorMessage: mapped.message || "Wise poll failed",
        });
        return { intent: failedIntent, terminalEventId: event.eventId };
      }
    } else {
      const transfer = (await transferRes.json()) as { id?: string; status?: string; quoteUuid?: string };
      const providerStatus = String(transfer.status || "unknown");

      const transition = await applyWiseProviderStatusToIntent({
        transferId: intent.transferId,
        eventType: "transfer.status_polled",
        providerStatus,
        payload: {
          intentId: intent.intentId,
          transferId: transfer.id || intent.transferId,
          status: providerStatus,
          quoteUuid: transfer.quoteUuid || null,
          polledAt: new Date().toISOString(),
        },
        occurredAtUnix: Math.floor(Date.now() / 1000),
      });

      intent = transition.intent || intent;
      if (intent) {
        intent = await transitionWiseTransferIntent({
          intentId: intent.intentId,
          toState: intent.state,
          providerStatus,
          providerStatusAtUtc: new Date().toISOString(),
          incrementPollAttempts: true,
        });
      }

      if (intent && isWiseTerminalState(intent.state)) {
        return {
          intent,
          terminalEventId: transition.transitioned ? transition.eventId || null : null,
        };
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs);
      const latest = await getWiseTransferIntentByIntentId(intent.intentId);
      if (latest) {
        intent = latest;
        if (isWiseTerminalState(intent.state)) {
          return { intent, terminalEventId: null as string | null };
        }
      }
    }
  }

  const timedOutIntent = await transitionWiseTransferIntent({
    intentId: intent.intentId,
    toState: "TIMED_OUT",
    providerStatus: "timed_out",
    lastErrorCode: "WISE_TRANSFER_PENDING_TIMEOUT",
    lastErrorMessage: "Transfer did not reach a terminal state within polling window",
    autoRetryBlocked: true,
  });

  const timeoutEvent = await appendWiseProviderEventAndMarkProcessed({
    eventType: "transfer.timed_out",
    status: "timed_out",
    orderId: timedOutIntent.orderId,
    transferId: timedOutIntent.transferId || null,
    payload: {
      intentId: timedOutIntent.intentId,
      transferId: timedOutIntent.transferId,
      state: timedOutIntent.state,
      pollAttempts: timedOutIntent.pollAttempts,
    },
    metadata: {
      lifecycleState: "TIMED_OUT",
      autoRetryBlocked: true,
    },
  });

  return { intent: timedOutIntent, terminalEventId: timeoutEvent.eventId };
}
