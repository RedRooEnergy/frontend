import { AuthorizationError } from "../../../../core/platform/src/auth/authorization-error";

export function authorizeCompliance(role: string, requestId: string): void {
  if (role !== "COMPLIANCE_AUTHORITY") {
    throw new AuthorizationError(requestId);
  }
}
