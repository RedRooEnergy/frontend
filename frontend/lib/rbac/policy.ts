import { listRoleActions } from "./matrix";
import { appendAuthorizationAudit } from "./audit";
import type { Action, Actor, AuthorizationDecision, ResourceContext, Subject } from "./types";

const OWNED_SUBJECTS = new Set<Subject>([
  "BUYER_ORDERS",
  "BUYER_DOCUMENTS",
  "SUPPLIER_PRODUCTS",
  "SUPPLIER_COMPLIANCE",
  "SUPPLIER_ORDERS",
  "FREIGHT_SHIPMENTS",
  "INSTALLER_CONFIRMATIONS",
  "MARKETING_PROMOTIONS",
  "MARKETING_EMAILS",
  "FINANCE_SETTLEMENTS",
  "FINANCE_PRICING_RULES",
]);

const SYSTEM_WIDE_ROLES = new Set(["RRE_ADMIN", "RRE_CEO"]);

export class AccessDeniedError extends Error {
  status = 403;

  constructor(message: string) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export function evaluateAuthorization(
  actor: Actor,
  subject: Subject,
  action: Action,
  context: ResourceContext = {}
): AuthorizationDecision {
  const allowedActions = listRoleActions(actor.role, subject);
  if (!allowedActions.includes(action)) {
    return { allowed: false, reason: `${actor.role} cannot ${action} ${subject}` };
  }

  if (actor.role === "RRE_CEO" && action !== "READ") {
    return { allowed: false, reason: "RRE_CEO is read-only by policy" };
  }

  if (OWNED_SUBJECTS.has(subject) && context.ownerId && !SYSTEM_WIDE_ROLES.has(actor.role)) {
    if (context.ownerId !== actor.userId) {
      return { allowed: false, reason: "Cross-tenant access denied" };
    }
  }

  return { allowed: true, reason: "Allowed by RBAC matrix" };
}

export function authorizeOrThrow(
  actor: Actor,
  subject: Subject,
  action: Action,
  context: ResourceContext = {}
): AuthorizationDecision {
  const decision = evaluateAuthorization(actor, subject, action, context);
  appendAuthorizationAudit({
    actor,
    subject,
    action,
    decision,
    resourceId: context.resourceId,
    metadata: context.metadata,
  });
  if (!decision.allowed) {
    throw new AccessDeniedError(decision.reason);
  }
  return decision;
}

