/**
 * Buyer Audit Events
 * Observational only. No state mutation.
 */

type BuyerAuditEvent = {
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

function emitBuyerAuditEvent(event: BuyerAuditEvent) {
  // Audit sink injection point (not implemented)
  // Must be captured by Core audit pipeline
  return {
    ...event,
    emitted: true
  };
}

export function emitBuyerViewOrder(orderId: string) {
  return emitBuyerAuditEvent({
    eventType: "BUYER_VIEW_ORDER",
    timestamp: new Date().toISOString(),
    metadata: {
      orderId
    }
  });
}

export function emitBuyerViewDocuments(orderId: string) {
  return emitBuyerAuditEvent({
    eventType: "BUYER_VIEW_DOCUMENTS",
    timestamp: new Date().toISOString(),
    metadata: {
      orderId
    }
  });
}
