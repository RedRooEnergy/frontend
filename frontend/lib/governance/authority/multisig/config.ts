import { AuthorityMultisigBuildOnlyError } from "./types";

function parseBoolean(value: string | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

export function isGovAuth02ActivationBuildEnabled(env: NodeJS.ProcessEnv = process.env) {
  return parseBoolean(env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD);
}

export function assertGovAuth02ActivationBuildEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (!isGovAuth02ActivationBuildEnabled(env)) {
    throw new AuthorityMultisigBuildOnlyError(
      "GOV_AUTH02_ACTIVATION_BUILD_DISABLED",
      "EXT-GOV-AUTH-02-ACTIVATION build phase is disabled by feature flag"
    );
  }
}

export function assertGovAuth02RuntimeActivationForbidden(): never {
  throw new AuthorityMultisigBuildOnlyError(
    "GOV_AUTH02_RUNTIME_ACTIVATION_NOT_AUTHORIZED",
    "Runtime activation is not authorized for EXT-GOV-AUTH-02-ACTIVATION"
  );
}
