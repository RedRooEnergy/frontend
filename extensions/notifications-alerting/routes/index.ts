/**
 * EXT-13 Route Registry
 * Read-only notification routes.
 */

import { registerNotificationRoutes } from "./notifications.routes";

export function registerEXT13Routes(app: any) {
  registerNotificationRoutes(app);
}
