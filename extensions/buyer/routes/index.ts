/**
 * EXT-07 Route Registry
 * Read-only buyer routes only.
 */

import { registerBuyerRoutes } from "./buyer.routes";

export function registerEXT07Routes(app: any) {
  registerBuyerRoutes(app);
}
