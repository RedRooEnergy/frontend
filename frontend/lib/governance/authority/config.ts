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

export function isAuthorityEnforcementEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.ENABLE_GOV04_AUTHORITY_ENFORCEMENT);
}

export function isAuthorityEnforcementKillSwitchEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.GOV04_AUTH_ENFORCEMENT_KILL_SWITCH);
}

export function isAuthorityEnforcementStrictMode(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.GOV04_AUTH_ENFORCEMENT_STRICT_MODE);
}

function parseCsvSet(value: string | undefined, lowercase = false) {
  return new Set(
    String(value || "")
      .split(",")
      .map((entry) => (lowercase ? entry.trim().toLowerCase() : entry.trim()))
      .filter(Boolean)
  );
}

export function resolveAuthorityEnforcementAllowlistConfig(env: NodeJS.ProcessEnv = process.env) {
  const policyVersionAllowlist = parseCsvSet(env.GOV04_AUTH_ENFORCE_POLICY_VERSION_ALLOWLIST, true);
  for (const hash of policyVersionAllowlist) {
    assertHexSha256(hash, "GOV04_AUTH_ENFORCE_POLICY_VERSION_ALLOWLIST item");
  }

  return {
    tenantAllowlist: parseCsvSet(env.GOV04_AUTH_ENFORCE_TENANT_ALLOWLIST),
    roleAllowlist: parseCsvSet(env.GOV04_AUTH_ENFORCE_ROLE_ALLOWLIST, true),
    resourceActionAllowlist: parseCsvSet(env.GOV04_AUTH_ENFORCE_RESOURCE_ACTION_ALLOWLIST),
    policyVersionAllowlist,
  };
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
