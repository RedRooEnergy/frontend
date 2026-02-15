import assert from "node:assert/strict";
import {
  ADMIN_AUDIT_COLLECTION,
  type WriteAdminAuditInput,
} from "../../../lib/adminDashboard/auditWriter";
import { listAdminMemoryCollectionRows } from "../../../lib/adminDashboard/memoryCollection";
import {
  AUTHORITY_MULTISIG_APPROVAL_COLLECTION,
  AUTHORITY_MULTISIG_PROPOSAL_COLLECTION,
  AUTHORITY_MULTISIG_QUORUM_COLLECTION,
} from "../../../lib/governance/authority/multisig/ledgerStore";
import {
  computeAuthorityMultisigQuorumSnapshot,
  createAuthorityMultisigProposalDraft,
  recordAuthorityMultisigApprovalDecision,
  triggerAuthorityMultisigRuntimeActivation,
} from "../../../lib/governance/authority/multisig/service";
import { canonicalPayloadHash } from "../../../lib/governance/authority/multisig/hash";
import { AuthorityMultisigBuildOnlyError } from "../../../lib/governance/authority/multisig/types";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

function resetMemoryCollections() {
  (globalThis as any).__rreAdminMemoryCollections = new Map();
}

function baseActor() {
  return {
    actorId: "grand-master-1",
    actorRole: "admin" as const,
    email: "grand-master@redroo.energy",
    ip: "127.0.0.1",
    userAgent: "ext-gov-auth-02-build-test",
  };
}

function assertAuditRecordShape(rows: Array<Record<string, unknown>>) {
  for (const row of rows) {
    assert.equal(typeof row.auditId, "string", "auditId must be string");
    assert.match(String(row.beforeHash || ""), /^[0-9a-f]{64}$/);
    assert.match(String(row.afterHash || ""), /^[0-9a-f]{64}$/);
    assert.match(String(row.integrityHash || ""), /^[0-9a-f]{64}$/);
  }
}

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return { id, pass: false, details: String(error?.message || error) };
  }
}

async function testBuildFlagDisabledBlocksWrites() {
  resetMemoryCollections();
  delete process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD;

  await assert.rejects(
    () =>
      createAuthorityMultisigProposalDraft({
        proposalType: "DESIGN_STRUCTURE_CHANGE",
        scope: "authority.tree",
        actor: baseActor(),
        reason: "build-only gating check",
      }),
    (error: unknown) =>
      error instanceof AuthorityMultisigBuildOnlyError && error.code === "GOV_AUTH02_ACTIVATION_BUILD_DISABLED"
  );

  const proposalRows = listAdminMemoryCollectionRows(AUTHORITY_MULTISIG_PROPOSAL_COLLECTION);
  const auditRows = listAdminMemoryCollectionRows(ADMIN_AUDIT_COLLECTION);
  assert.equal(proposalRows.length, 0, "No proposal row should be persisted when build flag is disabled");
  assert.equal(auditRows.length, 0, "No audit row should be persisted when build flag is disabled");
}

