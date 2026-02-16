import { getDb } from "../db/mongo";
import type { FreightAuditEvaluationSummary, FreightRuleEvaluation } from "./FreightAuditEngine";
import type {
  FreightAuditRuleId,
  FreightAuditRuleSet,
  FreightAuditSeverity,
  FreightAuditTriggerEvent,
} from "./FreightAuditRules";

export type FreightAuditRunStatus = "OPEN" | "CLOSED";
export type FreightAuditActorRole = "system" | "admin" | "freight" | "regulator";

export type FreightAuditRun = {
  _id?: string;
  runId: string;
  ruleSetId: FreightAuditRuleSet["ruleSetId"];
  ruleSetVersion: string;
  triggerEvent: FreightAuditTriggerEvent;
  status: FreightAuditRunStatus;
  contextSnapshotHash: string;
  orderId?: string | null;
  shipmentId?: string | null;
  supplierId?: string | null;
  freightPartnerId?: string | null;
  tenantId?: string | null;
  startedAt: string;
  closedAt?: string | null;
  createdByRole: FreightAuditActorRole;
  createdById?: string | null;
  closedByRole?: FreightAuditActorRole | null;
  closedById?: string | null;
  summary?: FreightAuditEvaluationSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type FreightAuditResult = {
  _id?: string;
  runId: string;
  ruleId: FreightAuditRuleId;
  ruleSetVersion: string;
  triggerEvent: FreightAuditTriggerEvent;
  passed: boolean;
  severity: FreightAuditSeverity;
  escalationLevel: FreightRuleEvaluation["escalationLevel"];
  missingEvidenceCodes: string[];
  evaluatedAtUtc: string;
  evaluatorKey: string;
  detailsCode?: string | null;
  idempotencyKey: string;
  createdAt: string;
};

export type FreightAuditEvidenceSource = "API" | "WEBHOOK" | "DOCUMENT" | "CUSTOMS" | "CARRIER" | "SYSTEM";

export type FreightAuditEvidence = {
  _id?: string;
  evidenceId: string;
  runId: string;
  ruleId: FreightAuditRuleId;
  ruleSetVersion: string;
  evidenceCode: string;
  source: FreightAuditEvidenceSource;
  referenceType: "DOCUMENT_ID" | "URL" | "WEBHOOK_EVENT" | "SYSTEM_REF" | "CUSTOM";
  referenceId: string;
  contentHashSha256: string;
  metadata?: Record<string, unknown>;
  capturedAtUtc: string;
  capturedByRole: FreightAuditActorRole;
  capturedById?: string | null;
  idempotencyKey: string;
  createdAt: string;
};

export type CreateFreightAuditRunInput = Omit<
  FreightAuditRun,
  "_id" | "status" | "closedAt" | "closedByRole" | "closedById" | "summary" | "createdAt" | "updatedAt"
>;

export type CloseFreightAuditRunInput = {
  runId: string;
  summary: FreightAuditEvaluationSummary;
  closedByRole: FreightAuditActorRole;
  closedById?: string | null;
  closedAtUtc?: string;
};

export type AppendFreightAuditResultInput = Omit<FreightAuditResult, "_id" | "idempotencyKey" | "createdAt">;
export type AppendFreightAuditEvidenceInput = Omit<FreightAuditEvidence, "_id" | "idempotencyKey" | "createdAt">;

const RUN_COLLECTION = "freight_audit_runs";
const RESULT_COLLECTION = "freight_audit_results";
const EVIDENCE_COLLECTION = "freight_audit_evidence";

let indexesReady: Promise<void> | null = null;

function stableJoin(parts: string[]) {
  return parts.map((part) => String(part || "").trim()).join(":");
}

function resultIdempotencyKey(input: AppendFreightAuditResultInput) {
  return stableJoin([input.runId, input.ruleId, input.ruleSetVersion, input.triggerEvent, input.evaluatedAtUtc]);
}

function evidenceIdempotencyKey(input: AppendFreightAuditEvidenceInput) {
  return stableJoin([input.runId, input.ruleId, input.evidenceCode, input.contentHashSha256, input.referenceId]);
}

function isHexSha256(input: string) {
  return /^[a-f0-9]{64}$/i.test(input || "");
}

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();

      await db.collection<FreightAuditRun>(RUN_COLLECTION).createIndex(
        { runId: 1 },
        { unique: true, name: "freight_audit_runId_unique" }
      );
      await db.collection<FreightAuditRun>(RUN_COLLECTION).createIndex(
        { status: 1, startedAt: -1 },
        { name: "freight_audit_status_startedAt" }
      );
      await db.collection<FreightAuditRun>(RUN_COLLECTION).createIndex(
        { triggerEvent: 1, startedAt: -1 },
        { name: "freight_audit_trigger_startedAt" }
      );
      await db.collection<FreightAuditRun>(RUN_COLLECTION).createIndex(
        { orderId: 1, shipmentId: 1, startedAt: -1 },
        { name: "freight_audit_order_shipment_startedAt" }
      );

      await db.collection<FreightAuditResult>(RESULT_COLLECTION).createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "freight_audit_result_idempotency_unique" }
      );
      await db.collection<FreightAuditResult>(RESULT_COLLECTION).createIndex(
        { runId: 1, ruleId: 1 },
        { unique: true, name: "freight_audit_result_run_rule_unique" }
      );
      await db.collection<FreightAuditResult>(RESULT_COLLECTION).createIndex(
        { runId: 1, evaluatedAtUtc: 1 },
        { name: "freight_audit_result_run_evaluatedAt" }
      );
      await db.collection<FreightAuditResult>(RESULT_COLLECTION).createIndex(
        { severity: 1, passed: 1, createdAt: -1 },
        { name: "freight_audit_result_severity_passed_createdAt" }
      );

      await db.collection<FreightAuditEvidence>(EVIDENCE_COLLECTION).createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "freight_audit_evidence_idempotency_unique" }
      );
      await db.collection<FreightAuditEvidence>(EVIDENCE_COLLECTION).createIndex(
        { runId: 1, ruleId: 1, capturedAtUtc: 1 },
        { name: "freight_audit_evidence_run_rule_capturedAt" }
      );
      await db.collection<FreightAuditEvidence>(EVIDENCE_COLLECTION).createIndex(
        { runId: 1, evidenceCode: 1 },
        { name: "freight_audit_evidence_run_code" }
      );
      await db.collection<FreightAuditEvidence>(EVIDENCE_COLLECTION).createIndex(
        { contentHashSha256: 1 },
        { name: "freight_audit_evidence_hash" }
      );
    })();
  }
  await indexesReady;
}

