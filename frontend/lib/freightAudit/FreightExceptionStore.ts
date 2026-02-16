import { getDb } from "../db/mongo";
import type { FreightAuditTriggerEvent } from "./FreightAuditRules";

export type FreightExceptionStatus = "OPEN" | "IN_REVIEW" | "ACTION_REQUIRED" | "RESOLVED" | "CLOSED";
export type FreightExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FreightExceptionOrigin = "AUDIT_AUTOMATED" | "MANUAL_FREIGHT" | "MANUAL_ADMIN";
export type FreightExceptionActorRole = "system" | "admin" | "freight" | "regulator";

export type FreightExceptionEventType =
  | "CASE_OPENED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "EVIDENCE_REQUESTED"
  | "EVIDENCE_ATTACHED"
  | "ADMIN_OVERRIDE_RECORDED"
  | "CASE_RESOLVED"
  | "CASE_CLOSED";

export type FreightExceptionDecisionType = "ALLOW_PROGRESS" | "ALLOW_PAYOUT" | "MANUAL_CLOSE";
export type FreightExceptionEvidenceReferenceType = "DOCUMENT_ID" | "URL" | "WEBHOOK_EVENT" | "SYSTEM_REF" | "CUSTOM";

export type FreightExceptionCase = {
  _id?: string;
  exceptionId: string;
  tenantId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  supplierId?: string | null;
  freightPartnerId?: string | null;
  status: FreightExceptionStatus;
  severity: FreightExceptionSeverity;
  origin: FreightExceptionOrigin;
  openedAtUtc: string;
  openedByRole: FreightExceptionActorRole;
  openedById?: string | null;
  latestEventId?: string | null;
  latestEventAtUtc?: string | null;
  linkedAuditRunId?: string | null;
  linkedTriggerEvent?: FreightAuditTriggerEvent | null;
  ruleSetVersion?: string | null;
  idempotencyKey: string;
  closedAtUtc?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FreightExceptionEvent = {
  _id?: string;
  eventId: string;
  exceptionId: string;
  eventType: FreightExceptionEventType;
  fromStatus?: FreightExceptionStatus | null;
  toStatus?: FreightExceptionStatus | null;
  reasonCode?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  eventAtUtc: string;
  actorRole: FreightExceptionActorRole;
  actorId?: string | null;
  idempotencyKey: string;
  createdAt: string;
};

export type FreightExceptionEvidence = {
  _id?: string;
  evidenceId: string;
  exceptionId: string;
  eventId?: string | null;
  evidenceCode: string;
  referenceType: FreightExceptionEvidenceReferenceType;
  referenceId: string;
  contentHashSha256: string;
  capturedAtUtc: string;
  capturedByRole: FreightExceptionActorRole;
  capturedById?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
};

export type FreightExceptionOverride = {
  _id?: string;
  overrideId: string;
  exceptionId: string;
  decisionType: FreightExceptionDecisionType;
  approvalId: string;
  rationale: string;
  evidenceManifestHash: string;
  relatedEventId?: string | null;
  recordedAtUtc: string;
  recordedByRole: FreightExceptionActorRole;
  recordedById?: string | null;
  idempotencyKey: string;
  createdAt: string;
};

export type CreateFreightExceptionCaseInput = Omit<FreightExceptionCase, "_id" | "createdAt" | "updatedAt">;
export type AppendFreightExceptionEventInput = Omit<FreightExceptionEvent, "_id" | "createdAt">;
export type AppendFreightExceptionEvidenceInput = Omit<FreightExceptionEvidence, "_id" | "createdAt">;
export type AppendFreightExceptionOverrideInput = Omit<FreightExceptionOverride, "_id" | "createdAt">;

export type ApplyFreightExceptionProjectionInput = {
  exceptionId: string;
  status?: FreightExceptionStatus;
  latestEventId: string;
  latestEventAtUtc: string;
  closedAtUtc?: string | null;
  updatedAtUtc?: string;
};

const CASE_COLLECTION = "freight_exception_cases";
const EVENT_COLLECTION = "freight_exception_events";
const EVIDENCE_COLLECTION = "freight_exception_evidence";
const OVERRIDE_COLLECTION = "freight_exception_overrides";

let indexesReady: Promise<void> | null = null;

function isHexSha256(input: string) {
  return /^[a-f0-9]{64}$/i.test(input || "");
}

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();

      await db
        .collection<FreightExceptionCase>(CASE_COLLECTION)
        .createIndex({ exceptionId: 1 }, { unique: true, name: "freight_exception_case_id_unique" });
      await db
        .collection<FreightExceptionCase>(CASE_COLLECTION)
        .createIndex({ idempotencyKey: 1 }, { unique: true, name: "freight_exception_case_idempotency_unique" });
      await db
        .collection<FreightExceptionCase>(CASE_COLLECTION)
        .createIndex({ status: 1, severity: 1, openedAtUtc: -1 }, { name: "freight_exception_case_status_severity_opened" });
      await db
        .collection<FreightExceptionCase>(CASE_COLLECTION)
        .createIndex({ tenantId: 1, status: 1, openedAtUtc: -1 }, { name: "freight_exception_case_tenant_status_opened" });
      await db
        .collection<FreightExceptionCase>(CASE_COLLECTION)
        .createIndex({ linkedTriggerEvent: 1, openedAtUtc: -1 }, { name: "freight_exception_case_trigger_opened" });
      await db
        .collection<FreightExceptionCase>(CASE_COLLECTION)
        .createIndex({ orderId: 1, shipmentId: 1, openedAtUtc: -1 }, { name: "freight_exception_case_order_shipment_opened" });

      await db
        .collection<FreightExceptionEvent>(EVENT_COLLECTION)
        .createIndex({ eventId: 1 }, { unique: true, name: "freight_exception_event_id_unique" });
      await db
        .collection<FreightExceptionEvent>(EVENT_COLLECTION)
        .createIndex({ idempotencyKey: 1 }, { unique: true, name: "freight_exception_event_idempotency_unique" });
      await db
        .collection<FreightExceptionEvent>(EVENT_COLLECTION)
        .createIndex({ exceptionId: 1, eventAtUtc: 1 }, { name: "freight_exception_event_exception_eventAt" });
      await db
        .collection<FreightExceptionEvent>(EVENT_COLLECTION)
        .createIndex({ eventType: 1, eventAtUtc: -1 }, { name: "freight_exception_event_type_eventAt" });

      await db
        .collection<FreightExceptionEvidence>(EVIDENCE_COLLECTION)
        .createIndex({ evidenceId: 1 }, { unique: true, name: "freight_exception_evidence_id_unique" });
      await db
        .collection<FreightExceptionEvidence>(EVIDENCE_COLLECTION)
        .createIndex({ idempotencyKey: 1 }, { unique: true, name: "freight_exception_evidence_idempotency_unique" });
      await db
        .collection<FreightExceptionEvidence>(EVIDENCE_COLLECTION)
        .createIndex({ exceptionId: 1, capturedAtUtc: 1 }, { name: "freight_exception_evidence_exception_captured" });
      await db
        .collection<FreightExceptionEvidence>(EVIDENCE_COLLECTION)
        .createIndex({ contentHashSha256: 1 }, { name: "freight_exception_evidence_hash" });

      await db
        .collection<FreightExceptionOverride>(OVERRIDE_COLLECTION)
        .createIndex({ overrideId: 1 }, { unique: true, name: "freight_exception_override_id_unique" });
      await db
        .collection<FreightExceptionOverride>(OVERRIDE_COLLECTION)
        .createIndex({ idempotencyKey: 1 }, { unique: true, name: "freight_exception_override_idempotency_unique" });
      await db
        .collection<FreightExceptionOverride>(OVERRIDE_COLLECTION)
        .createIndex({ exceptionId: 1, recordedAtUtc: 1 }, { name: "freight_exception_override_exception_recorded" });
      await db
        .collection<FreightExceptionOverride>(OVERRIDE_COLLECTION)
        .createIndex({ approvalId: 1, recordedAtUtc: -1 }, { name: "freight_exception_override_approval_recorded" });
    })();
  }
  await indexesReady;
}

