export type RuntimeMetricEvent = {
  metric: string;
  atUtc: string;
  labels: Record<string, string>;
};

type RuntimeMetricsStore = RuntimeMetricEvent[];
const MAX_RUNTIME_METRIC_EVENTS = 50000;

const globalRuntimeMetrics = globalThis as typeof globalThis & {
  __paymentsRuntimeMetricEvents?: RuntimeMetricsStore;
};

function getStore() {
  if (!globalRuntimeMetrics.__paymentsRuntimeMetricEvents) {
    globalRuntimeMetrics.__paymentsRuntimeMetricEvents = [];
  }
  return globalRuntimeMetrics.__paymentsRuntimeMetricEvents;
}

export function recordRuntimeMetricEvent(input: {
  metric: string;
  atUtc?: string;
  labels?: Record<string, string | number | boolean | null | undefined>;
}) {
  const metric = String(input.metric || "").trim();
  if (!metric) return;

  const atUtc = String(input.atUtc || new Date().toISOString()).trim() || new Date().toISOString();
  const labels = Object.fromEntries(
    Object.entries(input.labels || {})
      .map(([key, value]) => [String(key).trim(), value === null || value === undefined ? "" : String(value)])
      .filter(([key]) => key.length > 0)
      .sort(([left], [right]) => left.localeCompare(right))
  );

  const store = getStore();
  store.push({
    metric,
    atUtc,
    labels,
  });

  // Best-effort ring buffer: keep bounded memory usage under sustained traffic.
  if (store.length > MAX_RUNTIME_METRIC_EVENTS) {
    store.splice(0, store.length - MAX_RUNTIME_METRIC_EVENTS);
  }
}

export function listRuntimeMetricEventsByWindow(params: {
  metric?: string;
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
}): RuntimeMetricEvent[] {
  const metric = String(params.metric || "").trim();
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  const from = fromUtc ? Date.parse(fromUtc) : null;
  const to = toUtc ? Date.parse(toUtc) : null;
  const limit = Math.min(Math.max(Number(params.limit || 5000), 1), MAX_RUNTIME_METRIC_EVENTS);

  return getStore()
    .filter((entry) => {
      if (metric && entry.metric !== metric) return false;
      const at = Date.parse(entry.atUtc);
      if (Number.isFinite(from as number) && Number.isFinite(at) && from !== null && at < from) return false;
      if (Number.isFinite(to as number) && Number.isFinite(at) && to !== null && at > to) return false;
      return true;
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.atUtc) || 0;
      const rightTime = Date.parse(right.atUtc) || 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
      if (left.metric !== right.metric) return left.metric.localeCompare(right.metric);
      return JSON.stringify(left.labels).localeCompare(JSON.stringify(right.labels));
    })
    .slice(0, limit);
}

export function clearRuntimeMetricEvents() {
  globalRuntimeMetrics.__paymentsRuntimeMetricEvents = [];
}
