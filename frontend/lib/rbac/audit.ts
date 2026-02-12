import crypto from "node:crypto";
import type { Action, Actor, AuthorizationDecision, Subject } from "./types";

export type AuditEntry = {
  id: string;
  timestampUtc: string;
  actorUserId: string;
  actorRole: string;
  actorEmail: string;
  subject: Subject;
  action: Action;
  outcome: "ALLOW" | "DENY";
  reason: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  previousHash: string;
  hash: string;
};

const auditLog: AuditEntry[] = [];
const portalLoginAuditLog: PortalLoginAuditEntry[] = [];
const portalAccessAuditLog: PortalAccessAuditEntry[] = [];

export type PortalLoginAuditEntry = {
  id: string;
  timestampUtc: string;
  actorUserId: string;
  actorRole: string;
  actorEmail: string;
  outcome: "ALLOW" | "DENY";
  reason: string;
  ipAddress: string;
  previousHash: string;
  hash: string;
};

export type PortalAccessAuditEntry = {
  id: string;
  timestampUtc: string;
  actorUserId: string;
  actorRole: string;
  actorEmail: string;
  path: string;
  outcome: "ALLOW" | "DENY";
  reason: string;
  previousHash: string;
  hash: string;
};

function nowIso() {
  return new Date().toISOString();
}

function digest(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function appendAuthorizationAudit(params: {
  actor: Actor;
  subject: Subject;
  action: Action;
  decision: AuthorizationDecision;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const previousHash = auditLog.length ? auditLog[auditLog.length - 1].hash : "GENESIS";
  const timestampUtc = nowIso();
  const outcome = params.decision.allowed ? "ALLOW" : "DENY";
  const resourceId = params.resourceId || "";
  const metadata = params.metadata || {};
  const id = `AUD-${String(auditLog.length + 1).padStart(5, "0")}`;
  const hashInput = JSON.stringify({
    id,
    timestampUtc,
    actorUserId: params.actor.userId,
    actorRole: params.actor.role,
    actorEmail: params.actor.email,
    subject: params.subject,
    action: params.action,
    outcome,
    reason: params.decision.reason,
    resourceId,
    metadata,
    previousHash,
  });
  const hash = digest(hashInput);
  const entry: AuditEntry = Object.freeze({
    id,
    timestampUtc,
    actorUserId: params.actor.userId,
    actorRole: params.actor.role,
    actorEmail: params.actor.email,
    subject: params.subject,
    action: params.action,
    outcome,
    reason: params.decision.reason,
    resourceId,
    metadata,
    previousHash,
    hash,
  });
  auditLog.push(entry);
  return entry;
}

export function getAuditLog() {
  return auditLog.map((entry) => ({ ...entry }));
}

export function appendPortalLoginAudit(params: {
  actorUserId: string;
  actorRole: string;
  actorEmail: string;
  outcome: "ALLOW" | "DENY";
  reason: string;
  ipAddress: string;
}) {
  const previousHash = portalLoginAuditLog.length ? portalLoginAuditLog[portalLoginAuditLog.length - 1].hash : "GENESIS";
  const timestampUtc = nowIso();
  const id = `AUTH-${String(portalLoginAuditLog.length + 1).padStart(5, "0")}`;
  const hash = digest(
    JSON.stringify({
      id,
      timestampUtc,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      actorEmail: params.actorEmail,
      outcome: params.outcome,
      reason: params.reason,
      ipAddress: params.ipAddress,
      previousHash,
    })
  );
  const entry: PortalLoginAuditEntry = Object.freeze({
    id,
    timestampUtc,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    actorEmail: params.actorEmail,
    outcome: params.outcome,
    reason: params.reason,
    ipAddress: params.ipAddress,
    previousHash,
    hash,
  });
  portalLoginAuditLog.push(entry);
  return entry;
}

export function getPortalLoginAuditLog() {
  return portalLoginAuditLog.map((entry) => ({ ...entry }));
}

export function appendPortalAccessAudit(params: {
  actorUserId: string;
  actorRole: string;
  actorEmail: string;
  path: string;
  outcome: "ALLOW" | "DENY";
  reason: string;
}) {
  const previousHash = portalAccessAuditLog.length ? portalAccessAuditLog[portalAccessAuditLog.length - 1].hash : "GENESIS";
  const timestampUtc = nowIso();
  const id = `PACCESS-${String(portalAccessAuditLog.length + 1).padStart(5, "0")}`;
  const hash = digest(
    JSON.stringify({
      id,
      timestampUtc,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      actorEmail: params.actorEmail,
      path: params.path,
      outcome: params.outcome,
      reason: params.reason,
      previousHash,
    })
  );
  const entry: PortalAccessAuditEntry = Object.freeze({
    id,
    timestampUtc,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    actorEmail: params.actorEmail,
    path: params.path,
    outcome: params.outcome,
    reason: params.reason,
    previousHash,
    hash,
  });
  portalAccessAuditLog.push(entry);
  return entry;
}

export function getPortalAccessAuditLog() {
  return portalAccessAuditLog.map((entry) => ({ ...entry }));
}

export function getLastSuccessfulPortalLogin(userId: string) {
  for (let index = portalLoginAuditLog.length - 1; index >= 0; index -= 1) {
    const row = portalLoginAuditLog[index];
    if (row.actorUserId === userId && row.outcome === "ALLOW") {
      return { ...row };
    }
  }
  return null;
}
