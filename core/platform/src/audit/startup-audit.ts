import { emitAuditEvent } from "./audit-logger";

export function emitStartupAudit(): void {
  emitAuditEvent({
    eventId: "CORE-STARTUP-001",
    actor: "system",
    action: "CORE_STARTUP",
    resource: "platform",
    outcome: "ALLOW",
    severity: "INFO",
    scope: "GOVERNANCE",
    requestId: "SYSTEM",
  });
}
