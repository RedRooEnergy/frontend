import { listActorActions } from "./matrix";
import { appendAuthorizationAudit } from "./audit";
import type { Action, Actor, AuthorizationDecision, ResourceContext, Subject } from "./types";
import { AccessDeniedError } from "./errors";

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

export function evaluateAuthorization(
  actor: Actor,
  subject: Subject,
  action: Action,
  context: ResourceContext = {}
): AuthorizationDecision {
  const allowedActions = listActorActions(actor, subject);
  if (!allowedActions.includes(action)) {
    return { allowed: false, reason: `${actor.roles.join(",")} cannot ${action} ${subject}` };
  }

  if (actor.roles.includes("RRE_CEO") && !actor.roles.includes("RRE_ADMIN") && action !== "READ") {
    return { allowed: false, reason: "RRE_CEO is read-only by policy" };
  }

  const hasSystemWideRole = actor.roles.some((role) => SYSTEM_WIDE_ROLES.has(role));
  if (OWNED_SUBJECTS.has(subject) && context.ownerId && !hasSystemWideRole) {
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
