/**
 * Record Projection Adapter
 * Transforms Core record objects into portal-visible projections.
 * No mutation. No inference. No enrichment.
 */

export function projectRecord(coreRecord: any) {
  if (!coreRecord) {
    return null;
  }

  return {
    recordId: coreRecord.id,
    recordType: coreRecord.recordType,
    evidenceClass: coreRecord.evidenceClass,
    relatedEntityType: coreRecord.relatedEntityType,
    relatedEntityId: coreRecord.relatedEntityId,
    createdAt: coreRecord.createdAt,
    createdBy: coreRecord.createdBy,
    retentionCategory: coreRecord.retentionCategory,
    legalHold: coreRecord.legalHold === true,
    state: coreRecord.state,
    contentHash: coreRecord.contentHash
  };
}
