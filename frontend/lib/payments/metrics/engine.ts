import {
  listPaymentIdempotencyRecordsByWindow,
  type IdempotencyStoreDependencies,
  type PaymentIdempotencyRecord,
} from "../idempotencyStore";
import {
  listPaymentProviderEventsByWindow,
  type ProviderEventStoreDependencies,
} from "../providerEventStore";
import type { PaymentProviderEventRecord } from "../types";
import {
  listWiseTransferIntentsByWindow,
  type WiseTransferIntentRecord,
  type WiseTransferIntentStoreDependencies,
} from "../wiseTransferIntentStore";
import { runPaymentsReconciliation } from "../reconciliation";
import { resolveWiseTransferStateFromProviderStatus } from "../wiseTransferService";
import { AGE_BUCKETS, PAYMENTS_METRICS_VERSION, resolveAgeBucket, resolveEndpointClassFromScope } from "./taxonomy";
import {
  appendCount,
  computeDeterministicHash,
  finalizeCountMap,
  sortLatencySeries,
  summarizeLatency,
} from "./aggregation";
import { listRuntimeMetricEventsByWindow, type RuntimeMetricEvent } from "./runtime";
import type {
  MetricsCountSeriesPoint,
  MetricsEndpointClass,
  MetricsLatencySeriesPoint,
  MetricsSnapshotFilters,
  MetricsSource,
  PaymentsMetricsAggregates,
  PaymentsMetricsSnapshotReport,
  PaymentsSloResult,
} from "./types";

export type PaymentsMetricsEngineDependencies = {
  listIdempotencyRecordsByWindow: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      provider?: "stripe" | "wise";
      scope?: string;
    },
    dependencyOverrides?: Partial<IdempotencyStoreDependencies>
  ) => Promise<PaymentIdempotencyRecord[]>;
  listProviderEventsByWindow: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      provider?: "stripe" | "wise";
    },
    dependencyOverrides?: Partial<ProviderEventStoreDependencies>
  ) => Promise<PaymentProviderEventRecord[]>;
  listWiseIntentsByWindow: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      state?: WiseTransferIntentRecord["state"];
    },
    dependencyOverrides?: Partial<WiseTransferIntentStoreDependencies>
  ) => Promise<WiseTransferIntentRecord[]>;
  listRuntimeMetricEventsByWindow: (params: {
    metric?: string;
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
  }) => RuntimeMetricEvent[];
  runReconciliation: typeof runPaymentsReconciliation;
  now: () => Date;
};

const defaultDependencies: PaymentsMetricsEngineDependencies = {
  listIdempotencyRecordsByWindow: (params, overrides) => listPaymentIdempotencyRecordsByWindow(params as any, overrides),
  listProviderEventsByWindow: (params, overrides) => listPaymentProviderEventsByWindow(params, overrides),
  listWiseIntentsByWindow: (params, overrides) => listWiseTransferIntentsByWindow(params, overrides),
  listRuntimeMetricEventsByWindow,
  runReconciliation: runPaymentsReconciliation,
  now: () => new Date(),
};

function resolveDependencies(
  overrides: Partial<PaymentsMetricsEngineDependencies> = {}
): PaymentsMetricsEngineDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toIsoOrNull(input: unknown): string | null {
  const value = String(input || "").trim();
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function toUnixOrNull(input: unknown): number | null {
  const iso = toIsoOrNull(input);
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function sanitizeFilters(input: {
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
  source?: MetricsSource;
}) {
  const now = new Date();
  const windowEndUtc = toIsoOrNull(input.toUtc) || now.toISOString();
  const defaultStart = new Date(Date.parse(windowEndUtc) - 24 * 60 * 60 * 1000).toISOString();
  const windowStartUtc = toIsoOrNull(input.fromUtc) || defaultStart;
  const source: MetricsSource =
    input.source === "api_internal" || input.source === "cli_http" || input.source === "cli_local"
      ? input.source
      : "api_internal";

  const rawLimit = Number(input.limit || 1000);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.floor(rawLimit), 5000)) : 1000;

  return {
    source,
    fromUtc: windowStartUtc,
    toUtc: windowEndUtc,
    limit,
  };
}

function durationMs(startUtc: string | null | undefined, endUtc: string | null | undefined): number | null {
  const start = toUnixOrNull(startUtc);
  const end = toUnixOrNull(endUtc);
  if (start === null || end === null) return null;
  if (end < start) return null;
  return end - start;
}

