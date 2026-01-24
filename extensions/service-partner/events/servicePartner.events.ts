/**
 * Service Partner Audit Events
 * Observational only. No state mutation.
 */

type ServicePartnerAuditEvent = {
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

function emitServicePartnerAuditEvent(event: ServicePartnerAuditEvent) {
  // Core audit sink injection point (not implemented)
  // Must be captured by Core audit pipeline
  return {
    ...event,
    emitted: true
  };
}

export function emitServicePartnerTaskView(taskId: string) {
  return emitServicePartnerAuditEvent({
    eventType: "SERVICE_PARTNER_TASK_VIEWED",
    timestamp: new Date().toISOString(),
    metadata: { taskId }
  });
}

export function emitServicePartnerTaskListView() {
  return emitServicePartnerAuditEvent({
    eventType: "SERVICE_PARTNER_TASK_LIST_VIEWED",
    timestamp: new Date().toISOString()
  });
}