async function getRunRecord(runId: string): Promise<FreightAuditRun | null> {
  const db = await getDb();
  const doc = await db.collection<FreightAuditRun>(RUN_COLLECTION).findOne({ runId });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return { ...rest, _id: _id?.toString() } as FreightAuditRun;
}

async function assertRunWritable(runId: string) {
  const run = await getRunRecord(runId);
  if (!run) throw new Error("FREIGHT_AUDIT_RUN_NOT_FOUND");
  if (run.status !== "OPEN") throw new Error("FREIGHT_AUDIT_RUN_CLOSED");
  return run;
}

export async function createFreightAuditRun(input: CreateFreightAuditRunInput): Promise<FreightAuditRun> {
  await ensureIndexes();
  if (!input.runId) throw new Error("runId required");
  if (!input.ruleSetVersion) throw new Error("ruleSetVersion required");
  if (!isHexSha256(input.contextSnapshotHash)) throw new Error("contextSnapshotHash must be SHA-256 hex");

  const now = new Date().toISOString();
  const record: FreightAuditRun = {
    runId: input.runId,
    ruleSetId: input.ruleSetId,
    ruleSetVersion: input.ruleSetVersion,
    triggerEvent: input.triggerEvent,
    status: "OPEN",
    contextSnapshotHash: input.contextSnapshotHash,
    orderId: input.orderId || null,
    shipmentId: input.shipmentId || null,
    supplierId: input.supplierId || null,
    freightPartnerId: input.freightPartnerId || null,
    tenantId: input.tenantId || null,
    startedAt: input.startedAt,
    createdByRole: input.createdByRole,
    createdById: input.createdById || null,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  try {
    const result = await db.collection<FreightAuditRun>(RUN_COLLECTION).insertOne(record as any);
    return { ...record, _id: result.insertedId.toString() };
  } catch (err: any) {
    if (err?.code === 11000) {
      const existing = await getRunRecord(input.runId);
      if (existing) return existing;
    }
    throw err;
  }
}

export async function closeFreightAuditRun(input: CloseFreightAuditRunInput): Promise<FreightAuditRun> {
  await ensureIndexes();
  const db = await getDb();
  const closedAt = input.closedAtUtc || new Date().toISOString();

  const updated = await db.collection<FreightAuditRun>(RUN_COLLECTION).findOneAndUpdate(
    { runId: input.runId, status: "OPEN" },
    {
      $set: {
        status: "CLOSED",
        summary: input.summary,
        closedAt,
        closedByRole: input.closedByRole,
        closedById: input.closedById || null,
        updatedAt: closedAt,
      },
    },
    { returnDocument: "after" }
  );

  if (!updated) {
    const existing = await getRunRecord(input.runId);
    if (!existing) throw new Error("FREIGHT_AUDIT_RUN_NOT_FOUND");
    if (existing.status === "CLOSED") return existing;
    throw new Error("FREIGHT_AUDIT_RUN_CLOSE_FAILED");
  }

  const { _id, ...rest } = updated as any;
  return { ...rest, _id: _id?.toString() } as FreightAuditRun;
}

export async function appendFreightAuditResults(
  runId: string,
  inputs: AppendFreightAuditResultInput[]
): Promise<FreightAuditResult[]> {
  await ensureIndexes();
  await assertRunWritable(runId);
  const db = await getDb();

  const out: FreightAuditResult[] = [];
  for (const input of inputs) {
    if (input.runId !== runId) throw new Error("runId mismatch for audit result");
    const record: FreightAuditResult = {
      ...input,
      missingEvidenceCodes: (input.missingEvidenceCodes || []).slice().sort((a, b) => a.localeCompare(b)),
      idempotencyKey: resultIdempotencyKey(input),
      createdAt: new Date().toISOString(),
    };

    try {
      const inserted = await db.collection<FreightAuditResult>(RESULT_COLLECTION).insertOne(record as any);
      out.push({ ...record, _id: inserted.insertedId.toString() });
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await db
          .collection<FreightAuditResult>(RESULT_COLLECTION)
          .findOne({ idempotencyKey: record.idempotencyKey });
        if (existing) {
          const { _id, ...rest } = existing as any;
          out.push({ ...rest, _id: _id?.toString() } as FreightAuditResult);
          continue;
        }
      }
      throw err;
    }
  }
  return out;
}

