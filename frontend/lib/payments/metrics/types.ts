import type { ReconciliationDiscrepancyCode, ReconciliationSeverity } from "../reconciliation";

export type MetricVersion = "payments-metrics.v1";

export type MetricsEndpointClass =
  | "stripe.checkout_session_create"
  | "stripe.refund_create"
  | "wise.transfer_create"
  | "wise.transfer_status_poll";

export type MetricsProvider = "stripe" | "wise";

export type MetricsAgeBucket = "0_15m" | "15_60m" | "1_6h" | "6_24h" | "gt_24h";

export type MetricsSource = "api_internal" | "cli_local" | "cli_http";

export type MetricsSnapshotFilters = {
  fromUtc?: string;
  toUtc?: string;
  limit: number;
  source: MetricsSource;
};

export type MetricsLatencySeriesPoint = {
  provider: MetricsProvider;
  endpointClass: MetricsEndpointClass;
  scope: string;
  outcome: string;
  count: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  authoritative: boolean;
};

export type MetricsCountSeriesPoint = {
  labels: Record<string, string>;
  count: number;
  authoritative: boolean;
};

export type PaymentsMetricsAggregates = {
  providerApiLatency: MetricsLatencySeriesPoint[];
  webhookVerificationFailures: MetricsCountSeriesPoint[];
  webhookDuplicateSuppression: MetricsCountSeriesPoint[];
  idempotencyConflicts: MetricsCountSeriesPoint[];
  wiseIntentLifecycleTiming: MetricsLatencySeriesPoint[];
  wisePollingOutcomes: MetricsCountSeriesPoint[];
  reconciliationRuns: MetricsCountSeriesPoint[];
  reconciliationDiscrepancies: MetricsCountSeriesPoint[];
  reconciliationDiscrepancyAging: MetricsCountSeriesPoint[];
};

export type PaymentsSloResult = {
  sloId: string;
  window: string;
  definition: string;
  target: string;
  measuredValue: number;
  status: "PASS" | "WARN" | "FAIL";
  pagingTrigger: boolean;
  notes?: string;
};

export type PaymentsMetricsSnapshotReport = {
  reportVersion: MetricVersion;
  generatedAtUtc: string;
  windowStartUtc: string;
  windowEndUtc: string;
  filters: MetricsSnapshotFilters;
  aggregates: PaymentsMetricsAggregates;
  slos: PaymentsSloResult[];
  reconciliationHash?: string | null;
  deterministicHashSha256: string;
};

export type ReconciliationSeverityCount = Record<ReconciliationSeverity, number>;
export type ReconciliationCode = ReconciliationDiscrepancyCode;
