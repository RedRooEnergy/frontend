/**
 * Assignment Projection Adapter
 * Service Partner–visible assignment projection only.
 */

export function projectAssignmentForServicePartner(coreAssignment: any) {
  if (!coreAssignment) {
    return null;
  }

  return {
    assignmentId: coreAssignment.id,
    taskId: coreAssignment.taskId,
    state: coreAssignment.state,
    assignedAt: coreAssignment.assignedAt,
    acknowledgedAt: coreAssignment.acknowledgedAt ?? null,
    completedAt: coreAssignment.completedAt ?? null
  };
}
