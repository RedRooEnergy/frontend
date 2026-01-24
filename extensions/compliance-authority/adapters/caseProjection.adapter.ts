/**
 * Compliance Case Projection Adapter
 * Transforms Core compliance case objects into authority-visible projections.
 * No mutation. No inference. No enrichment.
 */

export function projectComplianceCase(coreCase: any) {
  if (!coreCase) {
    return null;
  }

  return {
    caseId: coreCase.id,
    caseType: coreCase.type,
    state: coreCase.state,
    relatedEntity: coreCase.relatedEntity,
    triggerReason: coreCase.triggerReason,
    openedAt: coreCase.openedAt,
    closedAt: coreCase.closedAt ?? null
  };
}
