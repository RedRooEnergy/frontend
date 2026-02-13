import { getOrders, type OrderRecord } from "../store";
import {
  listPaymentProviderEventsByOrder,
  type ProviderEventStoreDependencies,
} from "./providerEventStore";
import type { PaymentProviderEventRecord } from "./types";
import {
  getLatestWiseTransferIntentForOrder,
  type WiseTransferIntentRecord,
  type WiseTransferIntentStoreDependencies,
} from "./wiseTransferIntentStore";
import {
  buildCanonicalPricingSnapshot,
  computeCanonicalPricingSnapshotHash,
  sha256Hex,
  stableStringify,
  type CanonicalPricingSnapshotInput,
} from "./pricingSnapshot";
import { resolveWiseTransferStateFromProviderStatus } from "./wiseTransferService";

export type ReconciliationSource = "api_internal" | "cli_local" | "cli_http";

export type ReconciliationDiscrepancyCode =
  | "PAYMENT_CONFIRMED_NO_ESCROW"
  | "ESCROW_HELD_NO_PROVIDER_CONFIRMATION"
  | "TRANSFER_COMPLETED_NO_SETTLEMENT"
  | "SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION"
  | "IDENTITY_MISMATCH";

export type ReconciliationSeverity = "INFO" | "WARNING" | "CRITICAL";

export type ReconciliationFilters = {
  orderId?: string;
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
};

export type ReconciliationProviderRefs = {
  stripePaymentIntentId?: string | null;
  wiseTransferId?: string | null;
  wiseIntentId?: string | null;
  latestProviderEventId?: string | null;
};

export type ReconciliationDiscrepancy = {
  discrepancyId: string;
  code: ReconciliationDiscrepancyCode;
  severity: ReconciliationSeverity;
  retryable: boolean;
  manualReviewRequired: boolean;
  orderId: string;
  tenantId: string | null;
  detectedAtUtc: string;
  providerRefs: ReconciliationProviderRefs;
  orderSnapshot: {
    status: string;
    escrowStatus: string | null;
    pricingSnapshotHashStored?: string | null;
    pricingSnapshotHashComputed?: string | null;
  };
  evidence: {
    latestStripeEventType?: string | null;
    latestWiseEventType?: string | null;
    latestWiseIntentState?: string | null;
    eventOccurredAtUtc?: string | null;
  };
  recommendedActionCode: "RETRY_RECONCILIATION" | "MANUAL_REVIEW_REQUIRED";
};

export type ReconciliationSummary = {
  ordersScanned: number;
  discrepanciesTotal: number;
  byCode: Record<ReconciliationDiscrepancyCode, number>;
  bySeverity: Record<ReconciliationSeverity, number>;
};

export type PaymentsReconciliationReport = {
  reportVersion: "payments-reconciliation.v1";
  generatedAtUtc: string;
  source: ReconciliationSource;
  filters: {
    orderId?: string;
    fromUtc?: string;
    toUtc?: string;
    limit: number;
  };
  summary: ReconciliationSummary;
  discrepancies: ReconciliationDiscrepancy[];
  deterministicHashSha256: string;
};

export type ReconciliationDependencies = {
  getOrders: () => Promise<OrderRecord[]> | OrderRecord[];
  listProviderEventsByOrder: (
    params: { orderId: string; limit?: number },
    dependencyOverrides?: Partial<ProviderEventStoreDependencies>
  ) => Promise<PaymentProviderEventRecord[]>;
  getLatestWiseIntentByOrder: (
    orderId: string,
    dependencyOverrides?: Partial<WiseTransferIntentStoreDependencies>
  ) => Promise<WiseTransferIntentRecord | null>;
  now: () => Date;
};

const defaultDependencies: ReconciliationDependencies = {
  getOrders: () => getOrders(),
  listProviderEventsByOrder: (params, dependencyOverrides) => listPaymentProviderEventsByOrder(params, dependencyOverrides),
  getLatestWiseIntentByOrder: (orderId, dependencyOverrides) => getLatestWiseTransferIntentForOrder(orderId, dependencyOverrides),
  now: () => new Date(),
};

const WARNING_ESCALATION_SECONDS: Partial<Record<ReconciliationDiscrepancyCode, number>> = {
  PAYMENT_CONFIRMED_NO_ESCROW: 15 * 60,
  ESCROW_HELD_NO_PROVIDER_CONFIRMATION: 60 * 60,
  TRANSFER_COMPLETED_NO_SETTLEMENT: 15 * 60,
};

