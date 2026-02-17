import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";

const COLLECTION = "shipping_shipments";

export type ShippingStatus = "QUOTED" | "SELECTED";
export type QuoteId = "std" | "exp";

export type ShippingDestination = {
  country: string;
  state?: string;
  postcode?: string;
};

export type ShippingItem = {
  sku: string;
  quantity: number;
  weightKg?: number;
};

export type ShippingQuote = {
  quoteId: QuoteId;
  carrier: "TEST_CARRIER";
  serviceLevel: "STANDARD" | "EXPRESS";
  costAUD: number; // integer cents
  estimatedDays: number;
};

type ShippingShipmentDoc = {
  _id?: ObjectId;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  snapshotId?: string;
  status: ShippingStatus;
  destination: ShippingDestination;
  quotes: ShippingQuote[];
  selectedQuoteId?: QuoteId;
};

export type ShippingShipmentView = {
  shipmentId: string;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  snapshotId: string | null;
  status: ShippingStatus;
  destination: ShippingDestination;
  quotes: ShippingQuote[];
  selectedQuoteId: QuoteId | null;
};

let indexesInitialized = false;

function nowIso() {
  return new Date().toISOString();
}

function toView(row: ShippingShipmentDoc): ShippingShipmentView {
  if (!row._id) throw new Error("SHIPMENT_ROW_MISSING_ID");
  return {
    shipmentId: row._id.toString(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    orderId: row.orderId,
    snapshotId: row.snapshotId ?? null,
    status: row.status,
    destination: row.destination,
    quotes: row.quotes,
    selectedQuoteId: row.selectedQuoteId ?? null,
  };
}

async function ensureIndexes() {
  if (indexesInitialized) return;

  const db = await getDb();
  const col = db.collection<ShippingShipmentDoc>(COLLECTION);

  await col.createIndex({ orderId: 1 });
  await col.createIndex({ status: 1, createdAt: -1 });

  indexesInitialized = true;
}

/**
 * Deterministic weight calculation:
 * - totalKg = sum(quantity * (weightKg || 1.0))
 * - weightTenths = ceil(totalKg * 10)
 */
function computeWeightTenths(items: ShippingItem[] | undefined): number {
  if (!items || items.length === 0) return 10; // default 1.0kg

  let totalTenths = 0;
  for (const item of items) {
    const qty = Number(item.quantity);
    const w = item.weightKg === undefined ? 1.0 : Number(item.weightKg);

    // Defensive: treat invalid as defaults deterministically (validated upstream anyway)
    const safeQty = Number.isInteger(qty) && qty > 0 ? qty : 1;
    const safeW = Number.isFinite(w) && w >= 0 ? w : 1.0;

    // Convert to tenths, then multiply by qty, then ceil at aggregate.
    totalTenths += Math.round(safeW * 10) * safeQty;
  }

  // Ensure minimum 0.1kg so costs cannot degenerate to base only with zero weight items.
  if (totalTenths <= 0) return 1;
  return totalTenths;
}

/**
 * Deterministic cost model (integer cents):
 * baseStd=1500, baseExp=2500
 * perKgStd=300, perKgExp=450
 * weightTenths used to avoid float drift:
 * stdCost = baseStd + ceil(perKgStd * weightTenths / 10)
 * expCost = baseExp + ceil(perKgExp * weightTenths / 10)
 */
function computeQuotes(weightTenths: number): ShippingQuote[] {
  const baseStd = 1500;
  const baseExp = 2500;
  const perKgStd = 300;
  const perKgExp = 450;

  const stdVar = Math.ceil((perKgStd * weightTenths) / 10);
  const expVar = Math.ceil((perKgExp * weightTenths) / 10);

  const stdCost = Math.max(1500, baseStd + stdVar);
  const expCost = Math.max(2500, baseExp + expVar);

  // Deterministic ordering: STANDARD then EXPRESS
  return [
    {
      quoteId: "std",
      carrier: "TEST_CARRIER",
      serviceLevel: "STANDARD",
      costAUD: stdCost,
      estimatedDays: 7,
    },
    {
      quoteId: "exp",
      carrier: "TEST_CARRIER",
      serviceLevel: "EXPRESS",
      costAUD: expCost,
      estimatedDays: 3,
    },
  ];
}

function normalizeDestination(dest: Partial<ShippingDestination> | undefined): ShippingDestination {
  const country = (dest?.country ? String(dest.country) : "AU").trim().toUpperCase() || "AU";
  const state = dest?.state ? String(dest.state).trim().toUpperCase() : undefined;
  const postcode = dest?.postcode ? String(dest.postcode).trim() : undefined;

  const out: ShippingDestination = { country };
  if (state && state.length > 0) out.state = state;
  if (postcode && postcode.length > 0) out.postcode = postcode;
  return out;
}

export async function createShipmentQuote(input: {
  orderId: string;
  snapshotId?: string;
  destination?: Partial<ShippingDestination>;
  items?: ShippingItem[];
}) {
  await ensureIndexes();

  const db = await getDb();
  const col = db.collection<ShippingShipmentDoc>(COLLECTION);
  const ts = nowIso();

  const weightTenths = computeWeightTenths(input.items);
  const quotes = computeQuotes(weightTenths);

  const doc: ShippingShipmentDoc = {
    createdAt: ts,
    updatedAt: ts,
    orderId: input.orderId,
    snapshotId: input.snapshotId,
    status: "QUOTED",
    destination: normalizeDestination(input.destination),
    quotes,
  };

  const result = await col.insertOne(doc);
  const row = await col.findOne({ _id: result.insertedId });
  if (!row) throw new Error("SHIPMENT_CREATE_READBACK_FAILED");

  return toView(row);
}

export async function selectShipmentQuote(input: { shipmentId: string; quoteId: QuoteId }) {
  await ensureIndexes();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(input.shipmentId);
  } catch {
    return { kind: "NOT_FOUND" as const };
  }

  const db = await getDb();
  const col = db.collection<ShippingShipmentDoc>(COLLECTION);

  const found = await col.findOne({ _id: objectId });
  if (!found) return { kind: "NOT_FOUND" as const };

  // Validate quoteId exists
  const valid = found.quotes.some((q) => q.quoteId === input.quoteId);
  if (!valid) return { kind: "INVALID_QUOTE" as const };

  if (found.status === "SELECTED") {
    if (found.selectedQuoteId === input.quoteId) {
      return { kind: "OK" as const, shipment: toView(found) };
    }
    return { kind: "ALREADY_SELECTED" as const };
  }

  const ts = nowIso();
  const updated = await col.findOneAndUpdate(
    { _id: objectId, status: "QUOTED" },
    { $set: { status: "SELECTED", selectedQuoteId: input.quoteId, updatedAt: ts } },
    { returnDocument: "after" },
  );

  if (!updated) {
    // Race fallback: read and return
    const reread = await col.findOne({ _id: objectId });
    if (!reread) return { kind: "NOT_FOUND" as const };
    return { kind: "OK" as const, shipment: toView(reread) };
  }

  return { kind: "OK" as const, shipment: toView(updated) };
}

export async function getShipmentById(id: string): Promise<ShippingShipmentView | null> {
  await ensureIndexes();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }

  const db = await getDb();
  const col = db.collection<ShippingShipmentDoc>(COLLECTION);
  const found = await col.findOne({ _id: objectId });
  if (!found) return null;

  return toView(found);
}
