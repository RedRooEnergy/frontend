import { getDb } from "../../db/mongo";
import {
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalPayloadHash,
} from "./hash";
import { computeAuthorityShadowCaseKeyHash } from "./shadowStore";
import type {
  AuthorityShadowCaseEventType,
  AuthorityShadowCaseStatus,
  AuthorityShadowDecisionRecord,
  AuthorityShadowOverrideCaseEventRecord,
  AuthorityShadowOverrideCaseRecord,
} from "./shadowTypes";
import type { AuthorityActorRole } from "./types";

const CASE_COLLECTION = "governance_authority_shadow_override_cases";
const CASE_EVENT_COLLECTION = "governance_authority_shadow_override_case_events";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
  };
};

type CaseCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

type CaseEventCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

export type AuthorityShadowCaseStoreDependencies = {
  getCaseCollection: () => Promise<CaseCollection>;
  getCaseEventCollection: () => Promise<CaseEventCollection>;
  now: () => Date;
};

const defaultDependencies: AuthorityShadowCaseStoreDependencies = {
  getCaseCollection: async () => {
    const db = await getDb();
    return db.collection(CASE_COLLECTION) as unknown as CaseCollection;
  },
  getCaseEventCollection: async () => {
    const db = await getDb();
    return db.collection(CASE_EVENT_COLLECTION) as unknown as CaseEventCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(overrides: Partial<AuthorityShadowCaseStoreDependencies> = {}): AuthorityShadowCaseStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicCase(raw: any): AuthorityShadowOverrideCaseRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityShadowOverrideCaseRecord;
}

function toPublicCaseEvent(raw: any): AuthorityShadowOverrideCaseEventRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityShadowOverrideCaseEventRecord;
}

export async function ensureAuthorityShadowCaseIndexes(
  dependencyOverrides: Partial<AuthorityShadowCaseStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const caseCollection = await deps.getCaseCollection();
      const eventCollection = await deps.getCaseEventCollection();

      await caseCollection.createIndex({ caseId: 1 }, { unique: true, name: "gov_authority_shadow_case_id_unique" });
      await caseCollection.createIndex(
        { caseKeyHashSha256: 1 },
        { unique: true, name: "gov_authority_shadow_case_caseKey_unique" }
      );
      await caseCollection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "gov_authority_shadow_case_idempotency_unique" }
      );
      await caseCollection.createIndex(
        { tenantId: 1, status: 1, openedAtUtc: -1 },
        { name: "gov_authority_shadow_case_tenant_status_openedAt" }
      );
      await caseCollection.createIndex(
        { resource: 1, action: 1, openedAtUtc: -1 },
        { name: "gov_authority_shadow_case_resource_action_openedAt" }
      );

      await eventCollection.createIndex({ eventId: 1 }, { unique: true, name: "gov_authority_shadow_case_event_id_unique" });
      await eventCollection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "gov_authority_shadow_case_event_idempotency_unique" }
      );
      await eventCollection.createIndex({ caseId: 1, eventAtUtc: -1 }, { name: "gov_authority_shadow_case_event_case_eventAt" });
    })();
  }

  await indexesReady;
}

function buildCaseId(input: {
  tenantId?: string | null;
  subjectActorId: string;
  resource: string;
  action: string;
  policyVersionHash?: string | null;
  caseKeyHashSha256: string;
}) {
  return buildDeterministicArtifactId({
    artifactClass: "authority_shadow_override_case",
    tenantId: input.tenantId || "",
    primaryKeyFields: [input.subjectActorId, input.resource, input.action, input.policyVersionHash || ""],
    canonicalPayloadHash: input.caseKeyHashSha256,
  });
}

function buildCaseIdempotencyKey(input: {
  tenantId?: string | null;
  caseId: string;
  openedByDecisionId: string;
  openedAtUtc: string;
}) {
  const casePayloadHash = canonicalPayloadHash({
    caseId: input.caseId,
    openedByDecisionId: input.openedByDecisionId,
    openedAtUtc: input.openedAtUtc,
  });

  return buildDeterministicIdempotencyKey({
    artifactClass: "authority_shadow_override_case",
    tenantId: input.tenantId || "",
    primaryKeyFields: [input.caseId, input.openedByDecisionId],
    canonicalPayloadHash: casePayloadHash,
  });
}

