/**
 * Notifications Audit Events
 * Observational only. No state mutation.
 */

type NotificationAuditEvent = {
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

function emitNotificationAuditEvent(event: NotificationAuditEvent) {
  // Core audit sink injection point (not implemented)
  // Must be captured by Core audit pipeline
  return {
    ...event,
    emitted: true
  };
}

export function emitNotificationListViewed() {
  return emitNotificationAuditEvent({
    eventType: "NOTIFICATION_LIST_VIEWED",
    timestamp: new Date().toISOString()
  });
}

export function emitNotificationViewed(notificationId: string) {
  return emitNotificationAuditEvent({
    eventType: "NOTIFICATION_VIEWED",
    timestamp: new Date().toISOString(),
    metadata: { notificationId }
  });
}
