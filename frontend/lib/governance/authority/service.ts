import {
  appendAuthorityApprovalDecision,
  type AppendAuthorityApprovalDecisionInput,
  type AuthorityDecisionStoreDependencies,
} from "./decisionStore";
import {
  appendAuthorityDelegationEvent,
  type AppendAuthorityDelegationEventInput,
  type AuthorityDelegationStoreDependencies,
} from "./delegationStore";
import {
  appendAuthorityPolicyLifecycleEvent,
  registerAuthorityPolicyVersion,
  type AppendAuthorityPolicyLifecycleEventInput,
  type AuthorityPolicyStoreDependencies,
  type RegisterAuthorityPolicyVersionInput,
} from "./policyStore";
import { canonicalPayloadHash } from "./hash";
import { isAuthorityObserveEnabled, resolveAuthorityObservePolicyContext } from "./config";
import type {
  AuthorityActorChain,
  AuthorityApprovalDecisionRecord,
  AuthorityObserveDecisionInput,
} from "./types";

type AuthorityLogger = Pick<typeof console, "info" | "warn" | "error">;

export type AuthorityServiceDependencies = {
  now: () => Date;
  registerPolicyVersion: (
    input: RegisterAuthorityPolicyVersionInput,
    deps?: Partial<AuthorityPolicyStoreDependencies>
  ) => Promise<{ created: boolean; record: any }>;
  appendPolicyLifecycleEvent: (
    input: AppendAuthorityPolicyLifecycleEventInput,
    deps?: Partial<AuthorityPolicyStoreDependencies>
  ) => Promise<{ created: boolean; record: any }>;
  appendDelegationEvent: (
    input: AppendAuthorityDelegationEventInput,
    deps?: Partial<AuthorityDelegationStoreDependencies>
  ) => Promise<{ created: boolean; record: any }>;
  appendApprovalDecision: (
    input: AppendAuthorityApprovalDecisionInput,
    deps?: Partial<AuthorityDecisionStoreDependencies>
  ) => Promise<{ created: boolean; record: AuthorityApprovalDecisionRecord }>;
  isObserveEnabled: () => boolean;
  resolveObservePolicyContext: () => { policyId: string; policyVersionHash: string };
  logger: AuthorityLogger;
};

const defaultDependencies: AuthorityServiceDependencies = {
  now: () => new Date(),
  registerPolicyVersion: (input, deps) => registerAuthorityPolicyVersion(input, deps),
  appendPolicyLifecycleEvent: (input, deps) => appendAuthorityPolicyLifecycleEvent(input, deps),
  appendDelegationEvent: (input, deps) => appendAuthorityDelegationEvent(input, deps),
  appendApprovalDecision: (input, deps) => appendAuthorityApprovalDecision(input, deps),
  isObserveEnabled: () => isAuthorityObserveEnabled(process.env),
  resolveObservePolicyContext: () => resolveAuthorityObservePolicyContext(process.env),
  logger: console,
};

function resolveDependencies(overrides: Partial<AuthorityServiceDependencies> = {}): AuthorityServiceDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toDecision(observed: AuthorityObserveDecisionInput["observedDecision"]) {
  return observed === "WOULD_DENY" ? "OBSERVED_DENY" : "OBSERVED_ALLOW";
}

function buildDefaultObservePolicy(policyId: string) {
  return {
    policyId,
    mode: "OBSERVE_ONLY",
    decisionSemantics: "non_blocking",
    defaultBehavior: "would_allow",
    createdBy: "gov04_authority_observe_bootstrap",
  };
}

async function resolvePolicyReference(
  input: AuthorityObserveDecisionInput,
  deps: AuthorityServiceDependencies
): Promise<{ policyId: string; policyVersionHash: string }> {
  const configured = deps.resolveObservePolicyContext();
  const policyId = String(input.policyId || configured.policyId || "gov04-authority-observe-default").trim();
  const explicitPolicyVersionHash = String(input.policyVersionHash || configured.policyVersionHash || "")
    .trim()
    .toLowerCase();

  if (explicitPolicyVersionHash) {
    return {
      policyId,
      policyVersionHash: explicitPolicyVersionHash,
    };
  }

  const policy = buildDefaultObservePolicy(policyId);
  const policyVersion = await deps.registerPolicyVersion({
    policyId,
    policySchemaVersion: "gov04-authority-policy.v1",
    policy,
    createdByRole: "system",
    createdById: "gov04-authority-observe",
    createdAtUtc: deps.now().toISOString(),
    metadata: {
      source: "observe_fallback",
      deterministicFallbackHash: canonicalPayloadHash(policy),
    },
  });

  return {
    policyId: policyVersion.record.policyId,
    policyVersionHash: policyVersion.record.policyVersionHash,
  };
}

