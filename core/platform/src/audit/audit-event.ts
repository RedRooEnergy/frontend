export interface AuditEvent {
  readonly eventId: string;
  readonly timestamp: string;
  readonly actor: string;
  readonly action: string;
  readonly resource: string;
  readonly outcome: "ALLOW" | "DENY";
  readonly severity: "INFO" | "WARN" | "ERROR";
  readonly scope: "GOVERNANCE" | "DATA_MUTATION";
  readonly requestId: string;
}