const SNAPSHOT_REQUIRED_STATUSES = new Set([
  "PAID",
  "PAYMENT_REVIEW_REQUIRED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "SETTLEMENT_ELIGIBLE",
  "SETTLED",
  "REFUND_REQUESTED",
  "REFUNDED",
]);

function resolveDependencies(overrides: Partial<ReconciliationDependencies> = {}): ReconciliationDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toIsoOrNull(input: unknown): string | null {
  const value = String(input || "").trim();
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function toUnixOrNull(input: unknown): number | null {
  const iso = toIsoOrNull(input);
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  return time;
}

function sanitizeFilters(input: ReconciliationFilters = {}) {
  const orderId = String(input.orderId || "").trim();
  const fromUtc = toIsoOrNull(input.fromUtc || null) || undefined;
  const toUtc = toIsoOrNull(input.toUtc || null) || undefined;

  const rawLimit = Number(input.limit || 500);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.floor(rawLimit), 2000)) : 500;

  return {
    orderId: orderId || undefined,
    fromUtc,
    toUtc,
    limit,
  };
}

function toMinorFromMajor(value: number) {
  return Math.round(Number(value || 0) * 100);
}

export function buildCanonicalSnapshotInputFromOrder(order: OrderRecord): CanonicalPricingSnapshotInput {
  return {
    orderId: String(order.orderId || "").trim(),
    currency: String(order.currency || "AUD").toUpperCase(),
    totalAmountMinor: toMinorFromMajor(order.total),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          productSlug: String(item?.productSlug || "").trim(),
          supplierId: String(item?.supplierId || "").trim(),
          qty: Number(item?.qty || 0),
          unitAmountMinor: toMinorFromMajor(Number(item?.price || 0)),
        }))
      : [],
  };
}

export function computeOrderPricingSnapshotHash(order: OrderRecord): string {
  const canonicalInput = buildCanonicalSnapshotInputFromOrder(order);
  buildCanonicalPricingSnapshot(canonicalInput);
  return computeCanonicalPricingSnapshotHash(canonicalInput);
}

function getLatestEvent(events: PaymentProviderEventRecord[], provider: "stripe" | "wise") {
  return (
    events
      .filter((event) => event.provider === provider)
      .sort((left, right) => {
        const leftTs = toUnixOrNull(left.occurredAt || left.receivedAt || left.createdAt) || 0;
        const rightTs = toUnixOrNull(right.occurredAt || right.receivedAt || right.createdAt) || 0;
        if (rightTs !== leftTs) return rightTs - leftTs;
        return String(left.eventId || "").localeCompare(String(right.eventId || ""));
      })[0] || null
  );
}

function isProcessed(event: PaymentProviderEventRecord) {
  return String(event.status || "").toUpperCase() === "PROCESSED";
}

function getStripeConfirmation(events: PaymentProviderEventRecord[]) {
  const stripeEvents = events.filter((event) => event.provider === "stripe" && isProcessed(event));
  const latest = getLatestEvent(stripeEvents, "stripe");

  for (const event of stripeEvents) {
    if (event.eventType === "payment_intent.succeeded") {
      const at = toIsoOrNull(event.occurredAt || event.receivedAt || event.createdAt);
      return {
        confirmed: true,
        sourceEventId: event.eventId,
        atUtc: at,
        latest,
      };
    }

    if (event.eventType === "checkout.session.completed") {
      const hashMatch = (event.metadata as Record<string, unknown> | undefined)?.hashMatch;
      const normalizedHashMatch = hashMatch === true || String(hashMatch || "").toLowerCase() === "true";
      if (normalizedHashMatch) {
        const at = toIsoOrNull(event.occurredAt || event.receivedAt || event.createdAt);
        return {
          confirmed: true,
          sourceEventId: event.eventId,
          atUtc: at,
          latest,
        };
      }
    }
  }

  return {
    confirmed: false,
    sourceEventId: null,
    atUtc: null,
    latest,
  };
}