async function getCaseRecord(exceptionId: string): Promise<FreightExceptionCase | null> {
  const db = await getDb();
  const doc = await db.collection<FreightExceptionCase>(CASE_COLLECTION).findOne({ exceptionId });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return { ...rest, _id: _id?.toString() } as FreightExceptionCase;
}

async function assertCaseExists(exceptionId: string) {
  const existing = await getCaseRecord(exceptionId);
  if (!existing) throw new Error("FREIGHT_EXCEPTION_CASE_NOT_FOUND");
  return existing;
}

export async function createFreightExceptionCase(input: CreateFreightExceptionCaseInput): Promise<FreightExceptionCase> {
  await ensureIndexes();
  if (!input.exceptionId) throw new Error("exceptionId required");
  if (!input.idempotencyKey) throw new Error("idempotencyKey required");
  if (!input.openedAtUtc) throw new Error("openedAtUtc required");

  const now = new Date().toISOString();
  const record: FreightExceptionCase = {
    exceptionId: input.exceptionId,
    tenantId: input.tenantId || null,
    orderId: input.orderId || null,
    shipmentId: input.shipmentId || null,
    supplierId: input.supplierId || null,
    freightPartnerId: input.freightPartnerId || null,
    status: input.status,
    severity: input.severity,
    origin: input.origin,
    openedAtUtc: input.openedAtUtc,
    openedByRole: input.openedByRole,
    openedById: input.openedById || null,
    latestEventId: input.latestEventId || null,
    latestEventAtUtc: input.latestEventAtUtc || null,
    linkedAuditRunId: input.linkedAuditRunId || null,
    linkedTriggerEvent: input.linkedTriggerEvent || null,
    ruleSetVersion: input.ruleSetVersion || null,
    idempotencyKey: input.idempotencyKey,
    closedAtUtc: input.closedAtUtc || null,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  try {
    const inserted = await db.collection<FreightExceptionCase>(CASE_COLLECTION).insertOne(record as any);
    return { ...record, _id: inserted.insertedId.toString() };
  } catch (err: any) {
    if (err?.code === 11000) {
      const existingByIdempotency = await db
        .collection<FreightExceptionCase>(CASE_COLLECTION)
        .findOne({ idempotencyKey: input.idempotencyKey });
      if (existingByIdempotency) {
        const { _id, ...rest } = existingByIdempotency as any;
        return { ...rest, _id: _id?.toString() } as FreightExceptionCase;
      }
      const existingById = await getCaseRecord(input.exceptionId);
      if (existingById) return existingById;
    }
    throw err;
  }
}

export async function appendFreightExceptionEvents(
  exceptionId: string,
  inputs: AppendFreightExceptionEventInput[]
): Promise<FreightExceptionEvent[]> {
  await ensureIndexes();
  await assertCaseExists(exceptionId);
  const db = await getDb();

  const out: FreightExceptionEvent[] = [];
  for (const input of inputs) {
    if (input.exceptionId !== exceptionId) throw new Error("exceptionId mismatch for exception event");
    if (!input.eventId) throw new Error("eventId required");
    if (!input.idempotencyKey) throw new Error("idempotencyKey required");

    const record: FreightExceptionEvent = {
      ...input,
      fromStatus: input.fromStatus || null,
      toStatus: input.toStatus || null,
      reasonCode: input.reasonCode || null,
      notes: input.notes || null,
      actorId: input.actorId || null,
      createdAt: new Date().toISOString(),
    };

    try {
      const inserted = await db.collection<FreightExceptionEvent>(EVENT_COLLECTION).insertOne(record as any);
      out.push({ ...record, _id: inserted.insertedId.toString() });
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await db
          .collection<FreightExceptionEvent>(EVENT_COLLECTION)
          .findOne({ idempotencyKey: record.idempotencyKey });
        if (existing) {
          const { _id, ...rest } = existing as any;
          out.push({ ...rest, _id: _id?.toString() } as FreightExceptionEvent);
          continue;
        }
      }
      throw err;
    }
  }
  return out;
}

