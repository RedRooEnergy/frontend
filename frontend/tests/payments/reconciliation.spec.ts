import {
  computeOrderPricingSnapshotHash,
  runPaymentsReconciliation,
  type ReconciliationDependencies,
  type ReconciliationDiscrepancyCode,
} from "../../lib/payments/reconciliation";
import type { PaymentProviderEventRecord } from "../../lib/payments/types";
import type { OrderRecord } from "../../lib/store";
import type { WiseTransferIntentRecord } from "../../lib/payments/wiseTransferIntentStore";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function baseOrder(input: {
  orderId: string;
  createdAt: string;
  status: OrderRecord["status"];
  escrowStatus?: OrderRecord["escrowStatus"];
  total?: number;
}): OrderRecord {
  return {
    orderId: input.orderId,
    createdAt: input.createdAt,
    buyerEmail: "buyer@example.com",
    shippingAddress: {
      line1: "1 Test St",
      city: "Sydney",
      state: "NSW",
      postcode: "2000",
      country: "AU",
    },
    items: [
      {
        productSlug: "sku-1",
        name: "Item",
        qty: 1,
        price: input.total || 100,
        supplierId: "SUP-1",
      },
    ],
    total: input.total || 100,
    status: input.status,
    currency: "aud",
    escrowStatus: input.escrowStatus,
    supplierIds: ["SUP-1"],
    timeline: [],
  };
}

function withStoredHash(order: OrderRecord): OrderRecord {
  const hash = computeOrderPricingSnapshotHash(order);
  return {
    ...order,
    pricingSnapshotHash: hash,
  };
}

function makeWiseIntent(input: {
  orderId: string;
  intentId: string;
  transferId: string;
  state: WiseTransferIntentRecord["state"];
  providerStatusAtUtc: string;
}): WiseTransferIntentRecord {
  return {
    intentId: input.intentId,
    tenantId: null,
    orderId: input.orderId,
    releaseAttemptId: "attempt-1",
    attemptNumber: 1,
    destinationType: "supplier_payout",
    wiseProfileId: "profile-1",
    idempotencyKey: `key-${input.intentId}`,
    wiseIdempotenceUuid: `uuid-${input.intentId}`,
    state: input.state,
    autoRetryBlocked: input.state === "TIMED_OUT",
    transferId: input.transferId,
    quoteId: null,
    providerStatus: input.state.toLowerCase(),
    providerStatusAtUtc: input.providerStatusAtUtc,
    lastErrorCode: null,
    lastErrorMessage: null,
    pollAttempts: 1,
    maxPollAttempts: 3,
    createdByRole: "admin",
    createdById: "admin-1",
    createdAt: "2026-02-13T10:00:00.000Z",
    updatedAt: "2026-02-13T10:00:00.000Z",
  };
}

function event(input: {
  provider: "stripe" | "wise";
  eventId: string;
  eventType: string;
  orderId: string;
  status?: PaymentProviderEventRecord["status"];
  occurredAt?: string;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}): PaymentProviderEventRecord {
  return {
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    receivedAt: input.occurredAt || "2026-02-13T11:59:00.000Z",
    occurredAt: input.occurredAt || null,
    status: input.status || "PROCESSED",
    tenantId: null,
    orderId: input.orderId,
    paymentIntentId: input.provider === "stripe" ? `pi_${input.orderId}` : null,
    transferId: input.provider === "wise" ? `tr_${input.orderId}` : null,
    payloadHashSha256: "a".repeat(64),
    payload: input.payload,
    metadata: input.metadata,
    errorCode: null,
    errorMessage: null,
    createdAt: input.occurredAt || "2026-02-13T11:59:00.000Z",
    updatedAt: input.occurredAt || "2026-02-13T11:59:00.000Z",
  };
}

