import { writeAdminAudit } from "./auditWriter";
import { createChangeControlEvent, listChangeControlEvents } from "./changeControlStore";

export class GovernanceAdminError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type AdminActor = {
  actorId: string;
  actorRole: string;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

function required(value: string, field: string) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new GovernanceAdminError("ADMIN_GOVERNANCE_INVALID_INPUT", `${field} is required`, 400);
  return normalized;
}

export async function getGovernanceStatusSnapshot() {
  const { getPlatformGovernanceStatus } = await import("../../app/api/governance/platform/_lib");
  return getPlatformGovernanceStatus();
}

export async function triggerGovernanceAudit(input: {
  actor: AdminActor;
  reason: string;
  tenantId?: string | null;
  correlationId?: string | null;
}) {
  const reason = required(input.reason, "reason");
  const audit = await writeAdminAudit({
    actor: input.actor,
    action: "ADMIN_GOVERNANCE_AUDIT_TRIGGERED",
    entity: {
      type: "GOVERNANCE_AUDIT_RUN",
      id: String(input.tenantId || "platform"),
    },
    reason,
    before: null,
    after: {
      mode: "trigger_request",
      tenantId: String(input.tenantId || "platform"),
    },
    correlationId: input.correlationId || null,
    tenantId: String(input.tenantId || "platform"),
  });

  return {
    ok: false,
    status: "NOT_IMPLEMENTED",
    message: "Audit trigger runner is not wired in Phase A",
    runId: null as string | null,
    auditId: audit.auditId,
  };
}

export async function createGovernanceChangeControl(input: {
  actor: AdminActor;
  reason: string;
  rationale: string;
  type: string;
  scope?: { entityType?: string; entityId?: string } | null;
  tenantId?: string | null;
  correlationId?: string | null;
  impactAssessment?: {
    riskLevel?: "LOW" | "MED" | "HIGH";
    rollbackPlan?: string;
    affectedParties?: string[];
  };
}) {
  const reason = required(input.reason, "reason");
  const rationale = required(input.rationale, "rationale");
  const type = required(input.type, "type");

  const audit = await writeAdminAudit({
    actor: input.actor,
    action: "ADMIN_GOVERNANCE_CHANGE_CONTROL_CREATED",
    entity: {
      type: "CHANGE_CONTROL_EVENT",
      id: `${String(input.tenantId || "platform")}:${type.toUpperCase()}`,
    },
    reason,
    before: null,
    after: {
      rationale,
      type: type.toUpperCase(),
      scope: input.scope || null,
      impactAssessment: input.impactAssessment || null,
    },
    correlationId: input.correlationId || null,
    tenantId: String(input.tenantId || "platform"),
  });

  const event = await createChangeControlEvent({
    type,
    reason,
    rationale,
    scope: input.scope || null,
    impactAssessment: input.impactAssessment || null,
    tenantId: input.tenantId || null,
    createdBy: { userId: input.actor.actorId, role: input.actor.actorRole },
    auditId: audit.auditId,
  });

  return {
    ok: true,
    entityId: event.changeControlId,
    auditId: audit.auditId,
    event,
  };
}

export async function getGovernanceChangeControls(input: { tenantId?: string | null; limit?: number } = {}) {
  return listChangeControlEvents(input);
}
