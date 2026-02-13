import {
  clearRuntimeMetricEvents,
  listRuntimeMetricEventsByWindow,
  recordRuntimeMetricEvent,
} from "../../lib/payments/metrics/runtime";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function testRuntimeMetricsRingBufferCap() {
  clearRuntimeMetricEvents();

  for (let i = 0; i < 50010; i += 1) {
    recordRuntimeMetricEvent({
      metric: "test_metric",
      atUtc: new Date(1700000000000 + i * 1000).toISOString(),
      labels: { seq: i },
    });
  }

  const rows = listRuntimeMetricEventsByWindow({ limit: 60000 });
  assert(rows.length === 50000, "Expected runtime metric buffer to cap at 50,000 events");

  const oldestSeq = Number(rows[rows.length - 1]?.labels?.seq || -1);
  const newestSeq = Number(rows[0]?.labels?.seq || -1);

  assert(oldestSeq === 10, "Expected oldest retained event sequence to be 10");
  assert(newestSeq === 50009, "Expected newest retained event sequence to be 50009");
}

async function run() {
  await testRuntimeMetricsRingBufferCap();
}

run();