function normalizeActorChain(input: {
  policyVersionHash: string;
  requestActorId: string;
  requestActorRole: AuthorityActorChain["requestActorRole"];
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorChain["approverActorRole"];
  delegationId?: string | null;
  sessionId?: string | null;
  elevationHash?: string | null;
}): AuthorityActorChain {
  return {
    requestActorId: String(input.requestActorId || "").trim(),
    requestActorRole: input.requestActorRole,
    approverActorId: String(input.approverActorId || "").trim() || null,
    approverActorRole: input.approverActorRole || null,
    delegationId: String(input.delegationId || "").trim() || null,
    policyVersionHash: String(input.policyVersionHash || "").trim().toLowerCase(),
    sessionId: String(input.sessionId || "").trim() || null,
    elevationHash: String(input.elevationHash || "").trim().toLowerCase() || null,
  };
}

export type ObserveAuthorityDecisionOutcome =
  | {
      recorded: false;
      reason: "FLAG_DISABLED" | "FAILED";
      errorCode?: string;
      errorMessage?: string;
      record?: null;
    }
  | {
      recorded: true;
      created: boolean;
      record: AuthorityApprovalDecisionRecord;
    };

export async function observeAuthorityDecision(
  input: AuthorityObserveDecisionInput,
  dependencyOverrides: Partial<AuthorityServiceDependencies> = {}
): Promise<ObserveAuthorityDecisionOutcome> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!deps.isObserveEnabled()) {
    return {
      recorded: false,
      reason: "FLAG_DISABLED",
      record: null,
    };
  }

  const policy = await resolvePolicyReference(input, deps);
  const actorChain = normalizeActorChain({
    policyVersionHash: policy.policyVersionHash,
    requestActorId: input.requestActorId,
    requestActorRole: input.requestActorRole,
    approverActorId: input.approverActorId || null,
    approverActorRole: input.approverActorRole || null,
    delegationId: input.delegationId || null,
    sessionId: input.sessionId || null,
    elevationHash: input.elevationHash || null,
  });

  const appended = await deps.appendApprovalDecision({
    tenantId: input.tenantId || null,
    policyId: policy.policyId,
    policyVersionHash: policy.policyVersionHash,
    subjectActorId: input.subjectActorId,
    requestActorId: input.requestActorId,
    requestActorRole: input.requestActorRole,
    approverActorId: input.approverActorId || null,
    approverActorRole: input.approverActorRole || null,
    resource: input.resource,
    action: input.action,
    decision: toDecision(input.observedDecision),
    reasonCodes: (input.reasonCodes || []).map((entry) => String(entry || "").trim()).filter(Boolean),
    approvalId: null,
    actorChain,
    decidedAtUtc: input.decidedAtUtc || deps.now().toISOString(),
    metadata: {
      observeMode: true,
      ...(input.metadata || {}),
    },
  });

  return {
    recorded: true,
    created: appended.created,
    record: appended.record,
  };
}

export async function observeAuthorityDecisionFailOpen(
  input: AuthorityObserveDecisionInput,
  dependencyOverrides: Partial<AuthorityServiceDependencies> = {}
): Promise<ObserveAuthorityDecisionOutcome> {
  const deps = resolveDependencies(dependencyOverrides);
  try {
    return await observeAuthorityDecision(input, deps);
  } catch (error: any) {
    deps.logger.error("gov04_authority_observe_failed", {
      tenantId: input.tenantId || null,
      policyId: input.policyId,
      resource: input.resource,
      action: input.action,
      requestActorId: input.requestActorId,
      subjectActorId: input.subjectActorId,
      errorCode: String(error?.code || error?.message || "GOV04_AUTHORITY_OBSERVE_FAILED"),
      errorMessage: String(error?.message || "observe decision failed"),
    });

    return {
      recorded: false,
      reason: "FAILED",
      errorCode: String(error?.code || "GOV04_AUTHORITY_OBSERVE_FAILED"),
      errorMessage: String(error?.message || "observe decision failed"),
      record: null,
    };
  }
}

export async function registerAuthorityPolicyVersionRecord(
  input: RegisterAuthorityPolicyVersionInput,
  dependencyOverrides: Partial<AuthorityServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  return deps.registerPolicyVersion(input);
}

export async function appendAuthorityPolicyLifecycleEventRecord(
  input: AppendAuthorityPolicyLifecycleEventInput,
  dependencyOverrides: Partial<AuthorityServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  return deps.appendPolicyLifecycleEvent(input);
}

export async function appendAuthorityDelegationEventRecord(
  input: AppendAuthorityDelegationEventInput,
  dependencyOverrides: Partial<AuthorityServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  return deps.appendDelegationEvent(input);
}
