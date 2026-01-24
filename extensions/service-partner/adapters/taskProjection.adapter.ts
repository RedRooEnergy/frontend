/**
 * Task Projection Adapter
 * Transforms Core task objects into Service Partner–visible projections.
 * No mutation. No inference. No enrichment.
 */

export function projectTaskForServicePartner(coreTask: any) {
  if (!coreTask) {
    return null;
  }

  return {
    taskId: coreTask.id,
    taskType: coreTask.type,
    state: coreTask.state,
    relatedEntity: coreTask.relatedEntity,
    requiredEvidenceTypes: coreTask.requiredEvidenceTypes ?? [],
    createdAt: coreTask.createdAt,
    closedAt: coreTask.closedAt ?? null
  };
}
