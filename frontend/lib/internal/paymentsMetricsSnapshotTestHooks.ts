import { runPaymentsMetricsSnapshot } from "../payments/metrics/engine";

type PaymentsMetricsSnapshotRunner = typeof runPaymentsMetricsSnapshot;

let paymentsMetricsSnapshotRunner: PaymentsMetricsSnapshotRunner = runPaymentsMetricsSnapshot;

export function getPaymentsMetricsSnapshotRunner(): PaymentsMetricsSnapshotRunner {
  return paymentsMetricsSnapshotRunner;
}

export function setPaymentsMetricsSnapshotRunnerForTests(runner?: PaymentsMetricsSnapshotRunner) {
  paymentsMetricsSnapshotRunner = runner || runPaymentsMetricsSnapshot;
}
