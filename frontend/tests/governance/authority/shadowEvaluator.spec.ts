import {
  evaluateAuthorityShadowDecision,
  type AuthorityShadowEvaluatorDependencies,
} from "../../../lib/governance/authority/shadowEvaluator";
import type {
  AuthorityDelegationEventRecord,
  AuthorityPolicyLifecycleEventRecord,
  AuthorityPolicyVersionRecord,
} from "../../../lib/governance/authority/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function makePolicyVersion(input: Partial<AuthorityPolicyVersionRecord>): AuthorityPolicyVersionRecord {
  return {
    policyVersionId: "pv-1",
    policyId: "policy-1",
    policyVersionHash: "a".repeat(64),
    policySchemaVersion: "gov04-authority-policy.v1",
    canonicalPolicyJson: JSON.stringify({ resource: "settlement.wise_transfer", action: "create" }),
    createdAtUtc: "2026-02-13T12:00:00.000Z",
    createdByRole: "system",
    createdById: "seed",
    idempotencyKey: "id-1",
    ...input,
  };
}

function makeLifecycle(input: Partial<AuthorityPolicyLifecycleEventRecord>): AuthorityPolicyLifecycleEventRecord {
  return {
    eventId: "pl-1",
    policyId: "policy-1",
    policyVersionHash: "a".repeat(64),
    lifecycleState: "ACTIVE",
    reasonCode: null,
    eventAtUtc: "2026-02-13T12:00:00.000Z",
    actorRole: "system",
    actorId: "seed",
    eventHashSha256: "b".repeat(64),
    idempotencyKey: "ipl-1",
    createdAtUtc: "2026-02-13T12:00:00.000Z",
    ...input,
  };
}

function makeDelegation(input: Partial<AuthorityDelegationEventRecord>): AuthorityDelegationEventRecord {
  return {
    eventId: "de-1",
    delegationId: "del-1",
    eventType: "DELEGATION_GRANTED",
    tenantId: "TENANT-1",
    grantorActorId: "admin-1",
    grantorActorRole: "admin",
    granteeActorId: "admin-2",
    granteeActorRole: "admin",
    resource: "settlement.wise_transfer",
    action: "create",
    constraints: {},
    scopeHashSha256: "c".repeat(64),
    validFromUtc: "2026-02-10T00:00:00.000Z",
    validToUtc: "2026-02-20T00:00:00.000Z",
    approvalId: "APR-1",
    eventAtUtc: "2026-02-13T12:00:00.000Z",
    actorRole: "admin",
    actorId: "admin-1",
    eventHashSha256: "d".repeat(64),
    idempotencyKey: "ide-1",
    createdAtUtc: "2026-02-13T12:00:00.000Z",
    ...input,
  };
}

function createDeps(input: {
  policies?: AuthorityPolicyVersionRecord[];
  lifecycle?: AuthorityPolicyLifecycleEventRecord[];
  delegations?: AuthorityDelegationEventRecord[];
}): Partial<AuthorityShadowEvaluatorDependencies> {
  return {
    listPolicyVersions: async () => input.policies || [],
    listPolicyLifecycleEvents: async () => input.lifecycle || [],
    listDelegationEvents: async () => input.delegations || [],
  };
}

async function testNoActivePolicyConflict() {
  const result = await evaluateAuthorityShadowDecision(
    {
      tenantId: "TENANT-1",
      policyId: "policy-1",
      subjectActorId: "ORD-1",
      requestActorId: "admin-1",
      requestActorRole: "admin",
      resource: "settlement.wise_transfer",
      action: "create",
      decidedAtUtc: "2026-02-13T12:15:00.000Z",
    },
    createDeps({})
  );

  assert(result.wouldDecision === "WOULD_BLOCK", "Expected would block when no active policy");
  assert(result.policyConflictCode === "NO_ACTIVE_POLICY", "Expected NO_ACTIVE_POLICY conflict");
}

