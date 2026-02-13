import {
  appendAuthorityApprovalDecision,
  computeAuthorityActorChainHash,
  listAuthorityApprovalDecisionsByWindow,
  type AuthorityDecisionStoreDependencies,
} from "../../../lib/governance/authority/decisionStore";
import type { AuthorityApprovalDecisionRecord, AuthorityActorChain } from "../../../lib/governance/authority/types";

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
  const rows: AuthorityApprovalDecisionRecord[] = [];
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

  const deps: Partial<AuthorityDecisionStoreDependencies> = {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-13T12:00:00.000Z"),
  };

  return { deps };
}

function testActorChainHashIsDeterministic() {
  const chainA: AuthorityActorChain = {
    requestActorId: "admin-1",
    requestActorRole: "admin",
    approverActorId: "admin-2",
    approverActorRole: "admin",
    delegationId: "del-1",
    policyVersionHash: "a".repeat(64),
    sessionId: "sess-1",
    elevationHash: "b".repeat(64),
  };

  const chainB: AuthorityActorChain = {
    policyVersionHash: "a".repeat(64),
    requestActorRole: "admin",
    requestActorId: "admin-1",
    approverActorRole: "admin",
    approverActorId: "admin-2",
    delegationId: "del-1",
    sessionId: "sess-1",
    elevationHash: "b".repeat(64),
  };

  assert(computeAuthorityActorChainHash(chainA) === computeAuthorityActorChainHash(chainB), "Expected actor chain hash determinism");
}

async function testDecisionAppendIsIdempotent() {
  const { deps } = createDeps();

  const decisionInput = {
    tenantId: "TENANT-1",
    policyId: "policy.settlement.transfer",
    policyVersionHash: "c".repeat(64),
    subjectActorId: "ORD-001",
    requestActorId: "admin-1",
    requestActorRole: "admin" as const,
    resource: "settlement.wise_transfer",
    action: "create",
    decision: "OBSERVED_ALLOW" as const,
    reasonCodes: ["AUTHORIZED"],
    actorChain: {
      requestActorId: "admin-1",
      requestActorRole: "admin" as const,
      policyVersionHash: "c".repeat(64),
      sessionId: "sess-1",
      elevationHash: "d".repeat(64),
    },
    decidedAtUtc: "2026-02-13T12:10:00.000Z",
  };

  const first = await appendAuthorityApprovalDecision(decisionInput, deps);
  const second = await appendAuthorityApprovalDecision(decisionInput, deps);

  assert(first.created === true, "Expected first decision insert");
  assert(second.created === false, "Expected duplicate decision dedupe");

  const listed = await listAuthorityApprovalDecisionsByWindow({ tenantId: "TENANT-1" }, deps);
  assert(listed.length === 1, "Expected one decision row");
}

async function testApprovalDecisionRequiresApprovalId() {
  const { deps } = createDeps();
  let thrown = false;

  try {
    await appendAuthorityApprovalDecision(
      {
        tenantId: "TENANT-1",
        policyId: "policy.settlement.transfer",
        policyVersionHash: "c".repeat(64),
        subjectActorId: "ORD-001",
        requestActorId: "admin-1",
        requestActorRole: "admin",
        resource: "settlement.wise_transfer",
        action: "create",
        decision: "APPROVED",
        reasonCodes: ["MANUAL_APPROVAL"],
        actorChain: {
          requestActorId: "admin-1",
          requestActorRole: "admin",
          policyVersionHash: "c".repeat(64),
        },
      },
      deps
    );
  } catch (error: any) {
    thrown = String(error?.message || "").includes("approvalId required");
  }

  assert(thrown, "Expected approvalId requirement for APPROVED decision");
}

async function run() {
  testActorChainHashIsDeterministic();
  await testDecisionAppendIsIdempotent();
  await testApprovalDecisionRequiresApprovalId();
}

run();
