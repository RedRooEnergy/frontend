/**
 * Notification Routes
 * Read-only access to notifications addressed to the authenticated user.
 */

import {
  projectNotification
} from "../adapters/notificationProjection.adapter";

function assertNotificationScope(
  req: any,
  res: any,
  requiredScope: string
): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (!Array.isArray(auth.scopes) || !auth.scopes.includes(requiredScope)) {
    res.status(403).json({ error: "INSUFFICIENT_SCOPE" });
    return false;
  }

  return true;
}

export function registerNotificationRoutes(app: any) {
  app.get("/notifications/health", (_req: any, res: any) => {
    res.json({
      extension: "EXT-13",
      status: "READ_ONLY_ACTIVE"
    });
  });

  app.get("/notifications", (req: any, res: any) => {
    if (!assertNotificationScope(req, res, "NOTIFICATION_VIEW")) return;

    const coreNotifications: any[] = []; // Core injection point (not implemented)

    const projections = coreNotifications.map(n =>
      projectNotification(n)
    );

    res.status(200).json({
      source: "CORE",
      notifications: projections
    });
  });

  app.get("/notifications/:notificationId", (req: any, res: any) => {
    if (!assertNotificationScope(req, res, "NOTIFICATION_VIEW")) return;

    const coreNotification = null; // Core injection point (not implemented)

    const projection = coreNotification
      ? projectNotification(coreNotification)
      : null;

    res.status(200).json({
      source: "CORE",
      notification: projection
    });
  });
}
