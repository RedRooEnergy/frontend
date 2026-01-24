/**
 * Buyer Routes — Read-Only
 * No state mutation permitted.
 */

import {
  projectOrderForBuyer
} from "../adapters/orderProjection.adapter";

import {
  projectDocumentsForBuyer
} from "../adapters/documentProjection.adapter";

function assertBuyerReadOnly(req: any, res: any): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (auth.role !== "Buyer") {
    res.status(403).json({ error: "BUYER_ROLE_REQUIRED" });
    return false;
  }

  if (auth.scope !== "READ_ONLY") {
    res.status(403).json({ error: "READ_ONLY_SCOPE_REQUIRED" });
    return false;
  }

  return true;
}

export function registerBuyerRoutes(app: any) {
  app.get("/buyer/health", (_req: any, res: any) => {
    res.json({
      extension: "EXT-07",
      status: "READ_ONLY_ACTIVE"
    });
  });

  app.get("/buyer/orders/:orderId", (req: any, res: any) => {
    if (!assertBuyerReadOnly(req, res)) return;

    const coreOrder = null; // Core injection point (not implemented)

    const projection = projectOrderForBuyer(coreOrder);

    res.status(200).json({
      source: "CORE",
      projection
    });
  });

  app.get("/buyer/orders/:orderId/documents", (req: any, res: any) => {
    if (!assertBuyerReadOnly(req, res)) return;

    const coreDocuments: any[] = []; // Core injection point (not implemented)

    const projection = projectDocumentsForBuyer(coreDocuments);

    res.status(200).json({
      source: "CORE",
      documents: projection
    });
  });
}
