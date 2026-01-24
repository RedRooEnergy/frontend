/**
 * Shipment Projection Adapter
 * Transforms Core shipment objects into Logistics Operator–visible projections.
 * No mutation. No inference. No enrichment.
 */

export function projectShipmentForLogistics(coreShipment: any) {
  if (!coreShipment) {
    return null;
  }

  return {
    shipmentId: coreShipment.id,
    shipmentType: coreShipment.type,
    state: coreShipment.state,
    origin: coreShipment.origin,
    destination: coreShipment.destination,
    carrierReferences: coreShipment.carrierReferences ?? [],
    orderReference: coreShipment.orderReference,
    createdAt: coreShipment.createdAt,
    closedAt: coreShipment.closedAt ?? null
  };
}
