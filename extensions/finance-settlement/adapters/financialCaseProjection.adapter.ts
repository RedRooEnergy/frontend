/**
 * Financial Case Projection Adapter
 * Transforms Core financial case objects into Finance Authority–visible projections.
 * No mutation. No inference. No enrichment.
 */

export function projectFinancialCase(coreCase: any) {
  if (!coreCase) {
    return null;
  }

  return {
    caseId: coreCase.id,
    caseType: coreCase.type,
    state: coreCase.state,
    transactionReference: coreCase.transactionReference,
    pricingSnapshotRef: coreCase.pricingSnapshotRef,
    openedAt: coreCase.openedAt,
    closedAt: coreCase.closedAt ?? null
  };
}
