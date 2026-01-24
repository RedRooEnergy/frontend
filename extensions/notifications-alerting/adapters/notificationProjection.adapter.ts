/**
 * Notification Projection Adapter
 * Transforms Core notification objects into user-visible projections.
 * No mutation. No inference. No enrichment.
 */

export function projectNotification(coreNotification: any) {
  if (!coreNotification) {
    return null;
  }

  return {
    notificationId: coreNotification.id,
    category: coreNotification.category,
    title: coreNotification.title,
    message: coreNotification.message,
    createdAt: coreNotification.createdAt,
    deliveryChannel: coreNotification.deliveryChannel,
    state: coreNotification.state,
    templateVersion: coreNotification.templateVersion
  };
}
