import { assertHexSha256 } from "./hash";

function parseBoolean(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

export function isAuthorityObserveEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.ENABLE_GOV04_AUTHORITY_OBSERVE);
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
