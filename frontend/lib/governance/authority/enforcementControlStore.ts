import { getDb } from "../../db/mongo";
import {
  assertHexSha256,
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalJson,
  canonicalPayloadHash,
} from "./hash";
import type { AuthorityEnforcementControlEventRecord, AuthorityEnforcementControlEventType } from "./enforcementTypes";

const COLLECTION = "governance_authority_enforcement_control_events";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
  };
};

type ControlCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>, options?: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

export type AuthorityEnforcementControlStoreDependencies = {
  getCollection: () => Promise<ControlCollection>;
  now: () => Date;
};

const defaultDependencies: AuthorityEnforcementControlStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as ControlCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(
  overrides: Partial<AuthorityEnforcementControlStoreDependencies> = {}
): AuthorityEnforcementControlStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): AuthorityEnforcementControlEventRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityEnforcementControlEventRecord;
}

export async function ensureAuthorityEnforcementControlIndexes(
  dependencyOverrides: Partial<AuthorityEnforcementControlStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex({ controlEventId: 1 }, { unique: true, name: "gov_authority_control_event_id_unique" });
      await collection.createIndex({ idempotencyKey: 1 }, { unique: true, name: "gov_authority_control_idempotency_unique" });
      await collection.createIndex({ eventType: 1, eventAtUtc: -1 }, { name: "gov_authority_control_type_eventAt" });
      await collection.createIndex({ killSwitchState: 1, eventAtUtc: -1 }, { name: "gov_authority_control_state_eventAt" });
      await collection.createIndex({ guardReportId: 1, eventAtUtc: -1 }, { name: "gov_authority_control_guard_eventAt" });
    })();
  }

  await indexesReady;
}

function buildCanonicalControlPayload(input: {
  eventType: AuthorityEnforcementControlEventType;
  killSwitchState: boolean;
  reasonCode: string;
  guardReportId?: string | null;
  reportHashSha256?: string | null;
  triggeredBy: string;
  eventAtUtc: string;
  metadata?: Record<string, unknown>;
}) {
  const reportHashSha256 = String(input.reportHashSha256 || "").trim().toLowerCase() || null;
  if (reportHashSha256) {
    assertHexSha256(reportHashSha256, "reportHashSha256");
  }

  return {
    eventType: input.eventType,
    killSwitchState: input.killSwitchState === true,
    reasonCode: String(input.reasonCode || "").trim(),
    guardReportId: String(input.guardReportId || "").trim() || null,
    reportHashSha256,
    triggeredBy: String(input.triggeredBy || "").trim(),
    eventAtUtc: String(input.eventAtUtc || "").trim(),
    metadata: input.metadata || null,
  } as const;
}

export type AppendAuthorityEnforcementControlEventInput = {
  eventType: AuthorityEnforcementControlEventType;
  killSwitchState: boolean;
  reasonCode: string;
  guardReportId?: string | null;
  reportHashSha256?: string | null;
  triggeredBy: string;
  eventAtUtc?: string;
  metadata?: Record<string, unknown>;
};

