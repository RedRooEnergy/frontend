import {
  appendAuthorityDelegationEvent,
  listAuthorityDelegationEventsByWindow,
  type AuthorityDelegationStoreDependencies,
} from "../../../lib/governance/authority/delegationStore";
import type { AuthorityDelegationEventRecord } from "../../../lib/governance/authority/types";

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
  const rows: AuthorityDelegationEventRecord[] = [];
  const collection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = rows.find((row) => row.eventId === doc.eventId || row.idempotencyKey === doc.idempotencyKey);
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

  const deps: Partial<AuthorityDelegationStoreDependencies> = {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-13T12:00:00.000Z"),
  };

  return { deps };
}

async function testDelegationGrantRequiresApprovalId() {
  const { deps } = createDeps();
  let thrown = false;
  try {
    await appendAuthorityDelegationEvent(
      {
        eventType: "DELEGATION_GRANTED",
        tenantId: "TENANT-1",
        grantorActorId: "admin-1",
        granteeActorId: "ops-1",
        resource: "settlement.wise_transfer",
        action: "create",
        actorRole: "admin",
        actorId: "admin-1",
      },
      deps
    );
  } catch (error: any) {
    thrown = String(error?.message || "").includes("approvalId required");
  }
  assert(thrown, "Expected approvalId requirement for delegation grant");
}

async function testDelegationAppendIsIdempotent() {
  const { deps } = createDeps();

  const input = {
    eventType: "DELEGATION_GRANTED" as const,
    tenantId: "TENANT-1",
    grantorActorId: "admin-1",
    grantorActorRole: "admin" as const,
    granteeActorId: "ops-1",
    granteeActorRole: "admin" as const,
    resource: "settlement.wise_transfer",
    action: "create",
    approvalId: "APR-001",
    validFromUtc: "2026-02-13T12:00:00.000Z",
    validToUtc: "2026-02-20T12:00:00.000Z",
    eventAtUtc: "2026-02-13T12:00:00.000Z",
    actorRole: "admin" as const,
    actorId: "admin-1",
  };

  const first = await appendAuthorityDelegationEvent(input, deps);
  const second = await appendAuthorityDelegationEvent(input, deps);

  assert(first.created === true, "Expected first delegation event insert");
  assert(second.created === false, "Expected deterministic delegation dedupe");
  assert(first.record.delegationId === second.record.delegationId, "Expected stable delegation id");

  const listed = await listAuthorityDelegationEventsByWindow({ tenantId: "TENANT-1" }, deps);
  assert(listed.length === 1, "Expected one delegation record");
}

async function run() {
  await testDelegationGrantRequiresApprovalId();
  await testDelegationAppendIsIdempotent();
}

run();