export type AppendAuthorityShadowCaseEventInput = {
  caseId: string;
  caseKeyHashSha256: string;
  eventType: AuthorityShadowCaseEventType;
  priorStatus: AuthorityShadowCaseStatus | null;
  newStatus: AuthorityShadowCaseStatus;
  decisionId?: string | null;
  actorId: string;
  actorRole: AuthorityActorRole;
  reasonCode?: string | null;
  eventAtUtc: string;
  metadata?: Record<string, unknown>;
};

export async function appendAuthorityShadowCaseEvent(
  input: AppendAuthorityShadowCaseEventInput,
  dependencyOverrides: Partial<AuthorityShadowCaseStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityShadowOverrideCaseEventRecord }> {
  await ensureAuthorityShadowCaseIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCaseEventCollection();

  const eventPayload = {
    caseId: String(input.caseId || "").trim(),
    caseKeyHashSha256: String(input.caseKeyHashSha256 || "").trim().toLowerCase(),
    eventType: input.eventType,
    priorStatus: input.priorStatus || null,
    newStatus: input.newStatus,
    decisionId: String(input.decisionId || "").trim() || null,
    actorId: String(input.actorId || "").trim(),
    actorRole: input.actorRole,
    reasonCode: String(input.reasonCode || "").trim() || null,
    eventAtUtc: String(input.eventAtUtc || deps.now().toISOString()),
    metadata: input.metadata || null,
  };

  const eventHashSha256 = canonicalPayloadHash(eventPayload);
  const eventId = buildDeterministicArtifactId({
    artifactClass: "authority_shadow_override_case_event",
    tenantId: "",
    primaryKeyFields: [eventPayload.caseId, eventPayload.eventType, eventPayload.eventAtUtc, eventPayload.decisionId || ""],
    canonicalPayloadHash: eventHashSha256,
  });
  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_shadow_override_case_event",
    tenantId: "",
    primaryKeyFields: [eventPayload.caseId, eventPayload.eventType, eventPayload.eventAtUtc, eventPayload.decisionId || ""],
    canonicalPayloadHash: eventHashSha256,
  });

  const record: AuthorityShadowOverrideCaseEventRecord = {
    eventId,
    caseId: eventPayload.caseId,
    caseKeyHashSha256: eventPayload.caseKeyHashSha256,
    idempotencyKey,
    eventType: eventPayload.eventType,
    priorStatus: eventPayload.priorStatus,
    newStatus: eventPayload.newStatus,
    decisionId: eventPayload.decisionId,
    actorId: eventPayload.actorId,
    actorRole: eventPayload.actorRole,
    reasonCode: eventPayload.reasonCode,
    eventHashSha256,
    eventAtUtc: eventPayload.eventAtUtc,
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
      if (existing) return { created: false, record: toPublicCaseEvent(existing) };
    }
    throw error;
  }
}

