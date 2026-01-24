/**
 * EXT-14 Route Registry
 * Read-only records and evidence routes.
 */

import { registerRecordsRoutes } from "./records.routes";

export function registerEXT14Routes(app: any) {
  registerRecordsRoutes(app);
}
