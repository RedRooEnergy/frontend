import type { ReconciliationDiscrepancyCode } from "../reconciliation";
import type { MetricsAgeBucket, MetricsEndpointClass } from "./types";

export const PAYMENTS_METRICS_VERSION = "payments-metrics.v1" as const;

export const METRICS_ENDPOINT_CLASSES: MetricsEndpointClass[] = [
  "stripe.checkout_session_create",
  "stripe.refund_create",
  "wise.transfer_create",
  "wise.transfer_status_poll",
];

export const RECONCILIATION_DISCREPANCY_CODES: ReconciliationDiscrepancyCode[] = [
  "PAYMENT_CONFIRMED_NO_ESCROW",
  "ESCROW_HELD_NO_PROVIDER_CONFIRMATION",
  "TRANSFER_COMPLETED_NO_SETTLEMENT",
  "SETTLEMENT_MARKED_NO_PROVIDER_COMPLETION",
  "IDENTITY_MISMATCH",
];

export const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 3,
  WARNING: 2,
  INFO: 1,
};

export const AGE_BUCKETS: MetricsAgeBucket[] = ["0_15m", "15_60m", "1_6h", "6_24h", "gt_24h"];

export function resolveAgeBucket(ageSeconds: number): MetricsAgeBucket {
  if (ageSeconds <= 15 * 60) return "0_15m";
  if (ageSeconds <= 60 * 60) return "15_60m";
  if (ageSeconds <= 6 * 60 * 60) return "1_6h";
  if (ageSeconds <= 24 * 60 * 60) return "6_24h";
  return "gt_24h";
}

export function resolveEndpointClassFromScope(scope: string): MetricsEndpointClass | null {
  const normalized = String(scope || "").trim().toUpperCase();
  if (normalized === "STRIPE_CHECKOUT_SESSION_CREATE") return "stripe.checkout_session_create";
  if (normalized === "STRIPE_REFUND_CREATE") return "stripe.refund_create";
  if (normalized === "WISE_TRANSFER_CREATE") return "wise.transfer_create";
  return null;
}
