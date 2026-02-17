import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";

const COLLECTION = "settlement_holds";

export type HoldStatus =
  | "ACTIVE"
  | "RELEASED"
  | "OVERRIDE_PENDING"
  | "OVERRIDDEN";

export type SettlementHold = {
  _id?: string;
  createdAt: string;
  updatedAt: string;
  entityType: string;
  entityId: string;
  reason: string;
  createdBy: string;
  status: HoldStatus;
  overrideApprovals?: string[];
};

function now() {
  return new Date().toISOString();
}

export async function createSettlementHold(data: {
  entityType: string;
  entityId: string;
  reason: string;
  createdBy: string;
}) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const ts = now();

  const doc = {
    ...data,
    createdAt: ts,
    updatedAt: ts,
    status: "ACTIVE",
    overrideApprovals: [],
  };

  const result = await col.insertOne(doc);

  return result.insertedId.toString();
}

export async function listSettlementHolds() {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const rows = await col.find().sort({ createdAt: -1 }).toArray();

  return rows.map((r) => ({
    ...r,
    _id: r._id.toString(),
  }));
}

export async function getSettlementHoldById(id: string) {
  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return null;
  }

  const db = await getDb();
  const col = db.collection(COLLECTION);
  const found = await col.findOne({ _id });
  if (!found) return null;

  return {
    holdId: found._id.toString(),
    entityType: found.entityType,
    entityId: found.entityId,
    reason: found.reason,
    status: found.status,
    createdBy: found.createdBy,
    createdAt: found.createdAt,
    updatedAt: found.updatedAt,
  };
}

export async function requestOverride(id: string, approverId: string) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const _id = new ObjectId(id);

  const hold = await col.findOne({ _id });
  if (!hold) throw new Error("HOLD_NOT_FOUND");

  if (hold.status !== "ACTIVE" && hold.status !== "OVERRIDE_PENDING") {
    throw new Error("INVALID_HOLD_STATE");
  }

  const approvals = hold.overrideApprovals || [];

  if (approvals.includes(approverId)) {
    const error = new Error("DUPLICATE_APPROVAL");
    (error as any).status = 409;
    throw error;
  }
  approvals.push(approverId);

  const newStatus =
    approvals.length >= 2 ? "OVERRIDDEN" : "OVERRIDE_PENDING";

  await col.updateOne(
    { _id },
    {
      $set: {
        overrideApprovals: approvals,
        status: newStatus,
        updatedAt: now(),
      },
    },
  );

  return {
    id,
    status: newStatus,
    approvals,
  };
}

export async function hasBlockingSettlementHold(entityType: string, entityId: string) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const hold = await col.findOne({
    entityType,
    entityId,
    status: { $in: ["ACTIVE", "OVERRIDE_PENDING"] },
  });

  return !!hold;
}
