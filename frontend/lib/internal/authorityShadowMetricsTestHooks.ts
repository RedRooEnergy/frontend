import { runAuthorityShadowMetricsSnapshot } from "../governance/authority/shadowMetrics";

type MetricsRunner = typeof runAuthorityShadowMetricsSnapshot;

let authorityShadowMetricsRunner: MetricsRunner = runAuthorityShadowMetricsSnapshot;

export function getAuthorityShadowMetricsRunner(): MetricsRunner {
  return authorityShadowMetricsRunner;
}

export function setAuthorityShadowMetricsRunnerForTests(runner?: MetricsRunner) {
  authorityShadowMetricsRunner = runner || runAuthorityShadowMetricsSnapshot;
}
