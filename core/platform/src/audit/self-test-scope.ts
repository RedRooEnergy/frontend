import { emitAuditEvent } from "./audit-logger";

try {
  // @ts-expect-error: missing requestId
  emitAuditEvent({
    eventId: "AUDIT-SCOPE-FAIL-001",
    timestamp: new Date().toISOString(),
    actor: "system",
    action: "INVALID_EVENT",
    resource: "test",
    outcome: "ALLOW",
    severity: "INFO",
    scope: "GOVERNANCE",
  });
  console.error("ERROR: audit scope enforcement failed");
} catch (err) {
  console.log("EXPECTED ERROR:", (err as Error).message);
}
