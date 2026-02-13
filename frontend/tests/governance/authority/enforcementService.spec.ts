import {
  evaluateAuthorityEnforcementDecision,
  resolveAuthorityEnforcementPreconditions,
  type AuthorityEnforcementServiceDependencies,
} from "../../../lib/governance/authority/enforcementService";
import { computeAuthorityShadowDecisionHash } from "../../../lib/governance/authority/shadowStore";
import type { AuthorityShadowEvaluationResult } from "../../../lib/governance/authority/shadowTypes";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function makeEvaluation(overrides: Partial<AuthorityShadowEvaluationResult> = {}): AuthorityShadowEvaluationResult {
  return {
    policyId: "policy-1",
    policyVersionHash: "a".repeat(64),
    policyLifecycleState: "ACTIVE",
    shadowEvaluatorVersion: "gov04-shadow-evaluator.v1",
    wouldDecision: "WOULD_ALLOW",
    wouldBlock: false,
    reasonCodes: [],
    policyConflictCode: null,
    delegationEvaluationResult: {
      required: false,
      hasValidDelegation: false,
      activeDelegationCount: 0,
      delegationIds: [],
    },
    approvalRequirementEvaluation: {
      required: false,
      hasApprover: true,
      passesSeparationOfDuties: true,
    },
    evaluationPayloadHashSha256: "b".repeat(64),
    canonicalEvaluationJson: "{}",
    ...overrides,
  };
}

function makeInput() {
  return {
    tenantId: "TENANT-1",
    policyId: "policy-1",
    policyVersionHash: "a".repeat(64),
    subjectActorId: "prod-1",
    requestActorId: "admin-1",
    requestActorRole: "admin" as const,
    approverActorId: "admin-2",
    approverActorRole: "admin" as const,
    resource: "catalog.product",
    action: "fee_ledger.emit.product_approved",
    decidedAtUtc: "2026-02-13T12:00:00.000Z",
  };
}

async function testBypassStillPersistsShadow() {
  let shadowAppended = 0;
  const deps: Partial<AuthorityEnforcementServiceDependencies> = {
    resolvePreconditions: () => ({
      enabled: false,
      killSwitch: false,
      strictMode: false,
      bypassed: true,
      bypassReason: "ENFORCEMENT_FLAG_DISABLED",
    }),
    evaluateShadow: async () => makeEvaluation(),
    appendShadowDecision: async () => {
      shadowAppended += 1;
      return {
        created: true,
        record: {
          decisionId: "shadow-1",
          decisionHashSha256: "c".repeat(64),
        } as any,
      };
    },
  };

  const result = await evaluateAuthorityEnforcementDecision(makeInput(), deps);
  assert(shadowAppended === 1, "Expected shadow persisted on bypass");
  assert(result.enforcement.applied === false, "Expected enforcement bypassed");
  assert(result.enforcement.bypassReason === "ENFORCEMENT_FLAG_DISABLED", "Expected bypass reason");
}

async function testEnforcedAllowWritesArtifact() {
  let enforcementWritten = 0;
  const evaluation = makeEvaluation();
  const input = {
    ...makeInput(),
    policyVersionHash: "a".repeat(64),
    decidedAtUtc: "2026-02-13T12:00:00.000Z",
  };
  const decisionHash = computeAuthorityShadowDecisionHash({
    evaluationInput: input,
    evaluationResult: evaluation,
  });
  const deps: Partial<AuthorityEnforcementServiceDependencies> = {
    resolvePreconditions: () => ({
      enabled: true,
      killSwitch: false,
      strictMode: false,
      bypassed: false,
      bypassReason: null,
    }),
    evaluateShadow: async () => evaluation,
    appendShadowDecision: async () => ({
      created: true,
      record: {
        decisionId: "shadow-1",
        decisionHashSha256: decisionHash,
      } as any,
    }),
    appendEnforcementDecision: async () => {
      enforcementWritten += 1;
      return {
        created: true,
        record: {
          enforcementDecisionId: "enf-1",
          enforcementResult: "ALLOW",
        } as any,
      };
    },
  };

  const result = await evaluateAuthorityEnforcementDecision(input, deps);
  assert(result.enforcement.applied === true, "Expected enforcement applied");
  assert(result.enforcement.result === "ALLOW", "Expected allow result");
  assert(enforcementWritten === 1, "Expected enforcement artifact append");
}

async function testStrictModeBlocksOnPersistFailure() {
  const input = makeInput();
  const evaluation = makeEvaluation();
  const decisionHash = computeAuthorityShadowDecisionHash({
    evaluationInput: input,
    evaluationResult: evaluation,
  });
  const deps: Partial<AuthorityEnforcementServiceDependencies> = {
    resolvePreconditions: () => ({
      enabled: true,
      killSwitch: false,
      strictMode: true,
      bypassed: false,
      bypassReason: null,
    }),
    evaluateShadow: async () => evaluation,
    appendShadowDecision: async () => ({
      created: true,
      record: {
        decisionId: "shadow-1",
        decisionHashSha256: decisionHash,
      } as any,
    }),
    appendEnforcementDecision: async () => {
      throw new Error("store down");
    },
  };

  const result = await evaluateAuthorityEnforcementDecision(input, deps);
  assert(result.enforcement.applied === true, "Expected strict enforcement applied");
  assert(result.enforcement.result === "BLOCK", "Expected strict block on persistence failure");
  assert(
    result.enforcement.responseMutationCode === "HTTP_403_AUTHZ_BLOCK_STRICT_INTERNAL_ERROR",
    "Expected strict internal error response code"
  );
}

async function testPreconditionResolverOrder() {
  const env = {
    ENABLE_GOV04_AUTHORITY_ENFORCEMENT: "true",
    GOV04_AUTH_ENFORCEMENT_KILL_SWITCH: "true",
    GOV04_AUTH_ENFORCEMENT_STRICT_MODE: "false",
    GOV04_AUTH_ENFORCE_TENANT_ALLOWLIST: "TENANT-1",
    GOV04_AUTH_ENFORCE_ROLE_ALLOWLIST: "admin",
    GOV04_AUTH_ENFORCE_RESOURCE_ACTION_ALLOWLIST: "catalog.product|fee_ledger.emit.product_approved",
    GOV04_AUTH_ENFORCE_POLICY_VERSION_ALLOWLIST: "a".repeat(64),
  } as any;

  const resolved = resolveAuthorityEnforcementPreconditions(
    {
      tenantId: "TENANT-1",
      requestActorRole: "admin",
      resource: "catalog.product",
      action: "fee_ledger.emit.product_approved",
      policyVersionHash: "a".repeat(64),
    },
    env
  );

  assert(resolved.bypassed === true, "Expected bypass under kill switch");
  assert(resolved.bypassReason === "KILL_SWITCH_ENABLED", "Expected kill switch to dominate ordering");
}

async function run() {
  await testBypassStillPersistsShadow();
  await testEnforcedAllowWritesArtifact();
  await testStrictModeBlocksOnPersistFailure();
  await testPreconditionResolverOrder();
}

run();