function getWiseCompletionTruth(events: PaymentProviderEventRecord[], latestIntent: WiseTransferIntentRecord | null) {
  const wiseEvents = events.filter((event) => event.provider === "wise" && isProcessed(event));
  const latestEvent = getLatestEvent(wiseEvents, "wise");

  if (latestIntent?.state === "COMPLETED") {
    return {
      completed: true,
      source: "intent" as const,
      atUtc: toIsoOrNull(latestIntent.providerStatusAtUtc || latestIntent.updatedAt),
      eventId: null as string | null,
      latestEvent,
    };
  }

  for (const event of wiseEvents) {
    const metadataStatus = String(((event.metadata as Record<string, unknown> | undefined)?.status as string) || "").trim();
    const payloadStatus = String(((event.payload as Record<string, unknown> | undefined)?.status as string) || "").trim();
    const status = metadataStatus || payloadStatus;
    if (!status) continue;

    const resolved = resolveWiseTransferStateFromProviderStatus(status);
    if (resolved.terminalState === "COMPLETED") {
      return {
        completed: true,
        source: "event" as const,
        atUtc: toIsoOrNull(event.occurredAt || event.receivedAt || event.createdAt),
        eventId: event.eventId,
        latestEvent,
      };
    }
  }

  return {
    completed: false,
    source: null,
    atUtc: null,
    eventId: null,
    latestEvent,
  };
}

function escalateSeverity(
  code: ReconciliationDiscrepancyCode,
  base: ReconciliationSeverity,
  referenceAtUtc: string | null,
  now: Date
): ReconciliationSeverity {
  if (base !== "WARNING") return base;
  const threshold = WARNING_ESCALATION_SECONDS[code];
  if (!threshold) return base;

  const referenceTime = toUnixOrNull(referenceAtUtc);
  if (!referenceTime) return base;

  const ageSeconds = Math.floor((now.getTime() - referenceTime) / 1000);
  if (ageSeconds > threshold) {
    return "CRITICAL";
  }

  return base;
}

function makeDiscrepancy(input: {
  code: ReconciliationDiscrepancyCode;
  baseSeverity: ReconciliationSeverity;
  retryable: boolean;
  order: OrderRecord;
  tenantId?: string | null;
  now: Date;
  referenceAtUtc?: string | null;
  providerRefs?: ReconciliationProviderRefs;
  evidence?: ReconciliationDiscrepancy["evidence"];
  pricingSnapshotHashComputed?: string | null;
}) {
  const severity = escalateSeverity(input.code, input.baseSeverity, input.referenceAtUtc || null, input.now);
  const manualReviewRequired = severity === "CRITICAL" || !input.retryable;

  const providerRefs: ReconciliationProviderRefs = {
    stripePaymentIntentId: input.providerRefs?.stripePaymentIntentId || input.order.stripePaymentIntentId || null,
    wiseTransferId: input.providerRefs?.wiseTransferId || input.order.wiseTransferId || null,
    wiseIntentId: input.providerRefs?.wiseIntentId || null,
    latestProviderEventId: input.providerRefs?.latestProviderEventId || null,
  };

  const providerRefSeed =
    providerRefs.latestProviderEventId || providerRefs.wiseIntentId || providerRefs.wiseTransferId || providerRefs.stripePaymentIntentId || "none";
  const discrepancyId = sha256Hex(`${input.code}|${input.order.orderId}|${providerRefSeed}`);

  return {
    discrepancyId,
    code: input.code,
    severity,
    retryable: input.retryable,
    manualReviewRequired,
    orderId: input.order.orderId,
    tenantId: input.tenantId || null,
    detectedAtUtc: input.now.toISOString(),
    providerRefs,
    orderSnapshot: {
      status: String(input.order.status || ""),
      escrowStatus: input.order.escrowStatus || null,
      pricingSnapshotHashStored: input.order.pricingSnapshotHash || null,
      pricingSnapshotHashComputed: input.pricingSnapshotHashComputed || null,
    },
    evidence: {
      latestStripeEventType: input.evidence?.latestStripeEventType || null,
      latestWiseEventType: input.evidence?.latestWiseEventType || null,
      latestWiseIntentState: input.evidence?.latestWiseIntentState || null,
      eventOccurredAtUtc: input.evidence?.eventOccurredAtUtc || input.referenceAtUtc || null,
    },
    recommendedActionCode: manualReviewRequired ? "MANUAL_REVIEW_REQUIRED" : "RETRY_RECONCILIATION",
  } satisfies ReconciliationDiscrepancy;
}

