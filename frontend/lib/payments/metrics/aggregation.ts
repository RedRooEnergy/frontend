import { sha256Hex, stableStringify } from "../pricingSnapshot";
import type { MetricsCountSeriesPoint, MetricsLatencySeriesPoint } from "./types";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computePercentile(values: number[], percentile: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];

  const index = (percentile / 100) * (sorted.length - 1);
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];

  const weight = index - low;
  return sorted[low] * (1 - weight) + sorted[high] * weight;
}

export function summarizeLatency(values: number[]) {
  if (!values.length) {
    return {
      count: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      minMs: 0,
      maxMs: 0,
    };
  }

  const sanitized = values.map((value) => Math.max(0, toNumber(value))).sort((a, b) => a - b);

  return {
    count: sanitized.length,
    p50Ms: Math.round(computePercentile(sanitized, 50)),
    p95Ms: Math.round(computePercentile(sanitized, 95)),
    p99Ms: Math.round(computePercentile(sanitized, 99)),
    minMs: Math.round(sanitized[0]),
    maxMs: Math.round(sanitized[sanitized.length - 1]),
  };
}

function stableLabelString(labels: Record<string, string>) {
  const sortedEntries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
  return sortedEntries.map(([key, value]) => `${key}=${value}`).join("|");
}

export function sortCountSeries(series: MetricsCountSeriesPoint[]) {
  return [...series].sort((left, right) => {
    const leftKey = stableLabelString(left.labels);
    const rightKey = stableLabelString(right.labels);
    if (leftKey !== rightKey) return leftKey.localeCompare(rightKey);
    if (left.authoritative !== right.authoritative) return left.authoritative ? -1 : 1;
    return left.count - right.count;
  });
}

export function sortLatencySeries(series: MetricsLatencySeriesPoint[]) {
  return [...series].sort((left, right) => {
    if (left.provider !== right.provider) return left.provider.localeCompare(right.provider);
    if (left.endpointClass !== right.endpointClass) return left.endpointClass.localeCompare(right.endpointClass);
    if (left.scope !== right.scope) return left.scope.localeCompare(right.scope);
    if (left.outcome !== right.outcome) return left.outcome.localeCompare(right.outcome);
    if (left.authoritative !== right.authoritative) return left.authoritative ? -1 : 1;
    return left.count - right.count;
  });
}

export function finalizeCountMap(
  map: Map<string, { labels: Record<string, string>; count: number; authoritative: boolean }>
): MetricsCountSeriesPoint[] {
  const rows: MetricsCountSeriesPoint[] = [];
  for (const entry of map.values()) {
    rows.push({
      labels: Object.fromEntries(Object.entries(entry.labels).sort(([left], [right]) => left.localeCompare(right))),
      count: entry.count,
      authoritative: entry.authoritative,
    });
  }
  return sortCountSeries(rows);
}

export function appendCount(
  map: Map<string, { labels: Record<string, string>; count: number; authoritative: boolean }>,
  labels: Record<string, string>,
  authoritative: boolean,
  increment = 1
) {
  const normalizedLabels = Object.fromEntries(
    Object.entries(labels)
      .map(([key, value]) => [key, String(value || "")])
      .sort(([left], [right]) => left.localeCompare(right))
  );

  const key = stableLabelString(normalizedLabels);
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      labels: normalizedLabels,
      count: increment,
      authoritative,
    });
    return;
  }

  existing.count += increment;
  existing.authoritative = existing.authoritative && authoritative;
  map.set(key, existing);
}

export function computeDeterministicHash(input: unknown) {
  return sha256Hex(stableStringify(input));
}
