/**
 * EXT-12 Route Registry
 * Read-only analytics and reporting routes.
 */

import { registerAnalyticsRoutes } from "./analytics.routes";

export function registerEXT12Routes(app: any) {
  registerAnalyticsRoutes(app);
}