export async function applyFreightExceptionCaseProjection(input: ApplyFreightExceptionProjectionInput): Promise<FreightExceptionCase> {
  await ensureIndexes();
  if (!input.latestEventId) throw new Error("latestEventId required");
  if (!input.latestEventAtUtc) throw new Error("latestEventAtUtc required");

  const now = input.updatedAtUtc || new Date().toISOString();
  const setFields: Record<string, unknown> = {
    latestEventId: input.latestEventId,
    latestEventAtUtc: input.latestEventAtUtc,
    updatedAt: now,
  };
  if (input.status) setFields.status = input.status;
  if (Object.prototype.hasOwnProperty.call(input, "closedAtUtc")) {
    setFields.closedAtUtc = input.closedAtUtc || null;
  }

  const db = await getDb();
  const updated = await db
    .collection<FreightExceptionCase>(CASE_COLLECTION)
    .findOneAndUpdate({ exceptionId: input.exceptionId }, { $set: setFields }, { returnDocument: "after" });

  if (!updated) throw new Error("FREIGHT_EXCEPTION_CASE_NOT_FOUND");
  const { _id, ...rest } = updated as any;
  return { ...rest, _id: _id?.toString() } as FreightExceptionCase;
}

export async function appendFreightExceptionEvidence(
  exceptionId: string,
  inputs: AppendFreightExceptionEvidenceInput[]
): Promise<FreightExceptionEvidence[]> {
  await ensureIndexes();
  await assertCaseExists(exceptionId);
  const db = await getDb();

  const out: FreightExceptionEvidence[] = [];
  for (const input of inputs) {
    if (input.exceptionId !== exceptionId) throw new Error("exceptionId mismatch for exception evidence");
    if (!input.idempotencyKey) throw new Error("idempotencyKey required");
    if (!input.evidenceId) throw new Error("evidenceId required");
    if (!isHexSha256(input.contentHashSha256)) throw new Error("contentHashSha256 must be SHA-256 hex");

    const record: FreightExceptionEvidence = {
      ...input,
      eventId: input.eventId || null,
      capturedById: input.capturedById || null,
      createdAt: new Date().toISOString(),
    };

    try {
      const inserted = await db.collection<FreightExceptionEvidence>(EVIDENCE_COLLECTION).insertOne(record as any);
      out.push({ ...record, _id: inserted.insertedId.toString() });
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await db
          .collection<FreightExceptionEvidence>(EVIDENCE_COLLECTION)
          .findOne({ idempotencyKey: record.idempotencyKey });
        if (existing) {
          const { _id, ...rest } = existing as any;
          out.push({ ...rest, _id: _id?.toString() } as FreightExceptionEvidence);
          continue;
        }
      }
      throw err;
    }
  }
  return out;
}

