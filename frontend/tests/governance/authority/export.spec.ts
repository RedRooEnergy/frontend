import { exportAuthorityEvidencePack } from "../../../lib/governance/authority/export";
import { sha256Hex } from "../../../lib/governance/authority/hash";
import type {
  AuthorityApprovalDecisionRecord,
  AuthorityDelegationEventRecord,
  AuthorityPolicyLifecycleEventRecord,
  AuthorityPolicyVersionRecord,
} from "../../../lib/governance/authority/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function samplePolicyVersions(): AuthorityPolicyVersionRecord[] {
  return [
    {
      policyVersionId: "pv-2",
      policyId: "policy-b",
      policyVersionHash: "b".repeat(64),
      policySchemaVersion: "gov04-authority-policy.v1",
      canonicalPolicyJson: '{"a":2}',
      createdAtUtc: "2026-02-13T12:10:00.000Z",
      createdByRole: "system",
      createdById: "seed",
      idempotencyKey: "id-2",
    },
    {
      policyVersionId: "pv-1",
      policyId: "policy-a",
      policyVersionHash: "a".repeat(64),
      policySchemaVersion: "gov04-authority-policy.v1",
      canonicalPolicyJson: '{"a":1}',
      createdAtUtc: "2026-02-13T12:00:00.000Z",
      createdByRole: "system",
      createdById: "seed",
      idempotencyKey: "id-1",
    },
  ];
}

function sampleLifecycleEvents(): AuthorityPolicyLifecycleEventRecord[] {
  return [
    {
      eventId: "pl-2",
      policyId: "policy-b",
      policyVersionHash: "b".repeat(64),
      lifecycleState: "ACTIVE",
      reasonCode: null,
      eventAtUtc: "2026-02-13T12:11:00.000Z",
      actorRole: "system",
      actorId: "seed",
      eventHashSha256: "1".repeat(64),
      idempotencyKey: "ipl-2",
      createdAtUtc: "2026-02-13T12:11:00.000Z",
    },
  ];
}

function sampleDelegations(): AuthorityDelegationEventRecord[] {
  return [
    {
      eventId: "de-1",
      delegationId: "del-1",
      eventType: "DELEGATION_GRANTED",
      tenantId: "TENANT-1",
      grantorActorId: "admin-1",
      grantorActorRole: "admin",
      granteeActorId: "ops-1",
      granteeActorRole: "admin",
      resource: "settlement.wise_transfer",
      action: "create",
      constraints: {},
      scopeHashSha256: "2".repeat(64),
      validFromUtc: null,
      validToUtc: null,
      approvalId: "APR-1",
      eventAtUtc: "2026-02-13T12:12:00.000Z",
      actorRole: "admin",
      actorId: "admin-1",
      eventHashSha256: "3".repeat(64),
      idempotencyKey: "ide-1",
      createdAtUtc: "2026-02-13T12:12:00.000Z",
    },
  ];
}

function sampleDecisions(): AuthorityApprovalDecisionRecord[] {
  return [
    {
      decisionId: "ad-1",
      tenantId: "TENANT-1",
      policyId: "policy-a",
      policyVersionHash: "a".repeat(64),
      subjectActorId: "ORD-1",
      requestActorId: "admin-1",
      approverActorId: null,
      resource: "settlement.wise_transfer",
      action: "create",
      decision: "OBSERVED_ALLOW",
      reasonCodes: ["AUTHORIZED"],
      approvalId: null,
      actorChainHashSha256: "4".repeat(64),
      decisionHashSha256: "5".repeat(64),
      idempotencyKey: "iad-1",
      decidedAtUtc: "2026-02-13T12:13:00.000Z",
      createdAtUtc: "2026-02-13T12:13:00.000Z",
    },
  ];
}

async function runExport() {
  return exportAuthorityEvidencePack(
    {
      source: "cli_local",
      fromUtc: "2026-02-13T12:00:00.000Z",
      toUtc: "2026-02-13T13:00:00.000Z",
      limit: 100,
      tenantId: "TENANT-1",
      schemaVersion: "v2",
      includeShadowArtifacts: true,
    },
    {
      now: () => new Date("2026-02-13T14:00:00.000Z"),
      listPolicyVersions: async () => samplePolicyVersions(),
      listPolicyLifecycleEvents: async () => sampleLifecycleEvents(),
      listDelegationEvents: async () => sampleDelegations(),
      listApprovalDecisions: async () => sampleDecisions(),
      listShadowDecisions: async () => [],
      listShadowOverrideCases: async () => [],
      listShadowOverrideCaseEvents: async () => [],
    }
  );
}

async function runExportV1Compatibility() {
  return exportAuthorityEvidencePack(
    {
      source: "cli_local",
      fromUtc: "2026-02-13T12:00:00.000Z",
      toUtc: "2026-02-13T13:00:00.000Z",
      limit: 100,
      tenantId: "TENANT-1",
      schemaVersion: "v1",
      includeShadowArtifacts: false,
    },
    {
      now: () => new Date("2026-02-13T14:00:00.000Z"),
      listPolicyVersions: async () => samplePolicyVersions(),
      listPolicyLifecycleEvents: async () => sampleLifecycleEvents(),
      listDelegationEvents: async () => sampleDelegations(),
      listApprovalDecisions: async () => sampleDecisions(),
      listShadowDecisions: async () => [],
      listShadowOverrideCases: async () => [],
      listShadowOverrideCaseEvents: async () => [],
    }
  );
}

async function testDeterministicHashingAndChainIntegrity() {
  const first = await runExport();
  const second = await runExport();

  assert(first.deterministicHashSha256 === second.deterministicHashSha256, "Expected deterministic hash stability");
  assert(first.exportRootHash === second.exportRootHash, "Expected export root hash stability");

  const expectedGenesis = sha256Hex(`AUTHORITY_GENESIS:${first.windowStartUtc}`);
  let chain = expectedGenesis;
  for (const row of first.hashChain) {
    chain = sha256Hex(`${chain}:${row.eventHashSha256}`);
  }
  const expectedRoot = sha256Hex(`${chain}:${first.deterministicHashSha256}`);
  assert(first.exportRootHash === expectedRoot, "Expected export root hash to match chain integrity model");
  assert(first.reportVersion === "gov04-authority-export.v2", "Expected v2 export report version");
  assert((first as any).schemaVersion === "v2", "Expected explicit schemaVersion");
  assert((first as any).authorityPhase === "shadow", "Expected authority phase marker");
}

async function testV1CompatibilityPath() {
  const report = await runExportV1Compatibility();
  assert(report.reportVersion === "gov04-authority-export.v1", "Expected v1 compatibility report version");
  assert(!(report as any).shadowDecisions, "Expected no shadow artifacts in v1 output");
}

async function run() {
  await testDeterministicHashingAndChainIntegrity();
  await testV1CompatibilityPath();
}

run();
