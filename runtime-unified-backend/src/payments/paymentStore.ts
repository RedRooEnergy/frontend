import { ObjectId } from "mongodb";
import { env } from "../config/env";
import { getDb } from "../db/mongo";

const COLLECTION = "payment_requests";

export type PaymentStatus = "PENDING" | "SUCCEEDED";
export type PaymentProvider = "TEST";

export type PaymentRequest = {
  _id?: string;
  createdAt: string;
  updatedAt: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  snapshotId: string;
  orderId?: string;
  correlationId?: string;
  autoSucceedAt?: string;
};

let indexesInitialized = false;

function nowIso() {
  return new Date().toISOString();
}

function isPastIso(value: string) {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return false;
  return ts <= Date.now();
}

async function ensureIndexes() {
  if (indexesInitialized) return;

  const db = await getDb();
  const col = db.collection(COLLECTION);

  await col.createIndex({ snapshotId: 1 });
  await col.createIndex({ status: 1, createdAt: -1 });
  await col.createIndex({ createdAt: -1 });

  indexesInitialized = true;
}

export async function createPaymentCheckout(input: {
  snapshotId: string;
  orderId?: string;
  correlationId?: string;
}) {
  await ensureIndexes();

  const db = await getDb();
  const col = db.collection(COLLECTION);

  const createdAt = nowIso();
  const autoSucceedAt =
    env.paymentsTestAutoSucceedMs > 0
      ? new Date(Date.now() + env.paymentsTestAutoSucceedMs).toISOString()
      : undefined;

  const doc = {
    snapshotId: input.snapshotId,
    orderId: input.orderId,
    correlationId: input.correlationId,
    provider: "TEST",
    status: autoSucceedAt ? "PENDING" : "SUCCEEDED",
    autoSucceedAt,
    createdAt,
    updatedAt: createdAt,
  };

  const result = await col.insertOne(doc);

  return {
    paymentId: result.insertedId.toString(),
    status: doc.status,
    provider: doc.provider,
  };
}

async function updateToSucceededIfDue(row: PaymentRequest & { _id: ObjectId }) {
  if (row.status !== "PENDING" || !row.autoSucceedAt) {
    return row;
  }

  if (!isPastIso(row.autoSucceedAt)) {
    return row;
  }

  const db = await getDb();
  const col = db.collection(COLLECTION);
  const updatedAt = nowIso();

  await col.updateOne(
    { _id: row._id, status: "PENDING" },
    {
      $set: {
        status: "SUCCEEDED",
        updatedAt,
      },
      $unset: {
        autoSucceedAt: "",
      },
    },
  );

  return {
    ...row,
    status: "SUCCEEDED" as const,
    updatedAt,
    autoSucceedAt: undefined,
  };
}

export async function getPaymentStatusById(
  id: string,
): Promise<(PaymentRequest & { _id: string }) | null> {
  await ensureIndexes();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }

  const db = await getDb();
  const col = db.collection(COLLECTION);
  const found = (await col.findOne({ _id: objectId })) as
    | (PaymentRequest & { _id: ObjectId })
    | null;

  if (!found) {
    return null;
  }

  const resolved = await updateToSucceededIfDue(found);

  return {
    ...resolved,
    _id: resolved._id.toString(),
  };
}
