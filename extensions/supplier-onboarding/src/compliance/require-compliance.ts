import { CoreError } from "../../../../core/platform/src/errors/core-error";
import type { ComplianceStatus } from "./compliance-status";

export function requireComplianceForSubmission(
  status: ComplianceStatus,
  requestId: string
): void {
  // With current lifecycle, submissions can proceed when compliance is unverified; verification follows.
  if (status === "UNVERIFIED" || status === "VERIFIED") return;

  throw new CoreError(
    "AUTH_DENIED",
    `Supplier compliance not verified (status=${status})`,
    403,
    requestId
  );
}