export async function openOrGetAuthorityShadowOverrideCase(
  input: {
    decision: AuthorityShadowDecisionRecord;
    actorId: string;
    actorRole: AuthorityActorRole;
    reasonCode?: string;
    metadata?: Record<string, unknown>;
  },
  dependencyOverrides: Partial<AuthorityShadowCaseStoreDependencies> = {}
): Promise<{ created: boolean; caseRecord: AuthorityShadowOverrideCaseRecord; linkedEvent: AuthorityShadowOverrideCaseEventRecord }> {
  await ensureAuthorityShadowCaseIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const caseCollection = await deps.getCaseCollection();

  const decision = input.decision;
  const caseKeyHashSha256 = computeAuthorityShadowCaseKeyHash({
    tenantId: decision.tenantId,
    subjectActorId: decision.subjectActorId,
    resource: decision.resource,
    action: decision.action,
    policyVersionHash: decision.policyVersionHash,
  });

  const caseId = buildCaseId({
    tenantId: decision.tenantId,
    subjectActorId: decision.subjectActorId,
    resource: decision.resource,
    action: decision.action,
    policyVersionHash: decision.policyVersionHash,
    caseKeyHashSha256,
  });

  const openedAtUtc = decision.decidedAtUtc;
  const idempotencyKey = buildCaseIdempotencyKey({
    tenantId: decision.tenantId,
    caseId,
    openedByDecisionId: decision.decisionId,
    openedAtUtc,
  });

  const nowUtc = deps.now().toISOString();
  const caseRecord: AuthorityShadowOverrideCaseRecord = {
    caseId,
    caseKeyHashSha256,
    idempotencyKey,
    tenantId: decision.tenantId || null,
    policyId: decision.policyId,
    policyVersionHash: decision.policyVersionHash,
    subjectActorId: decision.subjectActorId,
    resource: decision.resource,
    action: decision.action,
    status: "OPEN",
    openedByDecisionId: decision.decisionId,
    openedAtUtc,
    metadata: input.metadata,
    createdAtUtc: nowUtc,
    updatedAtUtc: nowUtc,
  };

  let created = false;
  let persisted = caseRecord;

  try {
    const inserted = await caseCollection.insertOne(caseRecord as any);
    created = true;
    persisted = {
      ...caseRecord,
      _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing =
        (await caseCollection.findOne({ caseKeyHashSha256 })) ||
        (await caseCollection.findOne({ caseId })) ||
        (await caseCollection.findOne({ idempotencyKey }));
      if (existing) {
        persisted = toPublicCase(existing);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  if (created) {
    await appendAuthorityShadowCaseEvent(
      {
        caseId: persisted.caseId,
        caseKeyHashSha256: persisted.caseKeyHashSha256,
        eventType: "CASE_OPENED",
        priorStatus: null,
        newStatus: "OPEN",
        decisionId: decision.decisionId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        reasonCode: input.reasonCode || decision.policyConflictCode || "SHADOW_BLOCKING_DECISION",
        eventAtUtc: openedAtUtc,
        metadata: {
          source: "authority.shadow.case_scaffold",
          ...(input.metadata || {}),
        },
      },
      dependencyOverrides
    );
  }

  const linkedEvent = await appendAuthorityShadowCaseEvent(
    {
      caseId: persisted.caseId,
      caseKeyHashSha256: persisted.caseKeyHashSha256,
      eventType: "DECISION_LINKED",
      priorStatus: persisted.status,
      newStatus: persisted.status,
      decisionId: decision.decisionId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      reasonCode: input.reasonCode || null,
      eventAtUtc: decision.decidedAtUtc,
      metadata: {
        wouldDecision: decision.wouldDecision,
        reasonCodes: decision.reasonCodes,
      },
    },
    dependencyOverrides
  );

  return {
    created,
    caseRecord: persisted,
    linkedEvent: linkedEvent.record,
  };
}

export async function listAuthorityShadowOverrideCasesByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
    status?: AuthorityShadowCaseStatus;
    policyId?: string;
  },
  dependencyOverrides: Partial<AuthorityShadowCaseStoreDependencies> = {}
): Promise<AuthorityShadowOverrideCaseRecord[]> {
  await ensureAuthorityShadowCaseIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCaseCollection();

  const query: Record<string, unknown> = {};
  if (params.tenantId) query.tenantId = String(params.tenantId).trim();
  if (params.status) query.status = params.status;
  if (params.policyId) query.policyId = String(params.policyId).trim();

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.openedAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ openedAtUtc: -1, caseId: 1 }).limit(limit).toArray();
  return docs.map(toPublicCase);
}

export async function listAuthorityShadowOverrideCaseEventsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    caseId?: string;
    eventType?: AuthorityShadowCaseEventType;
  },
  dependencyOverrides: Partial<AuthorityShadowCaseStoreDependencies> = {}
): Promise<AuthorityShadowOverrideCaseEventRecord[]> {
  await ensureAuthorityShadowCaseIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCaseEventCollection();

  const query: Record<string, unknown> = {};
  if (params.caseId) query.caseId = String(params.caseId).trim();
  if (params.eventType) query.eventType = params.eventType;

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.eventAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ eventAtUtc: -1, eventId: 1 }).limit(limit).toArray();
  return docs.map(toPublicCaseEvent);
}
