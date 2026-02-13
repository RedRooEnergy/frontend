import {
  openOrGetAuthorityShadowOverrideCase,
  listAuthorityShadowOverrideCasesByWindow,
  listAuthorityShadowOverrideCaseEventsByWindow,
  type AuthorityShadowCaseStoreDependencies,
} from "../../../lib/governance/authority/shadowCaseStore";
import type {
  AuthorityShadowDecisionRecord,
  AuthorityShadowOverrideCaseEventRecord,
  AuthorityShadowOverrideCaseRecord,
} from "../../../lib/governance/authority/shadowTypes";

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
  const cases: AuthorityShadowOverrideCaseRecord[] = [];
  const caseEvents: AuthorityShadowOverrideCaseEventRecord[] = [];

  const caseCollection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = cases.find(
        (row) => row.caseId === doc.caseId || row.caseKeyHashSha256 === doc.caseKeyHashSha256 || row.idempotencyKey === doc.idempotencyKey
      );
      if (duplicate) {
        const err: any = new Error("duplicate key");
        err.code = 11000;
        throw err;
      }
      const inserted = { ...doc, _id: `${cases.length + 1}` };
      cases.push(inserted);
      return { insertedId: inserted._id };
    },
    async findOne(query: Record<string, unknown>) {
      return cases.find((row) => matchesQuery(row as any, query)) || null;
    },
    find(query: Record<string, unknown>) {
      let current = cases.filter((row) => matchesQuery(row as any, query));
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

  const eventCollection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = caseEvents.find((row) => row.eventId === doc.eventId || row.idempotencyKey === doc.idempotencyKey);
      if (duplicate) {
        const err: any = new Error("duplicate key");
        err.code = 11000;
        throw err;
      }
      const inserted = { ...doc, _id: `${caseEvents.length + 1}` };
      caseEvents.push(inserted);
      return { insertedId: inserted._id };
    },
    async findOne(query: Record<string, unknown>) {
      return caseEvents.find((row) => matchesQuery(row as any, query)) || null;
    },
    find(query: Record<string, unknown>) {
      let current = caseEvents.filter((row) => matchesQuery(row as any, query));
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

  const deps: Partial<AuthorityShadowCaseStoreDependencies> = {
    getCaseCollection: async () => caseCollection as any,
    getCaseEventCollection: async () => eventCollection as any,
    now: () => new Date("2026-02-13T12:00:00.000Z"),
  };

  return { deps };
}

function buildDecision(overrides: Partial<AuthorityShadowDecisionRecord> = {}): AuthorityShadowDecisionRecord {
  return {
    decisionId: "sd-1",
    caseKeyHashSha256: "a".repeat(64),
    idempotencyKey: "b".repeat(64),
    tenantId: "TENANT-1",
    policyId: "policy-1",
    policyVersionHash: "c".repeat(64),
    policyLifecycleState: "ACTIVE",
    subjectActorId: "ORD-1",
    requestActorId: "admin-1",
    requestActorRole: "admin",
    approverActorId: null,
    approverActorRole: null,
    delegationId: null,
    resource: "settlement.wise_transfer",
    action: "create",
    wouldDecision: "WOULD_BLOCK",
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
    shadowEvaluatorVersion: "gov04-shadow-evaluator.v1",
    decisionHashSha256: "d".repeat(64),
    canonicalDecisionJson: "{}",
    decidedAtUtc: "2026-02-13T12:01:00.000Z",
    metadata: {},
    createdAtUtc: "2026-02-13T12:01:00.000Z",
    ...overrides,
  };
}

async function testCaseOpenIsIdempotentByCaseKey() {
  const { deps } = createDeps();
  const decision = buildDecision();

  const first = await openOrGetAuthorityShadowOverrideCase(
    {
      decision,
      actorId: "admin-1",
      actorRole: "admin",
      reasonCode: "SHADOW_WOULD_BLOCK",
    },
    deps
  );

  const second = await openOrGetAuthorityShadowOverrideCase(
    {
      decision,
      actorId: "admin-1",
      actorRole: "admin",
      reasonCode: "SHADOW_WOULD_BLOCK",
    },
    deps
  );

  assert(first.created === true, "Expected first case creation");
  assert(second.created === false, "Expected existing case reuse");
  assert(first.caseRecord.caseId === second.caseRecord.caseId, "Expected stable case id");
}

async function testCaseAndEventListing() {
  const { deps } = createDeps();
  const decision = buildDecision();

  await openOrGetAuthorityShadowOverrideCase(
    {
      decision,
      actorId: "admin-1",
      actorRole: "admin",
      reasonCode: "SHADOW_WOULD_BLOCK",
    },
    deps
  );

  const cases = await listAuthorityShadowOverrideCasesByWindow(
    {
      tenantId: "TENANT-1",
      fromUtc: "2026-02-13T12:00:00.000Z",
      toUtc: "2026-02-13T13:00:00.000Z",
    },
    deps
  );
  assert(cases.length === 1, "Expected one shadow case");

  const events = await listAuthorityShadowOverrideCaseEventsByWindow(
    {
      fromUtc: "2026-02-13T12:00:00.000Z",
      toUtc: "2026-02-13T13:00:00.000Z",
    },
    deps
  );
  assert(events.length >= 1, "Expected shadow case events");
}

async function run() {
  await testCaseOpenIsIdempotentByCaseKey();
  await testCaseAndEventListing();
}

run();
