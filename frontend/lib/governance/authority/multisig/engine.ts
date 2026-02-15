import { assertGovAuth02ActivationBuildEnabled } from "./config";
import { canonicalPayloadHash } from "./hash";
import { AuthorityMultisigBuildOnlyError, type AuthorityMultisigActor, type AuthorityMultisigProposalClass } from "./types";

const AUTH02_RUNTIME_EXECUTION_AUTHORIZED = false as const;

export type AuthorityMultisigExecutionPlanInput = {
  proposalId: string;
  proposalType: AuthorityMultisigProposalClass;
  requiredApprovals: number;
  actor: AuthorityMultisigActor;
  reason: string;
  metadata?: Record<string, unknown>;
};

export type AuthorityMultisigExecutionPlan = {
  planId: string;
  proposalId: string;
  proposalType: AuthorityMultisigProposalClass;
  requiredApprovals: number;
  requestedBy: {
    actorId: string;
    actorRole: string;
  };
  createdAtUtc: string;
  reason: string;
  executionAuthorized: false;
  planHash: string;
  metadata?: Record<string, unknown>;
};

export function isAuthorityMultisigRuntimeExecutionAuthorized() {
  return AUTH02_RUNTIME_EXECUTION_AUTHORIZED;
}

function ensureReason(input: string) {
  const value = String(input || "").trim();
  if (!value) {
    throw new Error("GOV_AUTH02_REASON_REQUIRED");
  }
  return value;
}

function assertRuntimeExecutionAuthorized(): never {
  throw new AuthorityMultisigBuildOnlyError(
    "GOV_AUTH02_RUNTIME_EXECUTION_NOT_AUTHORIZED",
    "Runtime workflow execution is not authorized for EXT-GOV-AUTH-02-ACTIVATION"
  );
}

export function buildAuthorityMultisigExecutionPlan(
  input: AuthorityMultisigExecutionPlanInput,
  deps: { now?: () => Date } = {}
): AuthorityMultisigExecutionPlan {
  assertGovAuth02ActivationBuildEnabled(process.env);
  const reason = ensureReason(input.reason);
  const now = (deps.now || (() => new Date()))().toISOString();
  const requiredApprovals = Math.max(1, Math.floor(Number(input.requiredApprovals) || 1));
  const proposalId = String(input.proposalId || "").trim();

  if (!proposalId) {
    throw new Error("GOV_AUTH02_PROPOSAL_ID_REQUIRED");
  }

  const planHash = canonicalPayloadHash({
    proposalId,
    proposalType: input.proposalType,
    requiredApprovals,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    reason,
    createdAtUtc: now,
    metadata: input.metadata || {},
  });

  const planId = `auth02-plan-${planHash.slice(0, 24)}`;
  return {
    planId,
    proposalId,
    proposalType: input.proposalType,
    requiredApprovals,
    requestedBy: {
      actorId: String(input.actor.actorId || "").trim(),
      actorRole: String(input.actor.actorRole || "").trim(),
    },
    createdAtUtc: now,
    reason,
    executionAuthorized: false,
    planHash,
    metadata: {
      buildPhaseOnly: true,
      ...(input.metadata || {}),
    },
  };
}

export async function executeAuthorityMultisigWorkflow() {
  assertGovAuth02ActivationBuildEnabled(process.env);
  assertRuntimeExecutionAuthorized();
}
