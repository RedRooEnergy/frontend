import { getDb } from "../../db/mongo";
import {
  assertHexSha256,
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalJson,
  canonicalPayloadHash,
} from "./hash";
import type {
  AuthorityPolicyLifecycleEventRecord,
  AuthorityPolicyLifecycleState,
  AuthorityPolicyVersionRecord,
  AuthorityActorRole,
} from "./types";

const POLICY_VERSION_COLLECTION = "governance_authority_policy_versions";
const POLICY_LIFECYCLE_EVENT_COLLECTION = "governance_authority_policy_lifecycle_events";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
  };
};

type PolicyVersionCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

type PolicyLifecycleCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

export type AuthorityPolicyStoreDependencies = {
  getPolicyVersionCollection: () => Promise<PolicyVersionCollection>;
  getPolicyLifecycleCollection: () => Promise<PolicyLifecycleCollection>;
  now: () => Date;
};

const defaultDependencies: AuthorityPolicyStoreDependencies = {
  getPolicyVersionCollection: async () => {
    const db = await getDb();
    return db.collection(POLICY_VERSION_COLLECTION) as unknown as PolicyVersionCollection;
  },
  getPolicyLifecycleCollection: async () => {
    const db = await getDb();
    return db.collection(POLICY_LIFECYCLE_EVENT_COLLECTION) as unknown as PolicyLifecycleCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(overrides: Partial<AuthorityPolicyStoreDependencies> = {}): AuthorityPolicyStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicPolicyVersionRecord(raw: any): AuthorityPolicyVersionRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityPolicyVersionRecord;
}

function toPublicPolicyLifecycleRecord(raw: any): AuthorityPolicyLifecycleEventRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityPolicyLifecycleEventRecord;
}

export async function ensureAuthorityPolicyIndexes(
  dependencyOverrides: Partial<AuthorityPolicyStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const policyCollection = await deps.getPolicyVersionCollection();
      const lifecycleCollection = await deps.getPolicyLifecycleCollection();

      await policyCollection.createIndex(
        { policyVersionId: 1 },
        { unique: true, name: "gov_authority_policy_version_id_unique" }
      );
      await policyCollection.createIndex(
        { policyId: 1, policyVersionHash: 1 },
        { unique: true, name: "gov_authority_policy_id_version_unique" }
      );
      await policyCollection.createIndex(
        { policyVersionHash: 1 },
        { unique: true, name: "gov_authority_policy_version_hash_unique" }
      );
      await policyCollection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "gov_authority_policy_idempotency_unique" }
      );
      await policyCollection.createIndex(
        { policyId: 1, createdAtUtc: -1 },
        { name: "gov_authority_policy_id_createdAt" }
      );

      await lifecycleCollection.createIndex(
        { eventId: 1 },
        { unique: true, name: "gov_authority_policy_lifecycle_event_id_unique" }
      );
      await lifecycleCollection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "gov_authority_policy_lifecycle_idempotency_unique" }
      );
      await lifecycleCollection.createIndex(
        { policyId: 1, eventAtUtc: -1 },
        { name: "gov_authority_policy_lifecycle_policy_eventAt" }
      );
      await lifecycleCollection.createIndex(
        { policyVersionHash: 1, eventAtUtc: -1 },
        { name: "gov_authority_policy_lifecycle_version_eventAt" }
      );
    })();
  }

  await indexesReady;
}

export type RegisterAuthorityPolicyVersionInput = {
  policyId: string;
  policySchemaVersion: string;
  policy: unknown;
  createdByRole: AuthorityActorRole;
  createdById: string;
  createdAtUtc?: string;
  metadata?: Record<string, unknown>;
};

export async function registerAuthorityPolicyVersion(
  input: RegisterAuthorityPolicyVersionInput,
  dependencyOverrides: Partial<AuthorityPolicyStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityPolicyVersionRecord }> {
  await ensureAuthorityPolicyIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getPolicyVersionCollection();

  const policyId = String(input.policyId || "").trim();
  const policySchemaVersion = String(input.policySchemaVersion || "").trim();
  const createdById = String(input.createdById || "").trim();
  if (!policyId) throw new Error("policyId required");
  if (!policySchemaVersion) throw new Error("policySchemaVersion required");
  if (!createdById) throw new Error("createdById required");

  const canonicalPolicyJson = canonicalJson(input.policy);
  const policyVersionHash = canonicalPayloadHash(input.policy);
  const policyVersionId = buildDeterministicArtifactId({
    artifactClass: "authority_policy_version",
    tenantId: "",
    primaryKeyFields: [policyId, policySchemaVersion, policyVersionHash],
    canonicalPayloadHash: policyVersionHash,
  });
  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_policy_version",
    tenantId: "",
    primaryKeyFields: [policyId, policySchemaVersion],
    canonicalPayloadHash: policyVersionHash,
  });

  const createdAtUtc = String(input.createdAtUtc || deps.now().toISOString());
  const record: AuthorityPolicyVersionRecord = {
    policyVersionId,
    policyId,
    policyVersionHash,
    policySchemaVersion,
    canonicalPolicyJson,
    createdAtUtc,
    createdByRole: input.createdByRole,
    createdById,
    idempotencyKey,
    metadata: input.metadata,
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
        (await collection.findOne({ policyVersionId })) ||
        (await collection.findOne({ policyId, policyVersionHash })) ||
        (await collection.findOne({ idempotencyKey }));
      if (existing) {
        return { created: false, record: toPublicPolicyVersionRecord(existing) };
      }
    }
    throw error;
  }
}

