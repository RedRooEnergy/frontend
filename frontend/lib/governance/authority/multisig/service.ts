import {
  type WriteAdminAuditInput,
  writeAdminAudit,
} from "../../../adminDashboard/auditWriter";
import { assertGovAuth02ActivationBuildEnabled, assertGovAuth02RuntimeActivationForbidden } from "./config";
import { canonicalPayloadHash } from "./hash";
import {
  appendAuthorityMultisigApprovalEntry,
  appendAuthorityMultisigProposal,
  appendAuthorityMultisigQuorumSnapshot,
  buildDeterministicId,
  listAuthorityMultisigApprovalEntriesByProposalId,
} from "./ledgerStore";
import type {
  AuthorityMultisigActor,
  AuthorityMultisigApprovalEntryRecord,
  AuthorityMultisigDecision,
  AuthorityMultisigProposalClass,
  AuthorityMultisigProposalRecord,
  AuthorityMultisigQuorumSnapshotRecord,
} from "./types";

type ServiceDependencies = {
  now: () => Date;
  writeAudit: (input: WriteAdminAuditInput) => Promise<{ auditId: string } | { auditId?: string }>;
};

const defaultDependencies: ServiceDependencies = {
  now: () => new Date(),
  writeAudit: async (input) => writeAdminAudit(input),
};

