import { ObjectId } from "mongodb";
import { env } from "../config/env";
import { getDb } from "../db/mongo";

const COLLECTION = "payments_checkout";

export type PaymentProvider = "TEST";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED";

type PaymentCheckoutDoc = {
  _id?: ObjectId;
  createdAt: string;
  updatedAt: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  snapshotId: string;
  orderId?: string;
  amountAUD?: number;
  currency: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  autoSucceedAt?: string;
};

export type PaymentCheckoutView = {
  paymentId: string;
  createdAt: string;
  updatedAt: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  snapshotId: string;
  orderId: string | null;
  amountAUD: number | null;
  currency: string;
};

let indexesInitialized = false;

function nowIso() {
  return new Date().toISOString();
}

function toView(row: PaymentCheckoutDoc): PaymentCheckoutView {
  if (!row._id) {
    throw new Error("PAYMENT_ROW_MISSING_ID");
  }

  return {
    paymentId: row._id.toString(),
    status: row.status,
    provider: row.provider,
    snapshotId: row.snapshotId,
    orderId: row.orderId ?? null,
    amountAUD: typeof row.amountAUD === "number" ? row.amountAUD : null,
    currency: row.currency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function ensureIndexes() {
  if (indexesInitialized) return;

  const db = await getDb();
  const col = db.collection<PaymentCheckoutDoc>(COLLECTION);

  await col.createIndex({ snapshotId: 1 });
  await col.createIndex({ status: 1, createdAt: -1 });

  indexesInitialized = true;
}

export async function createCheckout(input: {
  snapshotId: string;
  orderId?: string;
  amountAUD?: number;
  currency?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}) {
  await ensureIndexes();

  const db = await getDb();
  const col = db.collection<PaymentCheckoutDoc>(COLLECTION);
  const ts = nowIso();

  const autoSucceedMs = env.paymentsTestAutoSucceedMs;
  const status: PaymentStatus = autoSucceedMs === 0 ? "SUCCEEDED" : "PENDING";
  const autoSucceedAt =
    autoSucceedMs > 0 ? new Date(Date.now() + autoSucceedMs).toISOString() : undefined;

  const insertDoc = {
    createdAt: ts,
    updatedAt: ts,
    provider: "TEST" as const,
    status,
    snapshotId: input.snapshotId,
    orderId: input.orderId,
    amountAUD: input.amountAUD,
    currency: input.currency || "AUD",
    correlationId: input.correlationId,
    metadata: input.metadata,
    autoSucceedAt,
  };

  const inserted = await col.insertOne(insertDoc);
  const row = await col.findOne({ _id: inserted.insertedId });
  if (!row) throw new Error("PAYMENT_CREATE_READBACK_FAILED");

  return toView(row);
}

async function promoteIfDue(row: PaymentCheckoutDoc) {
  if (row.status !== "PENDING" || !row.autoSucceedAt) {
    return row;
  }

  const now = nowIso();
  if (row.autoSucceedAt > now) {
    return row;
  }

  const db = await getDb();
  const col = db.collection<PaymentCheckoutDoc>(COLLECTION);

  const promoted = await col.findOneAndUpdate(
    {
      _id: row._id,
      status: "PENDING",
      autoSucceedAt: { $lte: now },
    },
    {
      $set: {
        status: "SUCCEEDED",
        updatedAt: now,
      },
      $unset: {
        autoSucceedAt: "",
      },
    },
    {
      returnDocument: "after",
    },
  );

  return promoted ?? row;
}

export async function getCheckoutStatus(id: string): Promise<PaymentCheckoutView | null> {
  await ensureIndexes();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }

  const db = await getDb();
  const col = db.collection<PaymentCheckoutDoc>(COLLECTION);
  const found = await col.findOne({ _id: objectId });
  if (!found) return null;

  const finalRow = await promoteIfDue(found);
  return toView(finalRow);
}
