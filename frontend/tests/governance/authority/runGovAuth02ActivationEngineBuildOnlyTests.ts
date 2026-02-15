import assert from "node:assert/strict";
import {
  buildAuthorityMultisigExecutionPlan,
  executeAuthorityMultisigWorkflow,
  isAuthorityMultisigRuntimeExecutionAuthorized,
} from "../../../lib/governance/authority/multisig/engine";
import { AuthorityMultisigBuildOnlyError } from "../../../lib/governance/authority/multisig/types";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

function baseActor() {
  return {
    actorId: "grand-master-1",
    actorRole: "admin" as const,
    email: "grand-master@redroo.energy",
    ip: "127.0.0.1",
    userAgent: "auth02-engine-build-only-tests",
  };
}

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return { id, pass: false, details: String(error?.message || error) };
  }
}

async function testBuildFlagOffBlocksPlanBuild() {
  delete process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD;
  assert.throws(
    () =>
      buildAuthorityMultisigExecutionPlan({
        proposalId: "proposal-1",
        proposalType: "DESIGN_STRUCTURE_CHANGE",
        requiredApprovals: 2,
        actor: baseActor(),
        reason: "build-only test",
      }),
    (error: unknown) =>
      error instanceof AuthorityMultisigBuildOnlyError && error.code === "GOV_AUTH02_ACTIVATION_BUILD_DISABLED"
  );
}

async function testBuildFlagOnBuildsDeterministicPlan() {
  process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD = "true";
  const first = buildAuthorityMultisigExecutionPlan(
    {
      proposalId: "proposal-1",
      proposalType: "DESIGN_STRUCTURE_CHANGE",
      requiredApprovals: 2,
      actor: baseActor(),
      reason: "build-only deterministic plan",
    },
    {
      now: () => new Date("2026-02-15T00:00:00.000Z"),
    }
  );
  const second = buildAuthorityMultisigExecutionPlan(
    {
      proposalId: "proposal-1",
      proposalType: "DESIGN_STRUCTURE_CHANGE",
      requiredApprovals: 2,
      actor: baseActor(),
      reason: "build-only deterministic plan",
    },
    {
      now: () => new Date("2026-02-15T00:00:00.000Z"),
    }
  );

  assert.equal(first.planHash, second.planHash, "Plan hash must be deterministic for equal inputs");
  assert.equal(first.planId, second.planId, "Plan id must be deterministic for equal inputs");
  assert.equal(first.executionAuthorized, false, "Execution authorization must remain false");
  assert.equal(first.metadata?.buildPhaseOnly, true, "Plan metadata must remain build-phase only");
}

async function testRuntimeExecutionAlwaysBlocked() {
  process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD = "true";
  assert.equal(isAuthorityMultisigRuntimeExecutionAuthorized(), false);
  await assert.rejects(
    () => executeAuthorityMultisigWorkflow(),
    (error: unknown) =>
      error instanceof AuthorityMultisigBuildOnlyError &&
      error.code === "GOV_AUTH02_RUNTIME_EXECUTION_NOT_AUTHORIZED"
  );
}

async function main() {
  const originalBuildFlag = process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD;
  const results: TestResult[] = [];

  results.push(await runCheck("BUILD_FLAG_OFF_BLOCKS_PLAN_BUILD", testBuildFlagOffBlocksPlanBuild));
  results.push(await runCheck("BUILD_FLAG_ON_DETERMINISTIC_PLAN", testBuildFlagOnBuildsDeterministicPlan));
  results.push(await runCheck("RUNTIME_EXECUTION_ALWAYS_BLOCKED", testRuntimeExecutionAlwaysBlocked));

  for (const result of results) {
    console.log(`[${result.pass ? "PASS" : "FAIL"}] ${result.id} :: ${result.details}`);
  }

  const failed = results.filter((result) => !result.pass);
  console.log(`SUMMARY total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);

  if (originalBuildFlag === undefined) {
    delete process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD;
  } else {
    process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD = originalBuildFlag;
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