export async function appendFreightAuditEvidence(
  runId: string,
  inputs: AppendFreightAuditEvidenceInput[]
): Promise<FreightAuditEvidence[]> {
  await ensureIndexes();
  await assertRunWritable(runId);
  const db = await getDb();

  const out: FreightAuditEvidence[] = [];
  for (const input of inputs) {
    if (input.runId !== runId) throw new Error("runId mismatch for audit evidence");
    if (!isHexSha256(input.contentHashSha256)) throw new Error("contentHashSha256 must be SHA-256 hex");

    const record: FreightAuditEvidence = {
      ...input,
      idempotencyKey: evidenceIdempotencyKey(input),
      createdAt: new Date().toISOString(),
    };

    try {
      const inserted = await db.collection<FreightAuditEvidence>(EVIDENCE_COLLECTION).insertOne(record as any);
      out.push({ ...record, _id: inserted.insertedId.toString() });
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await db
          .collection<FreightAuditEvidence>(EVIDENCE_COLLECTION)
          .findOne({ idempotencyKey: record.idempotencyKey });
        if (existing) {
          const { _id, ...rest } = existing as any;
          out.push({ ...rest, _id: _id?.toString() } as FreightAuditEvidence);
          continue;
        }
      }
      throw err;
    }
  }
  return out;
}

export async function getFreightAuditRun(runId: string) {
  await ensureIndexes();
  return getRunRecord(runId);
}

export async function listFreightAuditRuns(filters: {
  status?: FreightAuditRunStatus;
  triggerEvent?: FreightAuditTriggerEvent;
  orderId?: string;
  shipmentId?: string;
  limit?: number;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.triggerEvent) query.triggerEvent = filters.triggerEvent;
  if (filters.orderId) query.orderId = filters.orderId;
  if (filters.shipmentId) query.shipmentId = filters.shipmentId;

  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
  const docs = (await db.collection<FreightAuditRun>(RUN_COLLECTION).find(query).sort({ startedAt: -1 }).limit(limit).toArray()) as any[];
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() } as FreightAuditRun));
}

export async function listFreightAuditResults(runId: string) {
  await ensureIndexes();
  const db = await getDb();
  const docs = (await db
    .collection<FreightAuditResult>(RESULT_COLLECTION)
    .find({ runId })
    .sort({ ruleId: 1, evaluatedAtUtc: 1 })
    .toArray()) as any[];
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() } as FreightAuditResult));
}

export async function listFreightAuditEvidence(runId: string, ruleId?: FreightAuditRuleId) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, unknown> = { runId };
  if (ruleId) query.ruleId = ruleId;
  const docs = (await db
    .collection<FreightAuditEvidence>(EVIDENCE_COLLECTION)
    .find(query)
    .sort({ capturedAtUtc: 1 })
    .toArray()) as any[];
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() } as FreightAuditEvidence));
}

