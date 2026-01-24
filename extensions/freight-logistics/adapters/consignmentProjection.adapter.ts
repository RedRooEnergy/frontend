/**
 * Consignment Projection Adapter
 * Logistics Operator–visible consignment projection only.
 */

export function projectConsignmentForLogistics(coreConsignment: any) {
  if (!coreConsignment) {
    return null;
  }

  return {
    consignmentId: coreConsignment.id,
    shipmentId: coreConsignment.shipmentId,
    state: coreConsignment.state,
    packageCount: coreConsignment.packageCount,
    containerReference: coreConsignment.containerReference ?? null,
    trackingReferences: coreConsignment.trackingReferences ?? []
  };
}