export async function appendFreightExceptionOverrides(
  exceptionId: string,
  inputs: AppendFreightExceptionOverrideInput[]
): Promise<FreightExceptionOverride[]> {
  await ensureIndexes();
  await assertCaseExists(exceptionId);
  const db = await getDb();

  const out: FreightExceptionOverride[] = [];
  for (const input of inputs) {
    if (input.exceptionId !== exceptionId) throw new Error("exceptionId mismatch for exception override");
    if (!input.overrideId) throw new Error("overrideId required");
    if (!input.idempotencyKey) throw new Error("idempotencyKey required");
    if (!input.approvalId) throw new Error("approvalId required");
    if (!input.rationale?.trim()) throw new Error("rationale required");
    if (!isHexSha256(input.evidenceManifestHash)) throw new Error("evidenceManifestHash must be SHA-256 hex");

    const record: FreightExceptionOverride = {
      ...input,
      relatedEventId: input.relatedEventId || null,
      recordedById: input.recordedById || null,
      createdAt: new Date().toISOString(),
    };

    try {
      const inserted = await db.collection<FreightExceptionOverride>(OVERRIDE_COLLECTION).insertOne(record as any);
      out.push({ ...record, _id: inserted.insertedId.toString() });
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await db
          .collection<FreightExceptionOverride>(OVERRIDE_COLLECTION)
          .findOne({ idempotencyKey: record.idempotencyKey });
        if (existing) {
          const { _id, ...rest } = existing as any;
          out.push({ ...rest, _id: _id?.toString() } as FreightExceptionOverride);
          continue;
        }
      }
      throw err;
    }
  }
  return out;
}

export async function getFreightExceptionCase(exceptionId: string) {
  await ensureIndexes();
  return getCaseRecord(exceptionId);
}

export async function listFreightExceptionCases(filters: {
  tenantId?: string;
  status?: FreightExceptionStatus;
  severity?: FreightExceptionSeverity;
  triggerEvent?: FreightAuditTriggerEvent;
  orderId?: string;
  shipmentId?: string;
  limit?: number;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (filters.tenantId) query.tenantId = filters.tenantId;
  if (filters.status) query.status = filters.status;
  if (filters.severity) query.severity = filters.severity;
  if (filters.triggerEvent) query.linkedTriggerEvent = filters.triggerEvent;
  if (filters.orderId) query.orderId = filters.orderId;
  if (filters.shipmentId) query.shipmentId = filters.shipmentId;

  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
  const docs = (await db
    .collection<FreightExceptionCase>(CASE_COLLECTION)
    .find(query)
    .sort({ openedAtUtc: -1 })
    .limit(limit)
    .toArray()) as any[];

  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() } as FreightExceptionCase));
}

export async function listFreightExceptionEvents(exceptionId: string) {
  await ensureIndexes();
  const db = await getDb();
  const docs = (await db
    .collection<FreightExceptionEvent>(EVENT_COLLECTION)
    .find({ exceptionId })
    .sort({ eventAtUtc: 1, eventId: 1 })
    .toArray()) as any[];
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() } as FreightExceptionEvent));
}

export async function listFreightExceptionEvidence(exceptionId: string) {
  await ensureIndexes();
  const db = await getDb();
  const docs = (await db
    .collection<FreightExceptionEvidence>(EVIDENCE_COLLECTION)
    .find({ exceptionId })
    .sort({ capturedAtUtc: 1, evidenceId: 1 })
    .toArray()) as any[];
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() } as FreightExceptionEvidence));
}

export async function listFreightExceptionOverrides(exceptionId: string) {
  await ensureIndexes();
  const db = await getDb();
  const docs = (await db
    .collection<FreightExceptionOverride>(OVERRIDE_COLLECTION)
    .find({ exceptionId })
    .sort({ recordedAtUtc: 1, overrideId: 1 })
    .toArray()) as any[];
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() } as FreightExceptionOverride));
}
