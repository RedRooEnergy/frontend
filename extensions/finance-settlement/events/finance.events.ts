/**
 * Finance & Settlement Audit Events
 * Observational only. No state mutation.
 */

type FinanceAuditEvent = {
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

function emitFinanceAuditEvent(event: FinanceAuditEvent) {
  // Core audit sink injection point (not implemented)
  // Must be captured by Core audit pipeline
  return {
    ...event,
    emitted: true
  };
}

export function emitFinancialCaseListView() {
  return emitFinanceAuditEvent({
    eventType: "FINANCIAL_CASE_LIST_VIEWED",
    timestamp: new Date().toISOString()
  });
}

export function emitFinancialCaseView(caseId: string) {
  return emitFinanceAuditEvent({
    eventType: "FINANCIAL_CASE_VIEWED",
    timestamp: new Date().toISOString(),
    metadata: { caseId }
  });
}
