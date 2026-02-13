import {
  activateAuthorityEnforcementKillSwitch,
  appendAuthorityEnforcementControlEvent,
  getAuthorityEnforcementKillSwitchState,
  listAuthorityEnforcementControlEventsByWindow,
  type AuthorityEnforcementControlStoreDependencies,
} from "../../../lib/governance/authority/enforcementControlStore";
import type { AuthorityEnforcementControlEventRecord } from "../../../lib/governance/authority/enforcementTypes";

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
  const rows: AuthorityEnforcementControlEventRecord[] = [];
  const collection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = rows.find(
        (row) => row.controlEventId === doc.controlEventId || row.idempotencyKey === doc.idempotencyKey
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

  const deps: Partial<AuthorityEnforcementControlStoreDependencies> = {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-13T12:00:00.000Z"),
  };

  return { deps };
}

async function testActivateKillSwitchIdempotent() {
  const { deps } = createDeps();
  const input = {
    reasonCode: "GUARD_PAGE",
    guardReportId: "guard-1",
    reportHashSha256: "a".repeat(64),
    triggeredBy: "authority-enforcement-auto-guard.ts",
    eventAtUtc: "2026-02-13T12:00:00.000Z",
  };
  const first = await activateAuthorityEnforcementKillSwitch(input, deps);
  const second = await activateAuthorityEnforcementKillSwitch(input, deps);

  assert(first.created === true, "Expected initial activation");
  assert(second.created === false, "Expected idempotent activation dedupe");
  assert(second.record.killSwitchState === true, "Expected kill switch state true");
}

async function testKillSwitchStateTracksLatestEvent() {
  const { deps } = createDeps();
  await appendAuthorityEnforcementControlEvent(
    {
      eventType: "KILL_SWITCH_ACTIVATED",
      killSwitchState: true,
      reasonCode: "GUARD_PAGE",
      guardReportId: "guard-2",
      reportHashSha256: "b".repeat(64),
      triggeredBy: "test",
      eventAtUtc: "2026-02-13T12:00:00.000Z",
    },
    deps
  );
  await appendAuthorityEnforcementControlEvent(
    {
      eventType: "KILL_SWITCH_DEACTIVATED",
      killSwitchState: false,
      reasonCode: "MANUAL_RESET",
      triggeredBy: "test",
      eventAtUtc: "2026-02-13T12:05:00.000Z",
    },
    deps
  );

  const state = await getAuthorityEnforcementKillSwitchState(deps);
  assert(state === false, "Expected latest kill switch state from latest event");
}

async function testListByWindowAndState() {
  const { deps } = createDeps();
  await appendAuthorityEnforcementControlEvent(
    {
      eventType: "KILL_SWITCH_ACTIVATED",
      killSwitchState: true,
      reasonCode: "GUARD_PAGE",
      guardReportId: "guard-3",
      reportHashSha256: "c".repeat(64),
      triggeredBy: "test",
      eventAtUtc: "2026-02-13T12:10:00.000Z",
    },
    deps
  );

  const listed = await listAuthorityEnforcementControlEventsByWindow(
    {
      fromUtc: "2026-02-13T12:00:00.000Z",
      toUtc: "2026-02-13T13:00:00.000Z",
      killSwitchState: true,
      eventType: "KILL_SWITCH_ACTIVATED",
    },
    deps
  );

  assert(listed.length === 1, "Expected one activation event in window");
  assert(listed[0].reasonCode === "GUARD_PAGE", "Expected reasonCode preserved");
}

async function run() {
  await testActivateKillSwitchIdempotent();
  await testKillSwitchStateTracksLatestEvent();
  await testListByWindowAndState();
}

run();
