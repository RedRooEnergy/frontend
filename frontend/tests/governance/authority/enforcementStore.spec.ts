import {
  appendAuthorityEnforcementDecision,
  listAuthorityEnforcementDecisionsByWindow,
  type AuthorityEnforcementStoreDependencies,
} from "../../../lib/governance/authority/enforcementStore";
import type { AuthorityShadowDecisionRecord } from "../../../lib/governance/authority/shadowTypes";
import type { AuthorityEnforcementDecisionRecord } from "../../../lib/governance/authority/enforcementTypes";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function matchesQuery(record: Record<string, any>, query: Record<string, unknown>) {
  for (const [key, value] of Object.entries(query)) {
    const actual = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const range = value as Record<string, unknown>;
      if (typeof range.$gte === "string" && String(actual) < range.$gte) return false;
      if (typeof range.$lte === "string" && String(actual) > range.$lte) return false;
      continue;
    }
    if (actual !== value) return false;
  }
  return true;
}

function createDeps() {
  const rows: AuthorityEnforcementDecisionRecord[] = [];
  const shadowDecision: AuthorityShadowDecisionRecord = {
    decisionId: "shadow-1",
    caseKeyHashSha256: "a".repeat(64),
    idempotencyKey: "b".repeat(64),
    tenantId: "TENANT-1",
    policyId: "policy-1",
    policyVersionHash: "c".repeat(64),
    policyLifecycleState: "ACTIVE",
    subjectActorId: "prod-1",
    requestActorId: "admin-1",
    requestActorRole: "admin",
    approverActorId: "admin-1",
    approverActorRole: "admin",
    delegationId: null,
    resource: "catalog.product",
    action: "fee_ledger.emit.product_approved",
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
    shadowEvaluatorVersion: "gov04-shadow-evaluator.v1",
    decisionHashSha256: "d".repeat(64),
    canonicalDecisionJson: "{}",
    decidedAtUtc: "2026-02-13T12:00:00.000Z",
    metadata: {},
    createdAtUtc: "2026-02-13T12:00:00.000Z",
  };

  const collection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = rows.find(
        (row) => row.enforcementDecisionId === doc.enforcementDecisionId || row.idempotencyKey === doc.idempotencyKey
      );
      if (duplicate) {
        const err: any = new Error("duplicate key");
        err.code = 11000;
        throw err;
      }
      const inserted = { ...doc, _id: `${rows.length + 1}` };
      rows.push(inserted);
      return { insertedId: inserted._id };
    },
    async findOne(query: Record<string, unknown>) {
      return rows.find((row) => matchesQuery(row as any, query)) || null;
    },
    find(query: Record<string, unknown>) {
      let current = rows.filter((row) => matchesQuery(row as any, query));
      return {
        sort(spec: Record<string, 1 | -1>) {
          const entries = Object.entries(spec);
          current = current.sort((left: any, right: any) => {
            for (const [field, direction] of entries) {
              const l = String(left[field] || "");
              const r = String(right[field] || "");
              if (l === r) continue;
              return direction === -1 ? r.localeCompare(l) : l.localeCompare(r);
            }
            return 0;
          });
          return {
            limit(value: number) {
              current = current.slice(0, value);
              return {
                async toArray() {
                  return current;
                },
              };
            },
          };
        },
      };
    },
  };

  const deps: Partial<AuthorityEnforcementStoreDependencies> = {
    getCollection: async () => collection as any,
    getShadowDecisionById: async (decisionId: string) =>
      decisionId === shadowDecision.decisionId ? shadowDecision : null,
    now: () => new Date("2026-02-13T12:01:00.000Z"),
  };

  return { deps };
}

function buildInput() {
  return {
    tenantId: "TENANT-1",
    policyId: "policy-1",
    policyVersionHash: "c".repeat(64),
    subjectActorId: "prod-1",
    requestActorId: "admin-1",
    requestActorRole: "admin" as const,
    approverActorId: "admin-1",
    approverActorRole: "admin" as const,
    delegationId: null,
    resource: "catalog.product",
    action: "fee_ledger.emit.product_approved",
    shadowDecisionId: "shadow-1",
    shadowDecisionHashSha256: "d".repeat(64),
    decisionHashSha256: "d".repeat(64),
    enforcementResult: "ALLOW" as const,
    responseMutationCode: null,
    decidedAtUtc: "2026-02-13T12:00:00.000Z",
    metadata: {
      source: "test",
    },
  };
}

async function testAppendIsIdempotent() {
  const { deps } = createDeps();
  const input = buildInput();

  const first = await appendAuthorityEnforcementDecision(input, deps);
  const second = await appendAuthorityEnforcementDecision(input, deps);

  assert(first.created === true, "Expected first insert");
  assert(second.created === false, "Expected idempotent dedupe");
  assert(second.record.shadowDecisionId === "shadow-1", "Expected shadow decision linkage");
  assert(second.record.shadowVsEnforcementDivergence === false, "Expected non-divergence default");
}

async function testMissingShadowRejected() {
  const { deps } = createDeps();
  let thrown = false;
  try {
    await appendAuthorityEnforcementDecision(
      {
        ...buildInput(),
        shadowDecisionId: "missing-shadow",
      },
      deps
    );
  } catch (error: any) {
    thrown = String(error?.message || "").includes("AUTHORITY_ENFORCEMENT_SHADOW_DECISION_NOT_FOUND");
  }
  assert(thrown, "Expected missing shadow rejection");
}

async function testListByWindow() {
  const { deps } = createDeps();
  await appendAuthorityEnforcementDecision(buildInput(), deps);

  const listed = await listAuthorityEnforcementDecisionsByWindow(
    {
      tenantId: "TENANT-1",
      fromUtc: "2026-02-13T11:00:00.000Z",
      toUtc: "2026-02-13T13:00:00.000Z",
      resource: "catalog.product",
      action: "fee_ledger.emit.product_approved",
    },
    deps
  );

  assert(listed.length === 1, "Expected one enforcement decision");
  assert(listed[0].enforcementMode === true, "Expected enforcement mode true");
  assert(listed[0].shadowVsEnforcementDivergence === false, "Expected divergence counter field");
}

async function testDivergenceFlagPersists() {
  const { deps } = createDeps();
  const created = await appendAuthorityEnforcementDecision(
    {
      ...buildInput(),
      enforcementResult: "BLOCK",
      shadowVsEnforcementDivergence: true,
      responseMutationCode: "HTTP_403_AUTHZ_BLOCK_STRICT_DUAL_WRITE_MISMATCH",
    },
    deps
  );

  assert(created.record.shadowVsEnforcementDivergence === true, "Expected divergence flag persisted");
}

async function run() {
  await testAppendIsIdempotent();
  await testMissingShadowRejected();
  await testListByWindow();
  await testDivergenceFlagPersists();
}

run();
