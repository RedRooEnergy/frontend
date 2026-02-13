import { runPaymentsMetricsSnapshot, type PaymentsMetricsEngineDependencies } from "../../lib/payments/metrics/engine";
import type { PaymentIdempotencyRecord, PaymentProviderEventRecord } from "../../lib/payments/types";
import type { WiseTransferIntentRecord } from "../../lib/payments/wiseTransferIntentStore";
import type { PaymentsReconciliationReport } from "../../lib/payments/reconciliation";
import { clearRuntimeMetricEvents } from "../../lib/payments/metrics/runtime";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function makeIdempotency(input: {
  provider: PaymentIdempotencyRecord["provider"];
  scope: PaymentIdempotencyRecord["scope"];
  key: string;
  status: PaymentIdempotencyRecord["status"];
  createdAt: string;
  updatedAt: string;
}): PaymentIdempotencyRecord {
  return {
    provider: input.provider,
    scope: input.scope,
    key: input.key,
    operation: "test_op",
    status: input.status,
    requestHashSha256: null,
    responseHashSha256: null,
    tenantId: null,
    orderId: `ORD-${input.key}`,
    referenceId: null,
    metadata: {},
    expiresAt: null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function makeProviderEvent(input: {
  provider: PaymentProviderEventRecord["provider"];
  eventId: string;
  eventType: string;
  transferId?: string | null;
  orderId?: string;
  receivedAt: string;
  occurredAt?: string | null;
  status?: PaymentProviderEventRecord["status"];
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): PaymentProviderEventRecord {
  return {
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    receivedAt: input.receivedAt,
    occurredAt: input.occurredAt || null,
    status: input.status || "PROCESSED",
    tenantId: null,
    orderId: input.orderId || null,
    paymentIntentId: input.provider === "stripe" ? `pi_${input.eventId}` : null,
    transferId: input.transferId || null,
    payloadHashSha256: "a".repeat(64),
    payload: input.payload,
    metadata: input.metadata,
    errorCode: null,
    errorMessage: null,
    createdAt: input.receivedAt,
    updatedAt: input.receivedAt,
  };
}

function makeWiseIntent(input: {
  intentId: string;
  orderId: string;
  transferId: string;
  state: WiseTransferIntentRecord["state"];
  createdAt: string;
  updatedAt: string;
  providerStatusAtUtc?: string;
  autoRetryBlocked?: boolean;
}): WiseTransferIntentRecord {
  return {
    intentId: input.intentId,
    tenantId: null,
    orderId: input.orderId,
    releaseAttemptId: "attempt-1",
    attemptNumber: 1,
    destinationType: "supplier_payout",
    wiseProfileId: "profile-1",
    idempotencyKey: `idem-${input.intentId}`,
    wiseIdempotenceUuid: `uuid-${input.intentId}`,
    state: input.state,
    autoRetryBlocked: Boolean(input.autoRetryBlocked),
    transferId: input.transferId,
    quoteId: null,
    providerStatus: input.state.toLowerCase(),
    providerStatusAtUtc: input.providerStatusAtUtc || input.updatedAt,
    lastErrorCode: null,
    lastErrorMessage: null,
    pollAttempts: 1,
    maxPollAttempts: 3,
    createdByRole: "system",
    createdById: "metrics-test",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function makeReconciliationReport(now: string): PaymentsReconciliationReport {
  return {
    reportVersion: "payments-reconciliation.v1",
    generatedAtUtc: now,
    source: "api_internal",
    filters: {
      fromUtc: "2026-02-13T09:00:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 100,
    },
    summary: {
      ordersScanned: 10,
      discrepanciesTotal: 2,
      byCode: {
        PAYMENT_CONFIRMED_NO_ESCROW: 1,
        ESCROW_HELD_NO_PROVIDER_CONFIRMATION: 0,
        TRANSFER_COMPLETED_NO_SETTLEMENT: 0,
        SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION: 1,
        IDENTITY_MISMATCH: 0,
      },
      bySeverity: {
        INFO: 0,
        WARNING: 1,
        CRITICAL: 1,
      },
    },
    discrepancies: [
      {
        discrepancyId: "disc-1",
        code: "PAYMENT_CONFIRMED_NO_ESCROW",
        severity: "WARNING",
        retryable: true,
        manualReviewRequired: false,
        orderId: "ORD-1",
        tenantId: null,
        detectedAtUtc: now,
        providerRefs: {
          stripePaymentIntentId: "pi_1",
          wiseTransferId: null,
          wiseIntentId: null,
          latestProviderEventId: "evt_1",
        },
        orderSnapshot: {
          status: "PAID",
          escrowStatus: null,
          pricingSnapshotHashStored: "a".repeat(64),
          pricingSnapshotHashComputed: "a".repeat(64),
        },
        evidence: {
          latestStripeEventType: "payment_intent.succeeded",
          latestWiseEventType: null,
          latestWiseIntentState: null,
          eventOccurredAtUtc: "2026-02-13T11:59:00.000Z",
        },
        recommendedActionCode: "RETRY_RECONCILIATION",
      },
      {
        discrepancyId: "disc-2",
        code: "SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION",
        severity: "CRITICAL",
        retryable: false,
        manualReviewRequired: true,
        orderId: "ORD-2",
        tenantId: null,
        detectedAtUtc: now,
        providerRefs: {
          stripePaymentIntentId: "pi_2",
          wiseTransferId: "tr_2",
          wiseIntentId: "intent-2",
          latestProviderEventId: "evt_2",
        },
        orderSnapshot: {
          status: "SETTLED",
          escrowStatus: "SETTLED",
          pricingSnapshotHashStored: "b".repeat(64),
          pricingSnapshotHashComputed: "b".repeat(64),
        },
        evidence: {
          latestStripeEventType: "payment_intent.succeeded",
          latestWiseEventType: "transfer.status",
          latestWiseIntentState: "ACCEPTED",
          eventOccurredAtUtc: "2026-02-13T10:00:00.000Z",
        },
        recommendedActionCode: "MANUAL_REVIEW_REQUIRED",
      },
    ],
    deterministicHashSha256: "f".repeat(64),
  };
}

function createDeps(overrides: Partial<PaymentsMetricsEngineDependencies> = {}): Partial<PaymentsMetricsEngineDependencies> {
  const now = new Date("2026-02-13T12:00:00.000Z");

  const idempotency: PaymentIdempotencyRecord[] = [
    makeIdempotency({
      provider: "stripe",
      scope: "STRIPE_CHECKOUT_SESSION_CREATE",
      key: "checkout-fast",
      status: "SUCCEEDED",
      createdAt: "2026-02-13T11:00:00.000Z",
      updatedAt: "2026-02-13T11:00:01.200Z",
    }),
    makeIdempotency({
      provider: "stripe",
      scope: "STRIPE_REFUND_CREATE",
      key: "refund-slow",
      status: "SUCCEEDED",
      createdAt: "2026-02-13T11:10:00.000Z",
      updatedAt: "2026-02-13T11:10:07.000Z",
    }),
    makeIdempotency({
      provider: "wise",
      scope: "WISE_TRANSFER_CREATE",
      key: "wise-intent-1",
      status: "SUCCEEDED",
      createdAt: "2026-02-13T11:20:00.000Z",
      updatedAt: "2026-02-13T11:20:02.000Z",
    }),
  ];

  const events: PaymentProviderEventRecord[] = [
    makeProviderEvent({
      provider: "stripe",
      eventId: "evt-stripe-1",
      eventType: "payment_intent.succeeded",
      orderId: "ORD-1",
      receivedAt: "2026-02-13T11:30:00.000Z",
    }),
    makeProviderEvent({
      provider: "wise",
      eventId: "evt-wise-accepted",
      eventType: "transfer.accepted",
      transferId: "tr-1",
      orderId: "ORD-W1",
      receivedAt: "2026-02-13T11:21:00.000Z",
      payload: { status: "incoming_payment_waiting" },
      metadata: { status: "incoming_payment_waiting" },
    }),
    makeProviderEvent({
      provider: "wise",
      eventId: "evt-wise-completed",
      eventType: "transfer.status",
      transferId: "tr-1",
      orderId: "ORD-W1",
      receivedAt: "2026-02-13T11:25:00.000Z",
      payload: { status: "outgoing_payment_sent" },
      metadata: { status: "outgoing_payment_sent" },
    }),
  ];

  const intents: WiseTransferIntentRecord[] = [
    makeWiseIntent({
      intentId: "intent-1",
      orderId: "ORD-W1",
      transferId: "tr-1",
      state: "COMPLETED",
      createdAt: "2026-02-13T11:20:00.000Z",
      updatedAt: "2026-02-13T11:25:00.000Z",
      providerStatusAtUtc: "2026-02-13T11:25:00.000Z",
    }),
    makeWiseIntent({
      intentId: "intent-2",
      orderId: "ORD-W2",
      transferId: "tr-2",
      state: "TIMED_OUT",
      createdAt: "2026-02-13T11:00:00.000Z",
      updatedAt: "2026-02-13T11:45:00.000Z",
      providerStatusAtUtc: "2026-02-13T11:45:00.000Z",
      autoRetryBlocked: true,
    }),
  ];

  const runtimeEvents = [
    {
      metric: "payments_metrics_webhook_verification_failed",
      atUtc: "2026-02-13T11:40:00.000Z",
      labels: { provider: "stripe", route: "/api/payments/stripe/webhook", failureCode: "TOLERANCE" },
    },
    {
      metric: "payments_metrics_webhook_duplicate_suppressed",
      atUtc: "2026-02-13T11:41:00.000Z",
      labels: { provider: "stripe", route: "/api/payments/stripe/webhook", eventType: "payment_intent.succeeded" },
    },
    {
      metric: "payments_metrics_idempotency_conflict",
      atUtc: "2026-02-13T11:42:00.000Z",
      labels: { provider: "wise", scope: "WISE_TRANSFER_CREATE", conflictClass: "IN_PROGRESS" },
    },
    {
      metric: "payments_metrics_provider_latency",
      atUtc: "2026-02-13T11:43:00.000Z",
      labels: {
        provider: "wise",
        endpointClass: "wise.transfer_status_poll",
        scope: "WISE_TRANSFER_POLL",
        outcome: "TERMINAL_EVENT_BACKED",
        durationMs: "900",
      },
    },
    {
      metric: "payments_metrics_wise_polling_outcome",
      atUtc: "2026-02-13T11:44:00.000Z",
      labels: { outcome: "TERMINAL_EVENT_BACKED", state: "COMPLETED", source: "runtime" },
    },
  ];

  return {
    listIdempotencyRecordsByWindow: async () => idempotency,
    listProviderEventsByWindow: async () => events,
    listWiseIntentsByWindow: async () => intents,
    listRuntimeMetricEventsByWindow: () => runtimeEvents,
    runReconciliation: async () => makeReconciliationReport(now.toISOString()),
    now: () => now,
    ...overrides,
  };
}

async function testDeterministicHashStability() {
  clearRuntimeMetricEvents();
  const deps = createDeps();

  const first = await runPaymentsMetricsSnapshot(
    {
      source: "api_internal",
      fromUtc: "2026-02-13T09:00:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 200,
    },
    deps
  );

  const second = await runPaymentsMetricsSnapshot(
    {
      source: "api_internal",
      fromUtc: "2026-02-13T09:00:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 200,
    },
    deps
  );

  assert(first.reportVersion === "payments-metrics.v1", "Expected payments metrics report version");
  assert(first.deterministicHashSha256.length === 64, "Expected deterministic hash");
  assert(
    first.deterministicHashSha256 === second.deterministicHashSha256,
    "Expected deterministic hash stability for identical inputs"
  );
}

async function testSortingAndSeriesCoverage() {
  const report = await runPaymentsMetricsSnapshot(
    {
      source: "cli_local",
      fromUtc: "2026-02-13T09:00:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 200,
    },
    createDeps()
  );

  const latencyClasses = report.aggregates.providerApiLatency.map((entry) => entry.endpointClass);
  assert(latencyClasses.includes("stripe.checkout_session_create"), "Expected Stripe checkout latency series");
  assert(latencyClasses.includes("wise.transfer_status_poll"), "Expected Wise polling latency series from runtime logs");

  const sortedDiscrepancyRows = [...report.aggregates.reconciliationDiscrepancyAging].sort((left, right) => {
    if (left.labels.code !== right.labels.code) return left.labels.code.localeCompare(right.labels.code);
    if (left.labels.severity !== right.labels.severity) return left.labels.severity.localeCompare(right.labels.severity);
    return left.labels.ageBucket.localeCompare(right.labels.ageBucket);
  });

  assert(
    JSON.stringify(sortedDiscrepancyRows) === JSON.stringify(report.aggregates.reconciliationDiscrepancyAging),
    "Expected reconciliation aging rows to be deterministically sorted"
  );
}

async function testSloEvaluation() {
  const report = await runPaymentsMetricsSnapshot(
    {
      source: "api_internal",
      fromUtc: "2026-02-13T09:00:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 200,
    },
    createDeps()
  );

  const byId = new Map(report.slos.map((slo) => [slo.sloId, slo]));

  assert(byId.get("SLO-STRIPE-CHECKOUT-LATENCY")?.status === "PASS", "Expected checkout latency SLO PASS");
  assert(byId.get("SLO-STRIPE-REFUND-LATENCY")?.status === "FAIL", "Expected refund latency SLO FAIL");
  assert(byId.get("SLO-STRIPE-REFUND-LATENCY")?.pagingTrigger === true, "Expected refund latency paging trigger");
  assert(byId.get("SLO-WISE-TIMEOUT-RATE")?.status === "FAIL", "Expected Wise timeout rate SLO FAIL");
  assert(
    byId.get("SLO-RECON-SETTLEMENT-CONTRADICTION")?.pagingTrigger === true,
    "Expected reconciliation contradiction paging trigger"
  );
}

async function run() {
  await testDeterministicHashStability();
  await testSortingAndSeriesCoverage();
  await testSloEvaluation();
}

run();
