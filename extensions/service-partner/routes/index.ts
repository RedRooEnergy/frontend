/**
 * EXT-08 Route Registry
 * Read-only and scoped Service Partner routes.
 */

import { registerServicePartnerRoutes } from "./servicePartner.routes";

export function registerEXT08Routes(app: any) {
  registerServicePartnerRoutes(app);
}
