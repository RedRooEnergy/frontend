/**
 * EXT-11 Route Registry
 * Read-only Finance & Settlement routes.
 */

import { registerFinanceAuthorityRoutes } from "./financeAuthority.routes";

export function registerEXT11Routes(app: any) {
  registerFinanceAuthorityRoutes(app);
}