async function testMultipleActivePoliciesConflict() {
  const p1 = makePolicyVersion({ policyVersionId: "pv-1", policyVersionHash: "a".repeat(64) });
  const p2 = makePolicyVersion({ policyVersionId: "pv-2", policyVersionHash: "b".repeat(64) });

  const result = await evaluateAuthorityShadowDecision(
    {
      tenantId: "TENANT-1",
      policyId: "policy-1",
      subjectActorId: "ORD-1",
      requestActorId: "admin-1",
      requestActorRole: "admin",
      resource: "settlement.wise_transfer",
      action: "create",
      decidedAtUtc: "2026-02-13T12:15:00.000Z",
    },
    createDeps({
      policies: [p1, p2],
      lifecycle: [
        makeLifecycle({ policyVersionHash: "a".repeat(64), eventId: "pl-1" }),
        makeLifecycle({ policyVersionHash: "b".repeat(64), eventId: "pl-2" }),
      ],
    })
  );

  assert(result.policyConflictCode === "MULTIPLE_ACTIVE_POLICIES", "Expected multiple active policy conflict");
}

async function testRoleBlockWithoutConflict() {
  const policy = makePolicyVersion({
    canonicalPolicyJson: JSON.stringify({
      resource: "settlement.wise_transfer",
      action: "create",
      allowRoles: ["admin"],
    }),
  });

  const result = await evaluateAuthorityShadowDecision(
    {
      tenantId: "TENANT-1",
      policyId: policy.policyId,
      policyVersionHash: policy.policyVersionHash,
      subjectActorId: "ORD-1",
      requestActorId: "buyer-1",
      requestActorRole: "buyer",
      resource: "settlement.wise_transfer",
      action: "create",
      decidedAtUtc: "2026-02-13T12:15:00.000Z",
    },
    createDeps({
      policies: [policy],
      lifecycle: [makeLifecycle({ policyVersionHash: policy.policyVersionHash })],
    })
  );

  assert(result.policyConflictCode === null, "Expected no conflict for role block");
  assert(result.wouldDecision === "WOULD_BLOCK", "Expected would block for disallowed role");
  assert(result.reasonCodes.includes("REQUEST_ROLE_NOT_ALLOWED"), "Expected role denial reason");
}

async function testDelegationScopeConflictPrecedence() {
  const policy = makePolicyVersion({
    canonicalPolicyJson: JSON.stringify({
      resource: "settlement.wise_transfer",
      action: "create",
      allowRoles: ["admin"],
      requireDelegation: true,
    }),
  });

  const result = await evaluateAuthorityShadowDecision(
    {
      tenantId: "TENANT-1",
      policyId: policy.policyId,
      policyVersionHash: policy.policyVersionHash,
      subjectActorId: "ORD-1",
      requestActorId: "admin-2",
      requestActorRole: "admin",
      resource: "settlement.wise_transfer",
      action: "create",
      decidedAtUtc: "2026-02-13T12:15:00.000Z",
    },
    createDeps({
      policies: [policy],
      lifecycle: [makeLifecycle({ policyVersionHash: policy.policyVersionHash })],
      delegations: [
        makeDelegation({ delegationId: "del-1", scopeHashSha256: "c".repeat(64), eventId: "de-1" }),
        makeDelegation({ delegationId: "del-2", scopeHashSha256: "e".repeat(64), eventId: "de-2" }),
      ],
    })
  );

  assert(result.policyConflictCode === "DELEGATION_SCOPE_CONFLICT", "Expected delegation scope conflict");
}

async function testEvaluatorHashStability() {
  const policy = makePolicyVersion({
    canonicalPolicyJson: JSON.stringify({
      resource: "settlement.wise_transfer",
      action: "create",
      allowRoles: ["admin"],
    }),
  });

  const deps = createDeps({
    policies: [policy],
    lifecycle: [makeLifecycle({ policyVersionHash: policy.policyVersionHash })],
  });

  const input = {
    tenantId: "TENANT-1",
    policyId: policy.policyId,
    policyVersionHash: policy.policyVersionHash,
    subjectActorId: "ORD-1",
    requestActorId: "admin-1",
    requestActorRole: "admin" as const,
    resource: "settlement.wise_transfer",
    action: "create",
    decidedAtUtc: "2026-02-13T12:15:00.000Z",
  };

  const first = await evaluateAuthorityShadowDecision(input, deps);
  const second = await evaluateAuthorityShadowDecision(input, deps);

  assert(first.shadowEvaluatorVersion === "gov04-shadow-evaluator.v1", "Expected evaluator version tag");
  assert(first.evaluationPayloadHashSha256 === second.evaluationPayloadHashSha256, "Expected deterministic payload hash");
}

async function run() {
  await testNoActivePolicyConflict();
  await testMultipleActivePoliciesConflict();
  await testRoleBlockWithoutConflict();
  await testDelegationScopeConflictPrecedence();
  await testEvaluatorHashStability();
}

run();
