import { AuditEvent } from "./audit-event";

const allowedScopes: Array<AuditEvent["scope"]> = [
  "GOVERNANCE",
  "DATA_MUTATION",
];

function assertAuditScope(scope: AuditEvent["scope"]): void {
  if (!allowedScopes.includes(scope)) {
    throw new Error("[CORE] Invalid or missing audit scope");
  }
}

export function emitAuditEvent(event: AuditEvent): void {
  if (!event.requestId) {
    throw new Error("[CORE] Audit event missing requestId");
  }

  assertAuditScope(event.scope);
  // Core rule: audit is write-only
  // No mutation, no deletion, no conditional suppression
  // Persistence is added later
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(event));
}