async function testBuildFlagEnabledWritesAppendOnlyLedgerAndAudit() {
  resetMemoryCollections();
  process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD = "true";

  const proposalResult = await createAuthorityMultisigProposalDraft({
    proposalType: "DESIGN_STRUCTURE_CHANGE",
    scope: "authority.tree",
    actor: baseActor(),
    reason: "prepare authority hierarchy improvement proposal",
    proposedChanges: {
      role: "Platform Architect Council",
      action: "boundary-update",
      version: "v1.0",
    },
    evidenceRefs: [{ type: "doc", refId: "RRE-00-PLATFORM-AUTHORITY-HIERARCHY-v1.0" }],
  });

  assert.match(proposalResult.proposal.proposedChangesHash, /^[0-9a-f]{64}$/);
  assert.equal(proposalResult.proposal.metadata?.buildPhaseOnly, true);

  const approvalResult = await recordAuthorityMultisigApprovalDecision({
    proposalId: proposalResult.proposal.proposalId,
    actor: baseActor(),
    decision: "APPROVE",
    reason: "design contract validates deterministic quorum policy",
  });

  assert.match(approvalResult.entry.entryHash, /^[0-9a-f]{64}$/);
  assert.equal(approvalResult.entry.metadata?.buildPhaseOnly, true);

  const quorumResult = await computeAuthorityMultisigQuorumSnapshot({
    proposalId: proposalResult.proposal.proposalId,
    actor: baseActor(),
    requiredApprovals: 1,
    reason: "record quorum snapshot for build-only evidence",
  });

  assert.equal(quorumResult.snapshot.quorumMet, true);
  assert.equal(quorumResult.snapshot.currentApprovals, 1);
  assert.match(quorumResult.snapshot.snapshotHash, /^[0-9a-f]{64}$/);
  assert.equal(quorumResult.snapshot.metadata?.buildPhaseOnly, true);

  const proposalRows = listAdminMemoryCollectionRows(AUTHORITY_MULTISIG_PROPOSAL_COLLECTION);
  const approvalRows = listAdminMemoryCollectionRows(AUTHORITY_MULTISIG_APPROVAL_COLLECTION);
  const quorumRows = listAdminMemoryCollectionRows(AUTHORITY_MULTISIG_QUORUM_COLLECTION);
  const auditRows = listAdminMemoryCollectionRows(ADMIN_AUDIT_COLLECTION);

  assert.equal(proposalRows.length, 1, "Expected one proposal entry");
  assert.equal(approvalRows.length, 1, "Expected one approval entry");
  assert.equal(quorumRows.length, 1, "Expected one quorum snapshot entry");
  assert.equal(auditRows.length, 3, "Expected one audit event per mutation");

  assertAuditRecordShape(auditRows);
}

async function testRuntimeActivationIsAlwaysForbidden() {
  process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD = "true";
  assert.throws(
    () => triggerAuthorityMultisigRuntimeActivation(),
    (error: unknown) =>
      error instanceof AuthorityMultisigBuildOnlyError &&
      error.code === "GOV_AUTH02_RUNTIME_ACTIVATION_NOT_AUTHORIZED"
  );
}

async function testCanonicalHashDeterminism() {
  const first = canonicalPayloadHash({ z: 1, a: 2, nested: { b: true, a: false } });
  const second = canonicalPayloadHash({ nested: { a: false, b: true }, a: 2, z: 1 });
  const third = canonicalPayloadHash({ nested: { a: false, b: false }, a: 2, z: 1 });
  assert.equal(first, second, "canonicalPayloadHash must be deterministic across key permutations");
  assert.notEqual(first, third, "canonicalPayloadHash must change when payload values differ");
}

async function testAuditWriterTypeCompatibility() {
  const input: WriteAdminAuditInput = {
    actor: {
      actorId: "grand-master-1",
      actorRole: "admin",
    },
    action: "AUTH02_TEST_EVENT",
    entity: {
      type: "TestEntity",
      id: "test-1",
    },
    reason: "type-check",
    before: null,
    after: { ok: true },
  };
  assert.equal(input.reason, "type-check");
}

async function main() {
  const originalBuildFlag = process.env.ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD;
  const results: TestResult[] = [];

  results.push(await runCheck("BUILD_FLAG_DISABLED_BLOCKS_WRITES", testBuildFlagDisabledBlocksWrites));
  results.push(
    await runCheck("BUILD_FLAG_ENABLED_WRITES_LEDGER_AND_AUDIT", testBuildFlagEnabledWritesAppendOnlyLedgerAndAudit)
  );
  results.push(await runCheck("RUNTIME_ACTIVATION_FORBIDDEN", testRuntimeActivationIsAlwaysForbidden));
  results.push(await runCheck("CANONICAL_HASH_DETERMINISM", testCanonicalHashDeterminism));
  results.push(await runCheck("AUDIT_WRITER_TYPE_COMPATIBILITY", testAuditWriterTypeCompatibility));

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
