import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";

const COLLECTION = "refund_requests";

export type RefundStatus = "REQUESTED";

export type RefundRequest = {
  _id?: string;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  buyerUserId: string;
  buyerEmail: string;
  reason: string;
  status: RefundStatus;
  queueItemId?: string;
};

function now() {
  return new Date().toISOString();
}

export async function createRefundRequest(
  data: Omit<RefundRequest, "_id" | "createdAt" | "updatedAt" | "status">,
) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const ts = now();

  const doc = {
    ...data,
    status: "REQUESTED",
    createdAt: ts,
    updatedAt: ts,
  };

  const result = await col.insertOne(doc);

  return result.insertedId.toString();
}

export async function attachQueueItem(refundId: string, queueItemId: string) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  await col.updateOne(
    { _id: new ObjectId(refundId) },
    {
      $set: {
        queueItemId,
        updatedAt: now(),
      },
    },
  );
}
