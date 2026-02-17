import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";

const COLLECTION = "email_queue";

type EmailQueueDoc = {
  _id?: ObjectId;
  createdAt: string;
  updatedAt: string;
  status: "QUEUED";
  mode: string;
  templateKey: string;
  entityType: string;
  entityId: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
};

export type EmailQueueView = {
  emailId: string;
  createdAt: string;
  updatedAt: string;
  status: "QUEUED";
  mode: string;
  templateKey: string;
  entityType: string;
  entityId: string;
  correlationId: string | null;
};

let indexesInitialized = false;

function nowIso() {
  return new Date().toISOString();
}

async function ensureIndexes() {
  if (indexesInitialized) return;

  const db = await getDb();
  const col = db.collection<EmailQueueDoc>(COLLECTION);
  await col.createIndex({ entityId: 1, createdAt: -1 });
  await col.createIndex({ status: 1, createdAt: -1 });

  indexesInitialized = true;
}

function toView(row: EmailQueueDoc): EmailQueueView {
  if (!row._id) throw new Error("EMAIL_QUEUE_ROW_MISSING_ID");

  return {
    emailId: row._id.toString(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    status: row.status,
    mode: row.mode,
    templateKey: row.templateKey,
    entityType: row.entityType,
    entityId: row.entityId,
    correlationId: row.correlationId ?? null,
  };
}

export async function createQueuedEmail(input: {
  mode: string;
  templateKey: string;
  entityType: string;
  entityId: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
}) {
  await ensureIndexes();

  const db = await getDb();
  const col = db.collection<EmailQueueDoc>(COLLECTION);
  const ts = nowIso();

  const doc: EmailQueueDoc = {
    createdAt: ts,
    updatedAt: ts,
    status: "QUEUED",
    mode: input.mode,
    templateKey: input.templateKey,
    entityType: input.entityType,
    entityId: input.entityId,
    correlationId: input.correlationId,
    payload: input.payload,
  };

  const ins = await col.insertOne(doc);
  const row = await col.findOne({ _id: ins.insertedId });
  if (!row) throw new Error("EMAIL_QUEUE_CREATE_READBACK_FAILED");

  return toView(row);
}

export async function listQueuedEmails(input: { entityId?: string }) {
  await ensureIndexes();

  const db = await getDb();
  const col = db.collection<EmailQueueDoc>(COLLECTION);
  const filter: Record<string, string> = {};

  if (input.entityId && input.entityId.trim().length > 0) {
    filter.entityId = input.entityId.trim();
  }

  const rows = await col.find(filter).sort({ createdAt: -1 }).limit(100).toArray();
  return rows.map(toView);
}
