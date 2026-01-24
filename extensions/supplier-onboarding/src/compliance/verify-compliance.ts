import { CoreError } from "../../../../core/platform/src/errors/core-error";

export function verifyCompliance(
  current: "UNVERIFIED" | "VERIFIED",
  requestId: string
): "VERIFIED" {
  if (current === "VERIFIED") {
    throw new CoreError(
      "INVALID_REQUEST",
      "Compliance already verified",
      409,
      requestId
    );
  }
  return "VERIFIED";
}
