/**
 * Freight & Logistics Routes
 * Shipment and consignment visibility only.
 */

import {
  projectShipmentForLogistics
} from "../adapters/shipmentProjection.adapter";

import {
  projectConsignmentForLogistics
} from "../adapters/consignmentProjection.adapter";

import {
  submitLogisticsStatusSignalSkeleton
} from "../signals/statusSignalSkeleton";

function assertLogisticsScope(
  req: any,
  res: any,
  requiredScope: string
): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (auth.role !== "LogisticsOperator") {
    res.status(403).json({ error: "LOGISTICS_OPERATOR_ROLE_REQUIRED" });
    return false;
  }

  if (!Array.isArray(auth.scopes) || !auth.scopes.includes(requiredScope)) {
    res.status(403).json({ error: "INSUFFICIENT_SCOPE" });
    return false;
  }

  return true;
}

export function registerLogisticsRoutes(app: any) {
  app.get("/logistics/health", (_req: any, res: any) => {
    res.json({
      extension: "EXT-10",
      status: "READ_ONLY_ACTIVE"
    });
  });

  app.get("/logistics/shipments", (req: any, res: any) => {
    if (!assertLogisticsScope(req, res, "SHIPMENT_VIEW")) return;

    const coreShipments: any[] = []; // Core injection point (not implemented)

    const projections = coreShipments.map(shipment => ({
      shipment: projectShipmentForLogistics(shipment),
      consignments: (shipment.consignments ?? []).map((c: any) =>
        projectConsignmentForLogistics(c)
      )
    }));

    res.status(200).json({
      source: "CORE",
      shipments: projections
    });
  });

  app.get("/logistics/shipments/:shipmentId", (req: any, res: any) => {
    if (!assertLogisticsScope(req, res, "SHIPMENT_VIEW")) return;

    const coreShipment = null; // Core injection point (not implemented)

    const projection = coreShipment
      ? {
          shipment: projectShipmentForLogistics(coreShipment),
          consignments: (coreShipment.consignments ?? []).map((c: any) =>
            projectConsignmentForLogistics(c)
          )
        }
      : null;

    res.status(200).json({
      source: "CORE",
      shipment: projection
    });
  });

  app.post("/logistics/shipments/:shipmentId/signals", (req: any, res: any) => {
    if (!assertLogisticsScope(req, res, "STATUS_SIGNAL")) return;

    const signalType = req.body?.signalType;
    const metadata = req.body?.metadata ?? {};

    const result = submitLogisticsStatusSignalSkeleton({
      shipmentId: req.params.shipmentId,
      signalType,
      metadata
    });

    if (!result.accepted) {
      return res.status(400).json({
        error: result.reason
      });
    }

    res.status(202).json({
      status: "STATUS_SIGNAL_ACCEPTED",
      source: "LOGISTICS_OPERATOR"
    });
  });

  app.post(
    "/logistics/shipments/:shipmentId/consignments/:consignmentId/signals",
    (req: any, res: any) => {
      if (!assertLogisticsScope(req, res, "STATUS_SIGNAL")) return;

      const signalType = req.body?.signalType;
      const metadata = req.body?.metadata ?? {};

      const result = submitLogisticsStatusSignalSkeleton({
        shipmentId: req.params.shipmentId,
        consignmentId: req.params.consignmentId,
        signalType,
        metadata
      });

      if (!result.accepted) {
        return res.status(400).json({
          error: result.reason
        });
      }

      res.status(202).json({
        status: "STATUS_SIGNAL_ACCEPTED",
        source: "LOGISTICS_OPERATOR"
      });
    }
  );
}
