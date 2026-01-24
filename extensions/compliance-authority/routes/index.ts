/**
 * EXT-09 Route Registry
 * Read-only Compliance Authority routes.
 */

import { registerComplianceAuthorityRoutes } from "./complianceAuthority.routes";

export function registerEXT09Routes(app: any) {
  registerComplianceAuthorityRoutes(app);
}