function severityWeight(level: ReconciliationSeverity) {
  if (level === "CRITICAL") return 3;
  if (level === "WARNING") return 2;
  return 1;
}

function shouldCheckIdentity(order: OrderRecord) {
  return SNAPSHOT_REQUIRED_STATUSES.has(String(order.status || ""));
}

export async function runPaymentsReconciliation(
  input: {
    source: ReconciliationSource;
    filters?: ReconciliationFilters;
    tenantId?: string | null;
  },
  dependencyOverrides: Partial<ReconciliationDependencies> = {}
): Promise<PaymentsReconciliationReport> {
  const deps = resolveDependencies(dependencyOverrides);
  const now = deps.now();
  const filters = sanitizeFilters(input.filters || {});

  const allOrders = await deps.getOrders();
  const candidateOrders = allOrders
    .filter((order) => {
      if (filters.orderId && order.orderId !== filters.orderId) return false;
      const createdAt = toUnixOrNull(order.createdAt);
      if (filters.fromUtc) {
        const fromTime = toUnixOrNull(filters.fromUtc);
        if (fromTime && createdAt && createdAt < fromTime) return false;
      }
      if (filters.toUtc) {
        const toTime = toUnixOrNull(filters.toUtc);
        if (toTime && createdAt && createdAt > toTime) return false;
      }
      return true;
    })
    .sort((left, right) => String(left.orderId || "").localeCompare(String(right.orderId || "")))
    .slice(0, filters.limit);

  const discrepancies: ReconciliationDiscrepancy[] = [];

  for (const order of candidateOrders) {
    const events = await deps.listProviderEventsByOrder({ orderId: order.orderId, limit: 300 });
    const latestWiseIntent = await deps.getLatestWiseIntentByOrder(order.orderId);

    const stripe = getStripeConfirmation(events);
    const wise = getWiseCompletionTruth(events, latestWiseIntent);

    const latestStripeEvent = stripe.latest;
    const latestWiseEvent = wise.latestEvent;

    const evidence = {
      latestStripeEventType: latestStripeEvent?.eventType || null,
      latestWiseEventType: latestWiseEvent?.eventType || null,
      latestWiseIntentState: latestWiseIntent?.state || null,
      eventOccurredAtUtc: stripe.atUtc || wise.atUtc || null,
    };

    const isPaymentLifecycle =
      order.status === "PAID" ||
      order.status === "PAYMENT_REVIEW_REQUIRED" ||
      order.status === "PROCESSING" ||
      order.status === "SHIPPED" ||
      order.status === "DELIVERED" ||
      order.status === "SETTLEMENT_ELIGIBLE";

    if (stripe.confirmed && isPaymentLifecycle && order.escrowStatus !== "HELD") {
      discrepancies.push(
        makeDiscrepancy({
          code: "PAYMENT_CONFIRMED_NO_ESCROW",
          baseSeverity: "WARNING",
          retryable: true,
          order,
          tenantId: input.tenantId || null,
          now,
          referenceAtUtc: stripe.atUtc || order.createdAt,
          providerRefs: {
            stripePaymentIntentId: order.stripePaymentIntentId || null,
            wiseTransferId: order.wiseTransferId || null,
            latestProviderEventId: stripe.sourceEventId,
          },
          evidence,
        })
      );
    }

    if (order.escrowStatus === "HELD" && !stripe.confirmed) {
      discrepancies.push(
        makeDiscrepancy({
          code: "ESCROW_HELD_NO_PROVIDER_CONFIRMATION",
          baseSeverity: "WARNING",
          retryable: true,
          order,
          tenantId: input.tenantId || null,
          now,
          referenceAtUtc: order.createdAt,
          providerRefs: {
            stripePaymentIntentId: order.stripePaymentIntentId || null,
            wiseTransferId: order.wiseTransferId || null,
            latestProviderEventId: latestStripeEvent?.eventId || null,
          },
          evidence,
        })
      );
    }

    if (wise.completed && (order.status !== "SETTLED" || order.escrowStatus !== "SETTLED")) {
      discrepancies.push(
        makeDiscrepancy({
          code: "TRANSFER_COMPLETED_NO_SETTLEMENT",
          baseSeverity: "WARNING",
          retryable: true,
          order,
          tenantId: input.tenantId || null,
          now,
          referenceAtUtc: wise.atUtc || latestWiseIntent?.updatedAt || order.createdAt,
          providerRefs: {
            stripePaymentIntentId: order.stripePaymentIntentId || null,
            wiseTransferId: latestWiseIntent?.transferId || order.wiseTransferId || null,
            wiseIntentId: latestWiseIntent?.intentId || null,
            latestProviderEventId: wise.eventId || latestWiseEvent?.eventId || null,
          },
          evidence,
        })
      );
    }

    if ((order.status === "SETTLED" || order.escrowStatus === "SETTLED") && !wise.completed) {
      discrepancies.push(
        makeDiscrepancy({
          code: "SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION",
          baseSeverity: "CRITICAL",
          retryable: false,
          order,
          tenantId: input.tenantId || null,
          now,
          referenceAtUtc: order.createdAt,
          providerRefs: {
            stripePaymentIntentId: order.stripePaymentIntentId || null,
            wiseTransferId: order.wiseTransferId || null,
            wiseIntentId: latestWiseIntent?.intentId || null,
            latestProviderEventId: latestWiseEvent?.eventId || null,
          },
          evidence,
        })
      );
    }

    if (shouldCheckIdentity(order)) {
      let computedHash: string | null = null;
      try {
        computedHash = computeOrderPricingSnapshotHash(order);
      } catch {
        computedHash = null;
      }

      const storedHash = String(order.pricingSnapshotHash || "").trim().toLowerCase();
      const normalizedComputed = String(computedHash || "").trim().toLowerCase();
      const matches = storedHash.length > 0 && normalizedComputed.length > 0 && storedHash === normalizedComputed;

      if (!matches) {
        discrepancies.push(
          makeDiscrepancy({
            code: "IDENTITY_MISMATCH",
            baseSeverity: "CRITICAL",
            retryable: false,
            order,
            tenantId: input.tenantId || null,
            now,
            referenceAtUtc: order.createdAt,
            providerRefs: {
              stripePaymentIntentId: order.stripePaymentIntentId || null,
              wiseTransferId: order.wiseTransferId || null,
              wiseIntentId: latestWiseIntent?.intentId || null,
              latestProviderEventId: latestStripeEvent?.eventId || latestWiseEvent?.eventId || null,
            },
            evidence,
            pricingSnapshotHashComputed: computedHash,
          })
        );
      }
    }
  }

  const sortedDiscrepancies = [...discrepancies].sort((left, right) => {
    const severityDiff = severityWeight(right.severity) - severityWeight(left.severity);
    if (severityDiff !== 0) return severityDiff;

    const codeDiff = left.code.localeCompare(right.code);
    if (codeDiff !== 0) return codeDiff;

    const orderDiff = left.orderId.localeCompare(right.orderId);
    if (orderDiff !== 0) return orderDiff;

    return left.discrepancyId.localeCompare(right.discrepancyId);
  });

  const byCode: Record<ReconciliationDiscrepancyCode, number> = {
    PAYMENT_CONFIRMED_NO_ESCROW: 0,
    ESCROW_HELD_NO_PROVIDER_CONFIRMATION: 0,
    TRANSFER_COMPLETED_NO_SETTLEMENT: 0,
    SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION: 0,
    IDENTITY_MISMATCH: 0,
  };

  const bySeverity: Record<ReconciliationSeverity, number> = {
    INFO: 0,
    WARNING: 0,
    CRITICAL: 0,
  };

  for (const discrepancy of sortedDiscrepancies) {
    byCode[discrepancy.code] += 1;
    bySeverity[discrepancy.severity] += 1;
  }

  const summary: ReconciliationSummary = {
    ordersScanned: candidateOrders.length,
    discrepanciesTotal: sortedDiscrepancies.length,
    byCode,
    bySeverity,
  };

  const report: PaymentsReconciliationReport = {
    reportVersion: "payments-reconciliation.v1",
    generatedAtUtc: now.toISOString(),
    source: input.source,
    filters,
    summary,
    discrepancies: sortedDiscrepancies,
    deterministicHashSha256: "",
  };

  report.deterministicHashSha256 = sha256Hex(
    stableStringify({
      filters: report.filters,
      summary: report.summary,
      discrepancies: report.discrepancies,
    })
  );

  return report;
}