export async function getAuthorityPolicyVersion(
  policyId: string,
  policyVersionHash: string,
  dependencyOverrides: Partial<AuthorityPolicyStoreDependencies> = {}
): Promise<AuthorityPolicyVersionRecord | null> {
  await ensureAuthorityPolicyIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getPolicyVersionCollection();

  const found = await collection.findOne({
    policyId: String(policyId || "").trim(),
    policyVersionHash: String(policyVersionHash || "").trim(),
  });

  return found ? toPublicPolicyVersionRecord(found) : null;
}

export async function listAuthorityPolicyVersionsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    policyId?: string;
  },
  dependencyOverrides: Partial<AuthorityPolicyStoreDependencies> = {}
): Promise<AuthorityPolicyVersionRecord[]> {
  await ensureAuthorityPolicyIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getPolicyVersionCollection();

  const query: Record<string, unknown> = {};
  if (params.policyId) query.policyId = String(params.policyId).trim();

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.createdAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ createdAtUtc: -1, policyVersionId: 1 }).limit(limit).toArray();
  return docs.map(toPublicPolicyVersionRecord);
}

export type AppendAuthorityPolicyLifecycleEventInput = {
  policyId: string;
  policyVersionHash: string;
  lifecycleState: AuthorityPolicyLifecycleState;
  reasonCode?: string | null;
  eventAtUtc?: string;
  actorRole: AuthorityActorRole;
  actorId: string;
  metadata?: Record<string, unknown>;
};

export async function appendAuthorityPolicyLifecycleEvent(
  input: AppendAuthorityPolicyLifecycleEventInput,
  dependencyOverrides: Partial<AuthorityPolicyStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityPolicyLifecycleEventRecord }> {
  await ensureAuthorityPolicyIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getPolicyLifecycleCollection();

  const policyId = String(input.policyId || "").trim();
  const policyVersionHash = String(input.policyVersionHash || "").trim().toLowerCase();
  const actorId = String(input.actorId || "").trim();
  if (!policyId) throw new Error("policyId required");
  if (!policyVersionHash) throw new Error("policyVersionHash required");
  if (!actorId) throw new Error("actorId required");
  assertHexSha256(policyVersionHash, "policyVersionHash");

  const eventAtUtc = String(input.eventAtUtc || deps.now().toISOString());
  const canonicalPayload = {
    policyId,
    policyVersionHash,
    lifecycleState: input.lifecycleState,
    reasonCode: input.reasonCode || null,
    eventAtUtc,
    actorRole: input.actorRole,
    actorId,
    metadata: input.metadata || null,
  };
  const eventHashSha256 = canonicalPayloadHash(canonicalPayload);
  const eventId = buildDeterministicArtifactId({
    artifactClass: "authority_policy_lifecycle_event",
    tenantId: "",
    primaryKeyFields: [policyId, policyVersionHash, input.lifecycleState, eventAtUtc],
    canonicalPayloadHash: eventHashSha256,
  });
  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_policy_lifecycle_event",
    tenantId: "",
    primaryKeyFields: [policyId, policyVersionHash, input.lifecycleState, eventAtUtc],
    canonicalPayloadHash: eventHashSha256,
  });

  const record: AuthorityPolicyLifecycleEventRecord = {
    eventId,
    policyId,
    policyVersionHash,
    lifecycleState: input.lifecycleState,
    reasonCode: input.reasonCode || null,
    eventAtUtc,
    actorRole: input.actorRole,
    actorId,
    eventHashSha256,
    idempotencyKey,
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
      const existing = (await collection.findOne({ eventId })) || (await collection.findOne({ idempotencyKey }));
      if (existing) {
        return { created: false, record: toPublicPolicyLifecycleRecord(existing) };
      }
    }
    throw error;
  }
}

export async function listAuthorityPolicyLifecycleEventsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    policyId?: string;
    policyVersionHash?: string;
  },
  dependencyOverrides: Partial<AuthorityPolicyStoreDependencies> = {}
): Promise<AuthorityPolicyLifecycleEventRecord[]> {
  await ensureAuthorityPolicyIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getPolicyLifecycleCollection();

  const query: Record<string, unknown> = {};
  if (params.policyId) query.policyId = String(params.policyId).trim();
  if (params.policyVersionHash) query.policyVersionHash = String(params.policyVersionHash).trim().toLowerCase();

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.eventAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ eventAtUtc: -1, eventId: 1 }).limit(limit).toArray();
  return docs.map(toPublicPolicyLifecycleRecord);
}
