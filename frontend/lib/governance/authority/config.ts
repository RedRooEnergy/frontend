import { assertHexSha256 } from "./hash";

function parseBoolean(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

export function isAuthorityObserveEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.ENABLE_GOV04_AUTHORITY_OBSERVE);
}

export function isAuthorityShadowEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.ENABLE_GOV04_AUTHORITY_SHADOW);
}

export function isAuthorityShadowCaseScaffoldEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.ENABLE_GOV04_AUTHORITY_SHADOW_CASE_SCAFFOLD);
}

export function isAuthorityShadowMetricsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.ENABLE_GOV04_AUTHORITY_SHADOW_METRICS);
}

export function isAuthorityShadowMetricsRouteEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.ENABLE_GOV04_AUTHORITY_SHADOW_METRICS_ROUTE);
}

export function resolveAuthorityObservePolicyContext(env: NodeJS.ProcessEnv = process.env) {
  const policyId = String(env.GOV04_AUTHORITY_OBSERVE_POLICY_ID || "gov04-authority-observe-default").trim();
  const policyVersionHash = String(env.GOV04_AUTHORITY_OBSERVE_POLICY_VERSION_HASH || "").trim().toLowerCase();

  if (policyVersionHash) {
    assertHexSha256(policyVersionHash, "GOV04_AUTHORITY_OBSERVE_POLICY_VERSION_HASH");
  }

  return {
    policyId,
    policyVersionHash: policyVersionHash || "",
  };
}
