import {
  observeAuthorityDecision,
  observeAuthorityDecisionFailOpen,
  type AuthorityServiceDependencies,
} from "../../../lib/governance/authority/service";
import type { AuthorityApprovalDecisionRecord } from "../../../lib/governance/authority/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function buildDecisionRecord(overrides: Partial<AuthorityApprovalDecisionRecord> = {}): AuthorityApprovalDecisionRecord {
  return {
    decisionId: "decision-1",
    tenantId: "TENANT-1",
    policyId: "policy-1",
    policyVersionHash: "a".repeat(64),
    subjectActorId: "subject-1",
    requestActorId: "requestor-1",
    approverActorId: null,
    resource: "settlement.wise_transfer",
    action: "create",
    decision: "OBSERVED_ALLOW",
    reasonCodes: ["AUTHORIZED"],
    approvalId: null,
    actorChainHashSha256: "b".repeat(64),
    decisionHashSha256: "c".repeat(64),
    idempotencyKey: "d".repeat(64),
    decidedAtUtc: "2026-02-13T12:00:00.000Z",
    createdAtUtc: "2026-02-13T12:00:00.000Z",
    ...overrides,
  };
}

async function testObserveReturnsFlagDisabledWhenOff() {
  const deps: Partial<AuthorityServiceDependencies> = {
    isObserveEnabled: () => false,
    appendApprovalDecision: async () => {
      throw new Error("should not append when disabled");
    },
  };

  const result = await observeAuthorityDecision(
    {
      tenantId: "TENANT-1",
      policyId: "policy-1",
      policyVersionHash: "a".repeat(64),
      subjectActorId: "ORD-1",
      requestActorId: "admin-1",
      requestActorRole: "admin",
      resource: "settlement.wise_transfer",
      action: "create",
      observedDecision: "WOULD_ALLOW",
    },
    deps
  );

  assert(result.recorded === false, "Expected recorded false when flag disabled");
  assert(result.reason === "FLAG_DISABLED", "Expected FLAG_DISABLED reason");
}

async function testObserveWritesDecisionWhenEnabled() {
  let appended = 0;
  const deps: Partial<AuthorityServiceDependencies> = {
    isObserveEnabled: () => true,
    resolveObservePolicyContext: () => ({
      policyId: "policy-1",
      policyVersionHash: "a".repeat(64),
    }),
    appendApprovalDecision: async (input) => {
      appended += 1;
      assert(input.policyVersionHash === "a".repeat(64), "Expected explicit policy hash propagation");
      assert(input.decision === "OBSERVED_DENY", "Expected observed deny mapping");
      return { created: true, record: buildDecisionRecord({ decision: "OBSERVED_DENY" }) };
    },
  };

  const result = await observeAuthorityDecision(
    {
      tenantId: "TENANT-1",
      policyId: "policy-1",
      policyVersionHash: "a".repeat(64),
      subjectActorId: "ORD-1",
      requestActorId: "admin-1",
      requestActorRole: "admin",
      resource: "settlement.wise_transfer",
      action: "create",
      observedDecision: "WOULD_DENY",
      reasonCodes: ["NOT_ELIGIBLE"],
    },
    deps
  );

  assert(appended === 1, "Expected one decision append");
  assert(result.recorded === true, "Expected recorded true");
  if (result.recorded) {
    assert(result.record.decision === "OBSERVED_DENY", "Expected decision persisted");
  }
}

async function testFailOpenSwallowsObserveError() {
  let errorLogged = false;
  const deps: Partial<AuthorityServiceDependencies> = {
    isObserveEnabled: () => true,
    resolveObservePolicyContext: () => ({
      policyId: "policy-1",
      policyVersionHash: "a".repeat(64),
    }),
    appendApprovalDecision: async () => {
      throw new Error("store unavailable");
    },
    logger: {
      info: () => undefined,
      warn: () => undefined,
      error: () => {
        errorLogged = true;
      },
    },
  };

  const result = await observeAuthorityDecisionFailOpen(
    {
      tenantId: "TENANT-1",
      policyId: "policy-1",
      policyVersionHash: "a".repeat(64),
      subjectActorId: "ORD-1",
      requestActorId: "admin-1",
      requestActorRole: "admin",
      resource: "settlement.wise_transfer",
      action: "create",
      observedDecision: "WOULD_ALLOW",
    },
    deps
  );

  assert(result.recorded === false, "Expected fail-open to return not recorded");
  assert(result.reason === "FAILED", "Expected FAILED reason");
  assert(errorLogged, "Expected fail-open logger emission");
}

async function run() {
  await testObserveReturnsFlagDisabledWhenOff();
  await testObserveWritesDecisionWhenEnabled();
  await testFailOpenSwallowsObserveError();
}

run();
