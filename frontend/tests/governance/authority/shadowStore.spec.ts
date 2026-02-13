import {
  appendAuthorityShadowDecision,
  listAuthorityShadowDecisionsByWindow,
  type AuthorityShadowStoreDependencies,
} from "../../../lib/governance/authority/shadowStore";
import type { AuthorityShadowDecisionRecord } from "../../../lib/governance/authority/shadowTypes";

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
  const rows: AuthorityShadowDecisionRecord[] = [];

  const collection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = rows.find((row) => row.decisionId === doc.decisionId || row.idempotencyKey === doc.idempotencyKey);
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

  const deps: Partial<AuthorityShadowStoreDependencies> = {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-13T12:00:00.000Z"),
  };

  return { deps };
}

function buildInput() {
  const evaluationInput = {
    tenantId: "TENANT-1",
    policyId: "policy-1",
    policyVersionHash: "a".repeat(64),
    subjectActorId: "ORD-1",
    requestActorId: "admin-1",
    requestActorRole: "admin" as const,
    resource: "settlement.wise_transfer",
    action: "create",
    decidedAtUtc: "2026-02-13T12:01:00.000Z",
  };

  const evaluationResult = {
    policyId: "policy-1",
    policyVersionHash: "a".repeat(64),
    policyLifecycleState: "ACTIVE",
    shadowEvaluatorVersion: "gov04-shadow-evaluator.v1" as const,
    wouldDecision: "WOULD_BLOCK" as const,
    wouldBlock: true,
    reasonCodes: ["REQUEST_ROLE_NOT_ALLOWED"],
    policyConflictCode: null,
    delegationEvaluationResult: {
      required: false,
      hasValidDelegation: false,
      activeDelegationCount: 0,
      delegationIds: [],
    },
    approvalRequirementEvaluation: {
      required: false,
      hasApprover: false,
      passesSeparationOfDuties: true,
    },
    evaluationPayloadHashSha256: "b".repeat(64),
    canonicalEvaluationJson: "{}",
  };

  return { evaluationInput, evaluationResult };
}

async function testDecisionAppendIsIdempotent() {
  const { deps } = createDeps();
  const input = buildInput();

  const first = await appendAuthorityShadowDecision(input, deps);
  const second = await appendAuthorityShadowDecision(input, deps);

  assert(first.created === true, "Expected first shadow decision insert");
  assert(second.created === false, "Expected shadow decision dedupe");
  assert(first.record.caseKeyHashSha256 === second.record.caseKeyHashSha256, "Expected stable case key hash");
}

async function testListDecisionsByWindow() {
  const { deps } = createDeps();
  const input = buildInput();
  await appendAuthorityShadowDecision(input, deps);

  const listed = await listAuthorityShadowDecisionsByWindow(
    {
      tenantId: "TENANT-1",
      fromUtc: "2026-02-13T12:00:00.000Z",
      toUtc: "2026-02-13T13:00:00.000Z",
    },
    deps
  );

  assert(listed.length === 1, "Expected one shadow decision");
  assert(listed[0].decisionHashSha256.length === 64, "Expected decision hash persisted");
}

async function run() {
  await testDecisionAppendIsIdempotent();
  await testListDecisionsByWindow();
}

run();
