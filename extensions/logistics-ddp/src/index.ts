export const EXTENSION_ID = "EXT-03";

export function registerLogisticsDDP(): void {
  // Registration only. No side effects here.
}

import { calculateDDPRoute } from "./routes/calculate-ddp.route";

export function registerLogisticsDDPRoutes(app: any): void {
  app.post("/logistics/ddp/calculate", calculateDDPRoute);
}
