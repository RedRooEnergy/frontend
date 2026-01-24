/**
 * Records & Evidence Audit Events
 * Observational only. No state mutation.
 */

type RecordsAuditEvent = {
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

function emitRecordsAuditEvent(event: RecordsAuditEvent) {
  // Core audit sink injection point (not implemented)
  // Must be captured by Core audit pipeline
  return {
    ...event,
    emitted: true
  };
}

export function emitRecordListViewed() {
  return emitRecordsAuditEvent({
    eventType: "RECORD_LIST_VIEWED",
    timestamp: new Date().toISOString()
  });
}

export function emitRecordViewed(recordId: string) {
  return emitRecordsAuditEvent({
    eventType: "RECORD_VIEWED",
    timestamp: new Date().toISOString(),
    metadata: { recordId }
  });
}