export async function appendAuthorityEnforcementControlEvent(
  input: AppendAuthorityEnforcementControlEventInput,
  dependencyOverrides: Partial<AuthorityEnforcementControlStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityEnforcementControlEventRecord }> {
  await ensureAuthorityEnforcementControlIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const eventAtUtc = String(input.eventAtUtc || deps.now().toISOString());
  const canonicalPayload = buildCanonicalControlPayload({
    ...input,
    eventAtUtc,
  });

  if (!canonicalPayload.reasonCode) throw new Error("reasonCode required");
  if (!canonicalPayload.triggeredBy) throw new Error("triggeredBy required");

  const deterministicHashSha256 = canonicalPayloadHash(canonicalPayload);
  const canonicalControlJson = canonicalJson(canonicalPayload);
  const controlEventId = buildDeterministicArtifactId({
    artifactClass: "authority_enforcement_control_event",
    tenantId: "",
    primaryKeyFields: [
      canonicalPayload.eventType,
      canonicalPayload.killSwitchState ? "1" : "0",
      canonicalPayload.reasonCode,
      canonicalPayload.guardReportId || "",
      canonicalPayload.reportHashSha256 || "",
      canonicalPayload.triggeredBy,
      canonicalPayload.eventAtUtc,
    ],
    canonicalPayloadHash: deterministicHashSha256,
  });
  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_enforcement_control_event",
    tenantId: "",
    primaryKeyFields: [
      canonicalPayload.eventType,
      canonicalPayload.killSwitchState ? "1" : "0",
      canonicalPayload.reasonCode,
      canonicalPayload.guardReportId || "",
      canonicalPayload.reportHashSha256 || "",
      canonicalPayload.triggeredBy,
      canonicalPayload.eventAtUtc,
    ],
    canonicalPayloadHash: deterministicHashSha256,
  });

  const record: AuthorityEnforcementControlEventRecord = {
    controlEventId,
    idempotencyKey,
    eventType: canonicalPayload.eventType,
    killSwitchState: canonicalPayload.killSwitchState,
    reasonCode: canonicalPayload.reasonCode,
    guardReportId: canonicalPayload.guardReportId,
    reportHashSha256: canonicalPayload.reportHashSha256,
    triggeredBy: canonicalPayload.triggeredBy,
    eventAtUtc: canonicalPayload.eventAtUtc,
    deterministicHashSha256,
    canonicalControlJson,
    metadata: input.metadata,
    createdAtUtc: deps.now().toISOString(),
  };

  try {
    const inserted = await collection.insertOne(record as any);
    return {
      created: true,
      record: {
        ...record,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing =
        (await collection.findOne({ controlEventId })) || (await collection.findOne({ idempotencyKey }));
      if (existing) return { created: false, record: toPublicRecord(existing) };
    }
    throw error;
  }
}

export async function activateAuthorityEnforcementKillSwitch(
  input: {
    reasonCode: string;
    guardReportId?: string | null;
    reportHashSha256?: string | null;
    triggeredBy: string;
    eventAtUtc?: string;
    metadata?: Record<string, unknown>;
  },
  dependencyOverrides: Partial<AuthorityEnforcementControlStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityEnforcementControlEventRecord }> {
  return appendAuthorityEnforcementControlEvent(
    {
      eventType: "KILL_SWITCH_ACTIVATED",
      killSwitchState: true,
      reasonCode: input.reasonCode,
      guardReportId: input.guardReportId || null,
      reportHashSha256: input.reportHashSha256 || null,
      triggeredBy: input.triggeredBy,
      eventAtUtc: input.eventAtUtc,
      metadata: input.metadata,
    },
    dependencyOverrides
  );
}

export async function getAuthorityEnforcementKillSwitchState(
  dependencyOverrides: Partial<AuthorityEnforcementControlStoreDependencies> = {}
): Promise<boolean> {
  await ensureAuthorityEnforcementControlIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const docs = await collection.find({}).sort({ eventAtUtc: -1, controlEventId: 1 }).limit(1).toArray();
  if (!docs.length) return false;
  return Boolean(docs[0]?.killSwitchState);
}

export async function listAuthorityEnforcementControlEventsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    eventType?: AuthorityEnforcementControlEventType;
    killSwitchState?: boolean;
  },
  dependencyOverrides: Partial<AuthorityEnforcementControlStoreDependencies> = {}
): Promise<AuthorityEnforcementControlEventRecord[]> {
  await ensureAuthorityEnforcementControlIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const query: Record<string, unknown> = {};
  if (params.eventType) query.eventType = params.eventType;
  if (typeof params.killSwitchState === "boolean") query.killSwitchState = params.killSwitchState;

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.eventAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ eventAtUtc: -1, controlEventId: 1 }).limit(limit).toArray();
  return docs.map(toPublicRecord);
}
