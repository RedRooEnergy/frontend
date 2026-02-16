import { getDb } from "../db/mongo";

export type FreightSettlementHoldStatus = "REVIEW_REQUIRED" | "OVERRIDDEN" | "RELEASED";
export type FreightSettlementHoldReasonCode = "BLOCKING_FAILURES_PRESENT";

export type FreightSettlementHold = {
  _id?: string;
  holdId: string;
  tenantId: string;
  orderId: string;
  shipmentId?: string | null;
  triggerEvent: "PAYOUT_READY";
  runId: string;
  ruleSetVersion: string;
  shadowPolicyVersion: string;
  reasonCode: FreightSettlementHoldReasonCode;
  blockingFailures: number;
  criticalFailures: number;
  status: FreightSettlementHoldStatus;
  createdAtUtc: string;
  createdByRole: "system";
  createdById?: string | null;
  linkedExceptionId?: string | null;
  overrideApprovalId?: string | null;
  overrideEvidenceManifestHash?: string | null;
  overrideRationale?: string | null;
  overrideRecordedAtUtc?: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateFreightSettlementHoldInput = Omit<FreightSettlementHold, "_id" | "createdAt" | "updatedAt">;

export type CreateFreightSettlementHoldResult = {
  hold: FreightSettlementHold;
  created: boolean;
};

const COLLECTION = "freight_settlement_holds";
let indexesReady: Promise<void> | null = null;

function isHexSha256(input: string) {
  return /^[a-f0-9]{64}$/i.test(input || "");
}

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db.collection<FreightSettlementHold>(COLLECTION).createIndex(
        { holdId: 1 },
        { unique: true, name: "freight_settlement_hold_id_unique" }
      );
      await db.collection<FreightSettlementHold>(COLLECTION).createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "freight_settlement_hold_idempotency_unique" }
      );
      await db.collection<FreightSettlementHold>(COLLECTION).createIndex(
        { tenantId: 1, orderId: 1, triggerEvent: 1, status: 1 },
        {
          unique: true,
          partialFilterExpression: { status: "REVIEW_REQUIRED" },
          name: "freight_settlement_hold_active_unique",
        }
      );
      await db.collection<FreightSettlementHold>(COLLECTION).createIndex(
        { orderId: 1, createdAtUtc: -1 },
        { name: "freight_settlement_hold_order_createdAt" }
      );
      await db.collection<FreightSettlementHold>(COLLECTION).createIndex(
        { status: 1, createdAtUtc: -1 },
        { name: "freight_settlement_hold_status_createdAt" }
      );
      await db.collection<FreightSettlementHold>(COLLECTION).createIndex(
        { tenantId: 1, status: 1, createdAtUtc: -1 },
        { name: "freight_settlement_hold_tenant_status_createdAt" }
      );
    })();
  }
  await indexesReady;
}

function toPublicRecord(raw: any): FreightSettlementHold {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as FreightSettlementHold;
}

export async function getFreightSettlementHold(holdId: string) {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection<FreightSettlementHold>(COLLECTION).findOne({ holdId });
  if (!doc) return null;
  return toPublicRecord(doc);
}

export async function getLatestFreightSettlementHold(params: {
  tenantId: string;
  orderId: string;
  triggerEvent?: "PAYOUT_READY";
}) {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db
    .collection<FreightSettlementHold>(COLLECTION)
    .find({
      tenantId: params.tenantId,
      orderId: params.orderId,
      triggerEvent: params.triggerEvent || "PAYOUT_READY",
    })
    .sort({ createdAtUtc: -1, holdId: -1 })
    .limit(1)
    .next();

  return doc ? toPublicRecord(doc) : null;
}

