/**
 * EXT-10 Route Registry
 * Read-only Freight & Logistics routes.
 */

import { registerLogisticsRoutes } from "./logistics.routes";

export function registerEXT10Routes(app: any) {
  registerLogisticsRoutes(app);
}
