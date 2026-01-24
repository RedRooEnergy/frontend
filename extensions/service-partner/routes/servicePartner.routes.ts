/**
 * Service Partner Routes
 * Read-only views and scoped acknowledgements only.
 */

import {
  projectTaskForServicePartner
} from "../adapters/taskProjection.adapter";

import {
  projectAssignmentForServicePartner
} from "../adapters/assignmentProjection.adapter";

import {
  submitEvidenceSkeleton
} from "../evidence/evidenceSubmission";

function assertServicePartnerScope(
  req: any,
  res: any,
  requiredScope: string
): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (auth.role !== "ServicePartner") {
    res.status(403).json({ error: "SERVICE_PARTNER_ROLE_REQUIRED" });
    return false;
  }

  if (!Array.isArray(auth.scopes) || !auth.scopes.includes(requiredScope)) {
    res.status(403).json({ error: "INSUFFICIENT_SCOPE" });
    return false;
  }

  return true;
}

export function registerServicePartnerRoutes(app: any) {
  app.get("/service-partner/health", (_req: any, res: any) => {
    res.json({
      extension: "EXT-08",
      status: "READ_ONLY_ACTIVE"
    });
  });

  app.get("/service-partner/tasks", (req: any, res: any) => {
    if (!assertServicePartnerScope(req, res, "TASK_VIEW")) return;

    const coreTasks: any[] = []; // Core injection point (not implemented)

    const projections = coreTasks.map(task => ({
      task: projectTaskForServicePartner(task),
      assignment: projectAssignmentForServicePartner(task.assignment)
    }));

    res.status(200).json({
      source: "CORE",
      tasks: projections
    });
  });

  app.get("/service-partner/tasks/:taskId", (req: any, res: any) => {
    if (!assertServicePartnerScope(req, res, "TASK_VIEW")) return;

    const coreTask = null; // Core injection point (not implemented)

    const projection = coreTask
      ? {
          task: projectTaskForServicePartner(coreTask),
          assignment: projectAssignmentForServicePartner(coreTask.assignment)
        }
      : null;

    res.status(200).json({
      source: "CORE",
      task: projection
    });
  });

  app.post("/service-partner/tasks/:taskId/evidence", (req: any, res: any) => {
    if (!assertServicePartnerScope(req, res, "EVIDENCE_SUBMIT")) return;

    const assignmentId = req.body?.assignmentId;
    const evidenceType = req.body?.evidenceType;
    const metadata = req.body?.metadata ?? {};

    const result = submitEvidenceSkeleton({
      taskId: req.params.taskId,
      assignmentId,
      evidenceType,
      metadata
    });

    if (!result.accepted) {
      return res.status(400).json({
        error: result.reason
      });
    }

    res.status(202).json({
      status: "EVIDENCE_METADATA_ACCEPTED",
      source: "CORE"
    });
  });
}