function resolveDependencies(overrides: Partial<ServiceDependencies> = {}) {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function normalizeReason(value: string) {
  return String(value || "").trim();
}

function ensureReason(value: string) {
  const normalized = normalizeReason(value);
  if (!normalized) {
    throw new Error("GOV_AUTH02_REASON_REQUIRED");
  }
  return normalized;
}

function toAuditActor(actor: AuthorityMultisigActor) {
  return {
    actorId: String(actor.actorId || "").trim(),
    actorRole: String(actor.actorRole || "").trim(),
    email: actor.email ? String(actor.email).trim() : null,
    ip: actor.ip ? String(actor.ip).trim() : null,
    userAgent: actor.userAgent ? String(actor.userAgent).trim() : null,
  };
}

export async function createAuthorityMultisigProposalDraft(
  input: {
    proposalType: AuthorityMultisigProposalClass;
    scope: string;
    actor: AuthorityMultisigActor;
    reason: string;
    evidenceRefs?: Array<{ type: string; refId: string; hash?: string }>;
    proposedChanges?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
  overrides: Partial<ServiceDependencies> = {}
) {
  assertGovAuth02ActivationBuildEnabled(process.env);
  const deps = resolveDependencies(overrides);
  const now = deps.now().toISOString();
  const reason = ensureReason(input.reason);
  const proposedChangesHash = canonicalPayloadHash({
    proposalType: input.proposalType,
    scope: String(input.scope || "").trim(),
    proposedChanges: input.proposedChanges || {},
    evidenceRefs: input.evidenceRefs || [],
  });
  const proposalId = buildDeterministicId("auth02-proposal", `${input.proposalType}:${input.scope}:${proposedChangesHash}`);
  const idempotencyKey = buildDeterministicId("auth02-proposal-idempotency", `${proposalId}:${now}`);

  const record: AuthorityMultisigProposalRecord = {
    proposalId,
    proposalType: input.proposalType,
    scope: String(input.scope || "").trim(),
    submittedBy: {
      actorId: String(input.actor.actorId || "").trim(),
      actorRole: String(input.actor.actorRole || "").trim(),
    },
    createdAtUtc: now,
    status: "DRAFT",
    evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [],
    proposedChangesHash,
    idempotencyKey,
    metadata: {
      buildPhaseOnly: true,
      reason,
      ...(input.metadata || {}),
    },
  };

  await appendAuthorityMultisigProposal(record);

  const audit = await deps.writeAudit({
    actor: toAuditActor(input.actor),
    action: "AUTH02_PROPOSAL_CREATED",
    entity: {
      type: "AuthorityMultisigProposal",
      id: proposalId,
    },
    reason,
    before: null,
    after: record,
    evidence: [{ type: "proposedChangesHash", refId: proposalId, hash: proposedChangesHash }],
  });

  return {
    proposal: record,
    auditId: String((audit as any).auditId || ""),
  };
}

export async function recordAuthorityMultisigApprovalDecision(
  input: {
    proposalId: string;
    actor: AuthorityMultisigActor;
    decision: AuthorityMultisigDecision;
    reason: string;
    metadata?: Record<string, unknown>;
  },
  overrides: Partial<ServiceDependencies> = {}
) {
  assertGovAuth02ActivationBuildEnabled(process.env);
  const deps = resolveDependencies(overrides);
  const reason = ensureReason(input.reason);
  const signedAtUtc = deps.now().toISOString();
  const entryHash = canonicalPayloadHash({
    proposalId: input.proposalId,
    approverId: input.actor.actorId,
    approverRole: input.actor.actorRole,
    decision: input.decision,
    reason,
    signedAtUtc,
  });
  const entryId = buildDeterministicId("auth02-entry", `${input.proposalId}:${input.actor.actorId}:${entryHash}`);
  const idempotencyKey = buildDeterministicId("auth02-entry-idempotency", `${entryId}:${signedAtUtc}`);

  const record: AuthorityMultisigApprovalEntryRecord = {
    entryId,
    proposalId: String(input.proposalId || "").trim(),
    approverId: String(input.actor.actorId || "").trim(),
    approverRole: String(input.actor.actorRole || "").trim(),
    decision: input.decision,
    reason,
    signedAtUtc,
    entryHash,
    idempotencyKey,
    metadata: {
      buildPhaseOnly: true,
      ...(input.metadata || {}),
    },
  };

  await appendAuthorityMultisigApprovalEntry(record);

  const audit = await deps.writeAudit({
    actor: toAuditActor(input.actor),
    action: "AUTH02_APPROVAL_RECORDED",
    entity: {
      type: "AuthorityMultisigApprovalEntry",
      id: entryId,
    },
    reason,
    before: null,
    after: record,
    evidence: [{ type: "entryHash", refId: entryId, hash: entryHash }],
  });

  return {
    entry: record,
    auditId: String((audit as any).auditId || ""),
  };
}

export async function computeAuthorityMultisigQuorumSnapshot(
  input: {
    proposalId: string;
    requiredApprovals: number;
    actor: AuthorityMultisigActor;
    reason: string;
    metadata?: Record<string, unknown>;
  },
  overrides: Partial<ServiceDependencies> = {}
) {
  assertGovAuth02ActivationBuildEnabled(process.env);
  const deps = resolveDependencies(overrides);
  const reason = ensureReason(input.reason);
  const requiredApprovals = Math.max(1, Math.floor(Number(input.requiredApprovals) || 1));
  const approvals = await listAuthorityMultisigApprovalEntriesByProposalId(input.proposalId, { limit: 10_000 });
  const currentApprovals = approvals.filter((entry) => entry.decision === "APPROVE").length;
  const quorumMet = currentApprovals >= requiredApprovals;
  const computedAtUtc = deps.now().toISOString();
  const snapshotHash = canonicalPayloadHash({
    proposalId: input.proposalId,
    requiredApprovals,
    currentApprovals,
    quorumMet,
    computedAtUtc,
  });
  const snapshotId = buildDeterministicId("auth02-quorum", `${input.proposalId}:${snapshotHash}`);
  const idempotencyKey = buildDeterministicId("auth02-quorum-idempotency", `${snapshotId}:${computedAtUtc}`);

  const snapshot: AuthorityMultisigQuorumSnapshotRecord = {
    snapshotId,
    proposalId: String(input.proposalId || "").trim(),
    requiredApprovals,
    currentApprovals,
    quorumMet,
    computedAtUtc,
    snapshotHash,
    idempotencyKey,
    metadata: {
      buildPhaseOnly: true,
      ...(input.metadata || {}),
    },
  };

  await appendAuthorityMultisigQuorumSnapshot(snapshot);

  const audit = await deps.writeAudit({
    actor: toAuditActor(input.actor),
    action: "AUTH02_QUORUM_SNAPSHOT_RECORDED",
    entity: {
      type: "AuthorityMultisigQuorumSnapshot",
      id: snapshotId,
    },
    reason,
    before: null,
    after: snapshot,
    evidence: [{ type: "snapshotHash", refId: snapshotId, hash: snapshotHash }],
  });

  return {
    snapshot,
    auditId: String((audit as any).auditId || ""),
  };
}

export function triggerAuthorityMultisigRuntimeActivation() {
  return assertGovAuth02RuntimeActivationForbidden();
}
