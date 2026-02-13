import {
  appendAuthorityPolicyLifecycleEvent,
  listAuthorityPolicyLifecycleEventsByWindow,
  listAuthorityPolicyVersionsByWindow,
  registerAuthorityPolicyVersion,
  type AuthorityPolicyStoreDependencies,
} from "../../../lib/governance/authority/policyStore";
import type {
  AuthorityPolicyLifecycleEventRecord,
  AuthorityPolicyVersionRecord,
} from "../../../lib/governance/authority/types";

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

function createMemoryCollection<T extends Record<string, any>>(rows: T[], uniqueChecks: Array<(existing: T, next: T) => boolean>) {
  return {
    async createIndex() {
      return;
    },
    async insertOne(doc: T) {
      const duplicate = rows.find((row) => uniqueChecks.some((check) => check(row, doc)));
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
      return rows.find((row) => matchesQuery(row, query)) || null;
    },
    find(query: Record<string, unknown>) {
      let current = rows.filter((row) => matchesQuery(row, query));
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
}

function createDeps() {
  const policyRows: AuthorityPolicyVersionRecord[] = [];
  const lifecycleRows: AuthorityPolicyLifecycleEventRecord[] = [];

  const policyCollection = createMemoryCollection(policyRows as any, [
    (existing, next) => existing.policyVersionId === next.policyVersionId,
    (existing, next) => existing.idempotencyKey === next.idempotencyKey,
    (existing, next) => existing.policyId === next.policyId && existing.policyVersionHash === next.policyVersionHash,
  ]);

  const lifecycleCollection = createMemoryCollection(lifecycleRows as any, [
    (existing, next) => existing.eventId === next.eventId,
    (existing, next) => existing.idempotencyKey === next.idempotencyKey,
  ]);

  const deps: Partial<AuthorityPolicyStoreDependencies> = {
    getPolicyVersionCollection: async () => policyCollection as any,
    getPolicyLifecycleCollection: async () => lifecycleCollection as any,
    now: () => new Date("2026-02-13T12:00:00.000Z"),
  };

  return { deps };
}

async function testPolicyVersionRegistrationIsDeterministicAndIdempotent() {
  const { deps } = createDeps();

  const first = await registerAuthorityPolicyVersion(
    {
      policyId: "policy.payment.override",
      policySchemaVersion: "gov04-authority-policy.v1",
      policy: {
        resource: "settlement.wise_transfer",
        action: "create",
        constraints: { requireApprovalId: true, allowRoles: ["admin"] },
      },
      createdByRole: "system",
      createdById: "bootstrap",
    },
    deps
  );

  const second = await registerAuthorityPolicyVersion(
    {
      policyId: "policy.payment.override",
      policySchemaVersion: "gov04-authority-policy.v1",
      policy: {
        action: "create",
        constraints: { allowRoles: ["admin"], requireApprovalId: true },
        resource: "settlement.wise_transfer",
      },
      createdByRole: "system",
      createdById: "bootstrap",
    },
    deps
  );

  assert(first.created === true, "Expected first policy version insert");
  assert(second.created === false, "Expected deterministic policy dedupe");
  assert(first.record.policyVersionHash === second.record.policyVersionHash, "Expected stable policy hash");

  const listed = await listAuthorityPolicyVersionsByWindow({ policyId: "policy.payment.override" }, deps);
  assert(listed.length === 1, "Expected one policy version record");
}

async function testPolicyLifecycleAppendIsIdempotent() {
  const { deps } = createDeps();

  const policy = await registerAuthorityPolicyVersion(
    {
      policyId: "policy.freight.override",
      policySchemaVersion: "gov04-authority-policy.v1",
      policy: { resource: "freight.settlement_hold", action: "override" },
      createdByRole: "system",
      createdById: "bootstrap",
    },
    deps
  );

  const eventAtUtc = "2026-02-13T12:01:00.000Z";
  const first = await appendAuthorityPolicyLifecycleEvent(
    {
      policyId: policy.record.policyId,
      policyVersionHash: policy.record.policyVersionHash,
      lifecycleState: "ACTIVE",
      reasonCode: "INITIAL_RELEASE",
      eventAtUtc,
      actorRole: "system",
      actorId: "bootstrap",
    },
    deps
  );

  const second = await appendAuthorityPolicyLifecycleEvent(
    {
      policyId: policy.record.policyId,
      policyVersionHash: policy.record.policyVersionHash,
      lifecycleState: "ACTIVE",
      reasonCode: "INITIAL_RELEASE",
      eventAtUtc,
      actorRole: "system",
      actorId: "bootstrap",
    },
    deps
  );

  assert(first.created === true, "Expected lifecycle event insert");
  assert(second.created === false, "Expected lifecycle event dedupe");

  const listed = await listAuthorityPolicyLifecycleEventsByWindow({ policyId: policy.record.policyId }, deps);
  assert(listed.length === 1, "Expected one lifecycle record");
  assert(listed[0].lifecycleState === "ACTIVE", "Expected lifecycle state preserved");
}

async function run() {
  await testPolicyVersionRegistrationIsDeterministicAndIdempotent();
  await testPolicyLifecycleAppendIsIdempotent();
}

run();