function createDependencies() {
  const now = new Date("2026-02-13T12:00:00.000Z");

  const orderA = withStoredHash(
    baseOrder({
      orderId: "ORD-A",
      createdAt: "2026-02-13T11:40:00.000Z",
      status: "PAID",
      escrowStatus: undefined,
    })
  );

  const orderB = withStoredHash(
    baseOrder({
      orderId: "ORD-B",
      createdAt: "2026-02-13T09:00:00.000Z",
      status: "PAID",
      escrowStatus: "HELD",
    })
  );

  const orderC = withStoredHash(
    baseOrder({
      orderId: "ORD-C",
      createdAt: "2026-02-13T11:00:00.000Z",
      status: "SETTLEMENT_ELIGIBLE",
      escrowStatus: "HELD",
    })
  );

  const orderD = withStoredHash(
    {
      ...baseOrder({
        orderId: "ORD-D",
        createdAt: "2026-02-13T11:10:00.000Z",
        status: "SETTLED",
        escrowStatus: "SETTLED",
      }),
      wiseTransferId: "tr_ord_d",
    }
  );

  const orderE: OrderRecord = {
    ...baseOrder({
      orderId: "ORD-E",
      createdAt: "2026-02-13T11:50:00.000Z",
      status: "PAID",
      escrowStatus: "HELD",
    }),
    pricingSnapshotHash: "f".repeat(64),
  };

  const eventsByOrder = new Map<string, PaymentProviderEventRecord[]>([
    [
      "ORD-A",
      [
        event({
          provider: "stripe",
          eventId: "evt_a_1",
          eventType: "checkout.session.completed",
          orderId: "ORD-A",
          occurredAt: "2026-02-13T11:55:00.000Z",
          metadata: { hashMatch: true },
        }),
      ],
    ],
    [
      "ORD-B",
      [
        event({
          provider: "stripe",
          eventId: "evt_b_ignored",
          eventType: "payment_intent.requires_action",
          orderId: "ORD-B",
          occurredAt: "2026-02-13T09:30:00.000Z",
          status: "PROCESSED",
        }),
      ],
    ],
    [
      "ORD-C",
      [
        event({
          provider: "stripe",
          eventId: "evt_c_1",
          eventType: "payment_intent.succeeded",
          orderId: "ORD-C",
          occurredAt: "2026-02-13T11:10:00.000Z",
        }),
      ],
    ],
    [
      "ORD-D",
      [
        event({
          provider: "stripe",
          eventId: "evt_d_1",
          eventType: "payment_intent.succeeded",
          orderId: "ORD-D",
          occurredAt: "2026-02-13T11:15:00.000Z",
        }),
      ],
    ],
    [
      "ORD-E",
      [
        event({
          provider: "stripe",
          eventId: "evt_e_1",
          eventType: "payment_intent.succeeded",
          orderId: "ORD-E",
          occurredAt: "2026-02-13T11:51:00.000Z",
        }),
      ],
    ],
  ]);

  const intentsByOrder = new Map<string, WiseTransferIntentRecord | null>([
    [
      "ORD-C",
      makeWiseIntent({
        orderId: "ORD-C",
        intentId: "intent-c",
        transferId: "tr_ord_c",
        state: "COMPLETED",
        providerStatusAtUtc: "2026-02-13T11:55:00.000Z",
      }),
    ],
    [
      "ORD-D",
      makeWiseIntent({
        orderId: "ORD-D",
        intentId: "intent-d",
        transferId: "tr_ord_d",
        state: "ACCEPTED",
        providerStatusAtUtc: "2026-02-13T11:20:00.000Z",
      }),
    ],
  ]);

  const deps: Partial<ReconciliationDependencies> = {
    getOrders: () => [orderA, orderB, orderC, orderD, orderE],
    listProviderEventsByOrder: async ({ orderId }) => eventsByOrder.get(orderId) || [],
    getLatestWiseIntentByOrder: async (orderId) => intentsByOrder.get(orderId) || null,
    now: () => now,
  };

  return { deps };
}

function getCodeCount(report: Awaited<ReturnType<typeof runPaymentsReconciliation>>, code: ReconciliationDiscrepancyCode) {
  return report.summary.byCode[code];
}

async function testDiscrepancyTaxonomyAndSeverity() {
  const { deps } = createDependencies();
  const report = await runPaymentsReconciliation(
    {
      source: "cli_local",
      filters: {
        limit: 500,
      },
    },
    deps
  );

  assert(report.reportVersion === "payments-reconciliation.v1", "Expected reconciliation report version");
  assert(report.summary.ordersScanned === 5, "Expected five orders scanned");
  assert(report.summary.discrepanciesTotal === 5, "Expected five discrepancies");

  assert(getCodeCount(report, "PAYMENT_CONFIRMED_NO_ESCROW") === 1, "Expected PAYMENT_CONFIRMED_NO_ESCROW discrepancy");
  assert(
    getCodeCount(report, "ESCROW_HELD_NO_PROVIDER_CONFIRMATION") === 1,
    "Expected ESCROW_HELD_NO_PROVIDER_CONFIRMATION discrepancy"
  );
  assert(
    getCodeCount(report, "TRANSFER_COMPLETED_NO_SETTLEMENT") === 1,
    "Expected TRANSFER_COMPLETED_NO_SETTLEMENT discrepancy"
  );
  assert(
    getCodeCount(report, "SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION") === 1,
    "Expected SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION discrepancy"
  );
  assert(getCodeCount(report, "IDENTITY_MISMATCH") === 1, "Expected IDENTITY_MISMATCH discrepancy");

  assert(report.summary.bySeverity.WARNING === 2, "Expected two WARNING discrepancies");
  assert(report.summary.bySeverity.CRITICAL === 3, "Expected three CRITICAL discrepancies");

  const blocked = report.discrepancies.find((entry) => entry.code === "ESCROW_HELD_NO_PROVIDER_CONFIRMATION");
  assert(blocked?.severity === "CRITICAL", "Expected aged escrow-held discrepancy to escalate to CRITICAL");

  const identity = report.discrepancies.find((entry) => entry.code === "IDENTITY_MISMATCH");
  assert(identity?.retryable === false, "Expected IDENTITY_MISMATCH retryable=false");
  assert(identity?.manualReviewRequired === true, "Expected IDENTITY_MISMATCH manual review required");
}

async function testDeterministicHashStableAcrossRuns() {
  const { deps } = createDependencies();

  const first = await runPaymentsReconciliation(
    {
      source: "cli_local",
      filters: { limit: 500 },
    },
    deps
  );

  const second = await runPaymentsReconciliation(
    {
      source: "cli_local",
      filters: { limit: 500 },
    },
    deps
  );

  assert(first.deterministicHashSha256 === second.deterministicHashSha256, "Expected deterministic hash to be stable");
  assert(first.deterministicHashSha256.length === 64, "Expected SHA-256 deterministic hash");
}

async function testOrderFilter() {
  const { deps } = createDependencies();

  const report = await runPaymentsReconciliation(
    {
      source: "cli_local",
      filters: {
        orderId: "ORD-E",
      },
    },
    deps
  );

  assert(report.summary.ordersScanned === 1, "Expected one scanned order with orderId filter");
  assert(report.summary.discrepanciesTotal === 1, "Expected one discrepancy for filtered order");
  assert(report.discrepancies[0].code === "IDENTITY_MISMATCH", "Expected identity mismatch for filtered order");
}

async function run() {
  await testDiscrepancyTaxonomyAndSeverity();
  await testDeterministicHashStableAcrossRuns();
  await testOrderFilter();
}

run();