function parseEventStatus(event: PaymentProviderEventRecord) {
  const metadataStatus = String(((event.metadata as Record<string, unknown> | undefined)?.status as string) || "").trim();
  const payloadStatus = String(((event.payload as Record<string, unknown> | undefined)?.status as string) || "").trim();
  return metadataStatus || payloadStatus;
}

function getEventAtUtc(event: PaymentProviderEventRecord) {
  return toIsoOrNull(event.occurredAt || event.receivedAt || event.createdAt);
}

function toLabelString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : "unknown";
}

function parseDurationLabel(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function isMetricsEndpointClass(value: string): value is MetricsEndpointClass {
  return (
    value === "stripe.checkout_session_create" ||
    value === "stripe.refund_create" ||
    value === "wise.transfer_create" ||
    value === "wise.transfer_status_poll"
  );
}

function countRuntimeEvents(
  events: RuntimeMetricEvent[],
  labelKeys: string[],
  authoritative: boolean
): MetricsCountSeriesPoint[] {
  const counts = new Map<string, { labels: Record<string, string>; count: number; authoritative: boolean }>();
  for (const event of events) {
    const labels = Object.fromEntries(labelKeys.map((key) => [key, toLabelString(event.labels[key])])) as Record<string, string>;
    appendCount(counts, labels, authoritative, 1);
  }
  return finalizeCountMap(counts);
}

function toLatencySeries(
  map: Map<
    string,
    {
      provider: "stripe" | "wise";
      endpointClass: MetricsLatencySeriesPoint["endpointClass"];
      scope: string;
      outcome: string;
      authoritative: boolean;
      durations: number[];
    }
  >
): MetricsLatencySeriesPoint[] {
  const series: MetricsLatencySeriesPoint[] = [];
  for (const value of map.values()) {
    const summary = summarizeLatency(value.durations);
    series.push({
      provider: value.provider,
      endpointClass: value.endpointClass,
      scope: value.scope,
      outcome: value.outcome,
      count: summary.count,
      p50Ms: summary.p50Ms,
      p95Ms: summary.p95Ms,
      p99Ms: summary.p99Ms,
      minMs: summary.minMs,
      maxMs: summary.maxMs,
      authoritative: value.authoritative,
    });
  }
  return sortLatencySeries(series);
}

function findP95(series: MetricsLatencySeriesPoint[], endpointClass: MetricsLatencySeriesPoint["endpointClass"]) {
  const matched = series.filter((entry) => entry.endpointClass === endpointClass && entry.authoritative);
  if (!matched.length) return 0;

  // Weighted by count using expanded approximation.
  const pool: number[] = [];
  for (const entry of matched) {
    for (let i = 0; i < entry.count; i += 1) {
      pool.push(entry.p95Ms);
    }
  }
  return summarizeLatency(pool).p95Ms;
}

function findP95ByOutcomePrefix(series: MetricsLatencySeriesPoint[], outcomePrefix: string) {
  const matched = series.filter((entry) => entry.outcome.startsWith(outcomePrefix) && entry.authoritative);
  if (!matched.length) return 0;

  const pool: number[] = [];
  for (const entry of matched) {
    for (let i = 0; i < entry.count; i += 1) {
      pool.push(entry.p95Ms);
    }
  }
  return summarizeLatency(pool).p95Ms;
}

function createSloResult(input: {
  sloId: string;
  window: string;
  definition: string;
  target: string;
  measuredValue: number;
  passThreshold: number;
  warnThreshold?: number;
  comparator: "lte" | "lt";
  pagingThreshold?: number;
  pagingComparator?: "gte" | "gt";
  notes?: string;
}): PaymentsSloResult {
  const cmp = input.comparator;
  let pass = false;
  if (cmp === "lte") pass = input.measuredValue <= input.passThreshold;
  if (cmp === "lt") pass = input.measuredValue < input.passThreshold;

  let status: PaymentsSloResult["status"] = "PASS";
  if (!pass) {
    const warnThreshold = input.warnThreshold;
    if (warnThreshold !== undefined) {
      if (cmp === "lte") status = input.measuredValue <= warnThreshold ? "WARN" : "FAIL";
      if (cmp === "lt") status = input.measuredValue < warnThreshold ? "WARN" : "FAIL";
    } else {
      status = "FAIL";
    }
  }

  let pagingTrigger = false;
  if (input.pagingThreshold !== undefined) {
    const pagingComparator = input.pagingComparator || "gte";
    if (pagingComparator === "gte") pagingTrigger = input.measuredValue >= input.pagingThreshold;
    if (pagingComparator === "gt") pagingTrigger = input.measuredValue > input.pagingThreshold;
  }

  return {
    sloId: input.sloId,
    window: input.window,
    definition: input.definition,
    target: input.target,
    measuredValue: Number(input.measuredValue.toFixed(4)),
    status,
    pagingTrigger,
    notes: input.notes,
  };
}

export async function runPaymentsMetricsSnapshot(
  input: {
    source?: MetricsSource;
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
  },
  dependencyOverrides: Partial<PaymentsMetricsEngineDependencies> = {}
): Promise<PaymentsMetricsSnapshotReport> {
  const deps = resolveDependencies(dependencyOverrides);
  const now = deps.now();
  const filters = sanitizeFilters(input);

  const idempotencyRecords = await deps.listIdempotencyRecordsByWindow({
    fromUtc: filters.fromUtc,
    toUtc: filters.toUtc,
    limit: filters.limit,
  });

  const providerEvents = await deps.listProviderEventsByWindow({
    fromUtc: filters.fromUtc,
    toUtc: filters.toUtc,
    limit: filters.limit,
  });

  const wiseIntents = await deps.listWiseIntentsByWindow({
    fromUtc: filters.fromUtc,
    toUtc: filters.toUtc,
    limit: filters.limit,
  });

  const runtimeEvents = deps.listRuntimeMetricEventsByWindow({
    fromUtc: filters.fromUtc,
    toUtc: filters.toUtc,
    limit: filters.limit,
  });

  const providerLatencyMap = new Map<
    string,
    {
      provider: "stripe" | "wise";
      endpointClass: MetricsLatencySeriesPoint["endpointClass"];
      scope: string;
      outcome: string;
      authoritative: boolean;
      durations: number[];
    }
  >();

  for (const record of idempotencyRecords) {
    const endpointClass = resolveEndpointClassFromScope(record.scope);
    if (!endpointClass) continue;

    const provider = record.provider;
    if (provider !== "stripe" && provider !== "wise") continue;

    const duration = durationMs(record.createdAt, record.updatedAt);
    if (duration === null) continue;

    const outcome = toLabelString(record.status);
    const key = `${provider}|${endpointClass}|${record.scope}|${outcome}|auth:1`;
    if (!providerLatencyMap.has(key)) {
      providerLatencyMap.set(key, {
        provider,
        endpointClass,
        scope: String(record.scope || ""),
        outcome,
        authoritative: true,
        durations: [],
      });
    }

    providerLatencyMap.get(key)!.durations.push(duration);
  }

  for (const event of runtimeEvents) {
    if (event.metric !== "payments_metrics_provider_latency") continue;

    const providerLabel = String(event.labels.provider || "").trim() as "stripe" | "wise";
    if (providerLabel !== "stripe" && providerLabel !== "wise") continue;

    const endpointClassLabel = String(event.labels.endpointClass || "").trim();
    if (!isMetricsEndpointClass(endpointClassLabel)) continue;

    const duration = parseDurationLabel(event.labels.durationMs);
    if (duration === null) continue;

    const scope = String(event.labels.scope || "runtime").trim() || "runtime";
    const outcome = String(event.labels.outcome || "observed").trim() || "observed";
    const key = `${providerLabel}|${endpointClassLabel}|${scope}|${outcome}|auth:0`;

    if (!providerLatencyMap.has(key)) {
      providerLatencyMap.set(key, {
        provider: providerLabel,
        endpointClass: endpointClassLabel,
        scope,
        outcome,
        authoritative: false,
        durations: [],
      });
    }

    providerLatencyMap.get(key)!.durations.push(duration);
  }

  const providerApiLatency = toLatencySeries(providerLatencyMap);

  const verificationFailures = countRuntimeEvents(
    runtimeEvents.filter((entry) => entry.metric === "payments_metrics_webhook_verification_failed"),
    ["provider", "route", "failureCode"],
    false
  );

  const duplicateSuppression = countRuntimeEvents(
    runtimeEvents.filter((entry) => entry.metric === "payments_metrics_webhook_duplicate_suppressed"),
    ["provider", "route", "eventType"],
    false
  );

  const idempotencyConflicts = countRuntimeEvents(
    runtimeEvents.filter((entry) => entry.metric === "payments_metrics_idempotency_conflict"),
    ["provider", "scope", "conflictClass"],
    false
  );

  const wiseIntentTimingMap = new Map<
    string,
    {
      provider: "stripe" | "wise";
      endpointClass: MetricsLatencySeriesPoint["endpointClass"];
      scope: string;
      outcome: string;
      authoritative: boolean;
      durations: number[];
    }
  >();

  const wiseEventsByTransferId = new Map<string, PaymentProviderEventRecord[]>();
  for (const event of providerEvents) {
    if (event.provider !== "wise") continue;
    const transferId = String(event.transferId || "").trim();
    if (!transferId) continue;
    const list = wiseEventsByTransferId.get(transferId) || [];
    list.push(event);
    wiseEventsByTransferId.set(transferId, list);
  }

  for (const intent of wiseIntents) {
    const createdAt = toIsoOrNull(intent.createdAt);
    if (!createdAt) continue;

    const transferEvents = intent.transferId ? wiseEventsByTransferId.get(intent.transferId) || [] : [];
    let acceptedAt: string | null = null;
    let completedAt: string | null = null;

    for (const event of transferEvents) {
      const eventTime = getEventAtUtc(event);
      if (!eventTime) continue;

      if (event.eventType === "transfer.accepted") {
        if (!acceptedAt || Date.parse(eventTime) < Date.parse(acceptedAt)) {
          acceptedAt = eventTime;
        }
      }

      const status = parseEventStatus(event);
      if (status) {
        const resolved = resolveWiseTransferStateFromProviderStatus(status);
        if (resolved.terminalState === "COMPLETED") {
          if (!completedAt || Date.parse(eventTime) < Date.parse(completedAt)) {
            completedAt = eventTime;
          }
        }
      }
    }

    if (!acceptedAt && intent.state === "ACCEPTED" && intent.providerStatusAtUtc) {
      acceptedAt = toIsoOrNull(intent.providerStatusAtUtc);
    }

    if (!completedAt && intent.state === "COMPLETED") {
      completedAt = toIsoOrNull(intent.providerStatusAtUtc || intent.updatedAt);
    }

    const createdToAccepted = durationMs(createdAt, acceptedAt);
    if (createdToAccepted !== null) {
      const key = "INTENT_CREATED_TO_ACCEPTED|observed";
      if (!wiseIntentTimingMap.has(key)) {
        wiseIntentTimingMap.set(key, {
          provider: "wise",
          endpointClass: "wise.transfer_create",
          scope: "WISE_TRANSFER_CREATE",
          outcome: "INTENT_CREATED_TO_ACCEPTED:observed",
          authoritative: true,
          durations: [],
        });
      }
      wiseIntentTimingMap.get(key)!.durations.push(createdToAccepted);
    }

    const acceptedToCompleted = durationMs(acceptedAt, completedAt);
    if (acceptedToCompleted !== null) {
      const key = "ACCEPTED_TO_COMPLETED|observed";
      if (!wiseIntentTimingMap.has(key)) {
        wiseIntentTimingMap.set(key, {
          provider: "wise",
          endpointClass: "wise.transfer_create",
          scope: "WISE_TRANSFER_CREATE",
          outcome: "ACCEPTED_TO_COMPLETED:observed",
          authoritative: true,
          durations: [],
        });
      }
      wiseIntentTimingMap.get(key)!.durations.push(acceptedToCompleted);
    }
  }

  const wiseIntentLifecycleTiming = toLatencySeries(wiseIntentTimingMap);

  const wisePollingOutcomesMap = new Map<string, { labels: Record<string, string>; count: number; authoritative: boolean }>();
  const pollingRuntimeEvents = runtimeEvents.filter((entry) => entry.metric === "payments_metrics_wise_polling_outcome");
  for (const event of pollingRuntimeEvents) {
    appendCount(
      wisePollingOutcomesMap,
      {
        outcome: toLabelString(event.labels.outcome),
        state: toLabelString(event.labels.state),
        source: "runtime",
      },
      false,
      1
    );
  }

  const timedOutIntents = wiseIntents.filter((intent) => intent.state === "TIMED_OUT").length;
  if (timedOutIntents > 0) {
    appendCount(
      wisePollingOutcomesMap,
      {
        outcome: "TIMEOUT",
        state: "TIMED_OUT",
        source: "ledger",
      },
      true,
      timedOutIntents
    );
  }

  const wisePollingOutcomes = finalizeCountMap(wisePollingOutcomesMap);

  const reconciliationReport = await deps.runReconciliation({
    source: "api_internal",
    filters: {
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
    },
  });

  const reconciliationRunsMap = new Map<string, { labels: Record<string, string>; count: number; authoritative: boolean }>();
  appendCount(
    reconciliationRunsMap,
    {
      source: reconciliationReport.source,
      outcome: "SUCCESS",
    },
    true,
    1
  );
  const reconciliationRuns = finalizeCountMap(reconciliationRunsMap);

  const reconciliationDiscrepanciesMap = new Map<string, { labels: Record<string, string>; count: number; authoritative: boolean }>();
  const reconciliationAgingMap = new Map<string, { labels: Record<string, string>; count: number; authoritative: boolean }>();

  for (const discrepancy of reconciliationReport.discrepancies) {
    appendCount(
      reconciliationDiscrepanciesMap,
      {
        code: discrepancy.code,
        severity: discrepancy.severity,
        retryable: String(discrepancy.retryable),
        manualReviewRequired: String(discrepancy.manualReviewRequired),
      },
      true,
      1
    );

    const eventAt = toUnixOrNull(discrepancy.evidence?.eventOccurredAtUtc || discrepancy.detectedAtUtc) || now.getTime();
    const ageSeconds = Math.max(0, Math.floor((now.getTime() - eventAt) / 1000));
    const bucket = resolveAgeBucket(ageSeconds);

    appendCount(
      reconciliationAgingMap,
      {
        code: discrepancy.code,
        severity: discrepancy.severity,
        ageBucket: bucket,
      },
      true,
      1
    );
  }

  for (const code of Object.keys(reconciliationReport.summary.byCode)) {
    if ((reconciliationReport.summary.byCode as Record<string, number>)[code] > 0) continue;
    // Keep zero-series out of report by default.
  }

  const reconciliationDiscrepancies = finalizeCountMap(reconciliationDiscrepanciesMap);
  const reconciliationDiscrepancyAging = finalizeCountMap(reconciliationAgingMap).sort((left, right) => {
    const codeDiff = left.labels.code.localeCompare(right.labels.code);
    if (codeDiff !== 0) return codeDiff;
    const severityDiff = left.labels.severity.localeCompare(right.labels.severity);
    if (severityDiff !== 0) return severityDiff;
    return AGE_BUCKETS.indexOf(left.labels.ageBucket as any) - AGE_BUCKETS.indexOf(right.labels.ageBucket as any);
  });

  const aggregates: PaymentsMetricsAggregates = {
    providerApiLatency,
    webhookVerificationFailures: verificationFailures,
    webhookDuplicateSuppression: duplicateSuppression,
    idempotencyConflicts,
    wiseIntentLifecycleTiming,
    wisePollingOutcomes,
    reconciliationRuns,
    reconciliationDiscrepancies,
    reconciliationDiscrepancyAging,
  };

  const totalWebhookVerificationFailures = verificationFailures.reduce((sum, row) => sum + row.count, 0);
  const totalWebhookProcessed = providerEvents.length;
  const webhookFailRatePercent =
    totalWebhookVerificationFailures + totalWebhookProcessed > 0
      ? (totalWebhookVerificationFailures / (totalWebhookVerificationFailures + totalWebhookProcessed)) * 100
      : 0;

  const totalWiseIntents = wiseIntents.length;
  const wiseTimeoutRatePercent = totalWiseIntents > 0 ? (timedOutIntents / totalWiseIntents) * 100 : 0;

  const criticalDiscrepancies = reconciliationReport.discrepancies.filter((entry) => entry.severity === "CRITICAL").length;
  const criticalDensityPerThousand =
    reconciliationReport.summary.ordersScanned > 0
      ? (criticalDiscrepancies / reconciliationReport.summary.ordersScanned) * 1000
      : 0;

  const settlementContradictions = reconciliationReport.summary.byCode.SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION || 0;

  const slos: PaymentsSloResult[] = [
    createSloResult({
      sloId: "SLO-STRIPE-CHECKOUT-LATENCY",
      window: "rolling_1h",
      definition: "p95 latency for stripe.checkout_session_create",
      target: "<=2000ms",
      measuredValue: findP95(providerApiLatency, "stripe.checkout_session_create"),
      comparator: "lte",
      passThreshold: 2000,
      warnThreshold: 3000,
      pagingThreshold: 3000,
      pagingComparator: "gt",
    }),
    createSloResult({
      sloId: "SLO-STRIPE-REFUND-LATENCY",
      window: "rolling_1h",
      definition: "p95 latency for stripe.refund_create",
      target: "<=3000ms",
      measuredValue: findP95(providerApiLatency, "stripe.refund_create"),
      comparator: "lte",
      passThreshold: 3000,
      warnThreshold: 5000,
      pagingThreshold: 5000,
      pagingComparator: "gt",
    }),
    createSloResult({
      sloId: "SLO-WEBHOOK-VERIFY-FAIL-RATE",
      window: "rolling_15m",
      definition: "webhook verification failures / webhook requests",
      target: "<0.5%",
      measuredValue: webhookFailRatePercent,
      comparator: "lt",
      passThreshold: 0.5,
      warnThreshold: 2,
      pagingThreshold: 2,
      pagingComparator: "gt",
      notes: "Best-effort runtime counter in numerator",
    }),
    createSloResult({
      sloId: "SLO-WISE-ACCEPTANCE-LATENCY",
      window: "rolling_24h",
      definition: "p95 INTENT_CREATED->ACCEPTED",
      target: "<=300000ms",
      measuredValue: findP95ByOutcomePrefix(wiseIntentLifecycleTiming, "INTENT_CREATED_TO_ACCEPTED"),
      comparator: "lte",
      passThreshold: 300000,
      warnThreshold: 600000,
      pagingThreshold: 600000,
      pagingComparator: "gt",
    }),
    createSloResult({
      sloId: "SLO-WISE-COMPLETION-LATENCY",
      window: "rolling_24h",
      definition: "p95 ACCEPTED->COMPLETED",
      target: "<=3600000ms",
      measuredValue: findP95ByOutcomePrefix(wiseIntentLifecycleTiming, "ACCEPTED_TO_COMPLETED"),
      comparator: "lte",
      passThreshold: 3600000,
      warnThreshold: 10800000,
      pagingThreshold: 10800000,
      pagingComparator: "gt",
    }),
    createSloResult({
      sloId: "SLO-WISE-TIMEOUT-RATE",
      window: "rolling_1h",
      definition: "timed_out intents / total intents",
      target: "<1%",
      measuredValue: wiseTimeoutRatePercent,
      comparator: "lt",
      passThreshold: 1,
      warnThreshold: 2,
      pagingThreshold: 2,
      pagingComparator: "gt",
    }),
    createSloResult({
      sloId: "SLO-RECON-CRITICAL-DENSITY",
      window: "per_run",
      definition: "critical discrepancies per 1000 scanned orders",
      target: "<1",
      measuredValue: criticalDensityPerThousand,
      comparator: "lt",
      passThreshold: 1,
      warnThreshold: 5,
      pagingThreshold: 5,
      pagingComparator: "gt",
    }),
    createSloResult({
      sloId: "SLO-RECON-SETTLEMENT-CONTRADICTION",
      window: "per_run",
      definition: "SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION count",
      target: "=0",
      measuredValue: settlementContradictions,
      comparator: "lte",
      passThreshold: 0,
      warnThreshold: 0,
      pagingThreshold: 1,
      pagingComparator: "gte",
    }),
  ].sort((left, right) => left.sloId.localeCompare(right.sloId));

  const report: PaymentsMetricsSnapshotReport = {
    reportVersion: PAYMENTS_METRICS_VERSION,
    generatedAtUtc: now.toISOString(),
    windowStartUtc: filters.fromUtc,
    windowEndUtc: filters.toUtc,
    filters: {
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      source: filters.source,
    } as MetricsSnapshotFilters,
    aggregates,
    slos,
    reconciliationHash: reconciliationReport.deterministicHashSha256,
    deterministicHashSha256: "",
  };

  report.deterministicHashSha256 = computeDeterministicHash({
    filters: report.filters,
    aggregates: report.aggregates,
    slos: report.slos,
  });

  return report;
}
