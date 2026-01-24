import { CoreError } from "../../../../core/platform/src/errors/core-error";

export function activateSupplier(
  complianceStatus: "VERIFIED",
  activationStatus: "INACTIVE",
  requestId: string
): "ACTIVE" {
  if (activationStatus === "ACTIVE") {
    throw new CoreError(
      "INVALID_REQUEST",
      "Supplier already active",
      409,
      requestId
    );
  }

  if (complianceStatus !== "VERIFIED") {
    throw new CoreError(
      "INVALID_REQUEST",
      "Compliance not verified",
      409,
      requestId
    );
  }

  return "ACTIVE";
}