export async function createFreightSettlementHold(input: CreateFreightSettlementHoldInput): Promise<CreateFreightSettlementHoldResult> {
  await ensureIndexes();
  if (!input.holdId) throw new Error("holdId required");
  if (!input.tenantId) throw new Error("tenantId required");
  if (!input.orderId) throw new Error("orderId required");
  if (!input.runId) throw new Error("runId required");
  if (!input.ruleSetVersion) throw new Error("ruleSetVersion required");
  if (!input.shadowPolicyVersion) throw new Error("shadowPolicyVersion required");
  if (!input.idempotencyKey) throw new Error("idempotencyKey required");
  if (input.status !== "REVIEW_REQUIRED") throw new Error("status must be REVIEW_REQUIRED when creating a hold");

  const now = new Date().toISOString();
  const record: FreightSettlementHold = {
    holdId: input.holdId,
    tenantId: input.tenantId,
    orderId: input.orderId,
    shipmentId: input.shipmentId || null,
    triggerEvent: "PAYOUT_READY",
    runId: input.runId,
    ruleSetVersion: input.ruleSetVersion,
    shadowPolicyVersion: input.shadowPolicyVersion,
    reasonCode: "BLOCKING_FAILURES_PRESENT",
    blockingFailures: input.blockingFailures,
    criticalFailures: input.criticalFailures,
    status: "REVIEW_REQUIRED",
    createdAtUtc: input.createdAtUtc,
    createdByRole: "system",
    createdById: input.createdById || null,
    linkedExceptionId: input.linkedExceptionId || null,
    overrideApprovalId: null,
    overrideEvidenceManifestHash: null,
    overrideRationale: null,
    overrideRecordedAtUtc: null,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  try {
    const inserted = await db.collection<FreightSettlementHold>(COLLECTION).insertOne(record as any);
    return { hold: { ...record, _id: inserted.insertedId.toString() }, created: true };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existingByIdempotency = await db
        .collection<FreightSettlementHold>(COLLECTION)
        .findOne({ idempotencyKey: input.idempotencyKey });
      if (existingByIdempotency) return { hold: toPublicRecord(existingByIdempotency), created: false };

      const existingActive = await db.collection<FreightSettlementHold>(COLLECTION).findOne({
        tenantId: input.tenantId,
        orderId: input.orderId,
        triggerEvent: "PAYOUT_READY",
        status: "REVIEW_REQUIRED",
      });
      if (existingActive) return { hold: toPublicRecord(existingActive), created: false };
    }
    throw error;
  }
}

export async function overrideFreightSettlementHold(input: {
  holdId: string;
  approvalId: string;
  rationale: string;
  evidenceManifestHash: string;
  linkedExceptionId?: string | null;
  recordedAtUtc?: string;
}) {
  await ensureIndexes();
  if (!input.holdId) throw new Error("holdId required");
  if (!input.approvalId?.trim()) throw new Error("approvalId required");
  if (!input.rationale?.trim()) throw new Error("rationale required");
  if (!isHexSha256(input.evidenceManifestHash)) throw new Error("evidenceManifestHash must be SHA-256 hex");

  const db = await getDb();
  const recordedAtUtc = input.recordedAtUtc || new Date().toISOString();
  const setFields: Record<string, unknown> = {
    status: "OVERRIDDEN",
    overrideApprovalId: input.approvalId,
    overrideRationale: input.rationale,
    overrideEvidenceManifestHash: input.evidenceManifestHash,
    overrideRecordedAtUtc: recordedAtUtc,
    updatedAt: recordedAtUtc,
  };
  if (Object.prototype.hasOwnProperty.call(input, "linkedExceptionId")) {
    setFields.linkedExceptionId = input.linkedExceptionId || null;
  }

  const updated = await db.collection<FreightSettlementHold>(COLLECTION).findOneAndUpdate(
    { holdId: input.holdId, status: "REVIEW_REQUIRED" },
    { $set: setFields },
    { returnDocument: "after" }
  );

  if (updated) return toPublicRecord(updated);

  const existing = await db.collection<FreightSettlementHold>(COLLECTION).findOne({ holdId: input.holdId });
  if (!existing) throw new Error("FREIGHT_SETTLEMENT_HOLD_NOT_FOUND");
  return toPublicRecord(existing);
}

export async function listFreightSettlementHolds(filters: {
  status?: FreightSettlementHoldStatus;
  tenantId?: string;
  orderId?: string;
  limit?: number;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.tenantId) query.tenantId = filters.tenantId;
  if (filters.orderId) query.orderId = filters.orderId;

  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
  const docs = (await db
    .collection<FreightSettlementHold>(COLLECTION)
    .find(query)
    .sort({ createdAtUtc: -1, holdId: -1 })
    .limit(limit)
    .toArray()) as any[];

  return docs.map(toPublicRecord);
}
