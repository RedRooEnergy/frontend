import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";

const COLLECTION = "pricing_snapshots";

export type PricingItemInput = {
  sku: string;
  quantity: number;
  unitPriceAUD: number; // integer cents
};

type PricingItem = {
  sku: string;
  quantity: number;
  unitPriceAUD: number;
  lineTotalAUD: number;
};

type PricingSnapshotDoc = {
  _id?: ObjectId;
  createdAt: string;
  orderId: string;
  currency: string;
  items: PricingItem[];
  subtotalAUD: number;
  totalAUD: number;
  snapshotHash: string;
  metadata?: Record<string, unknown>;
};

export type PricingSnapshotView = {
  snapshotId: string;
  createdAt: string;
  orderId: string;
  currency: string;
  items: PricingItem[];
  subtotalAUD: number;
  totalAUD: number;
  snapshotHash: string;
};

let indexesInitialized = false;

function nowIso() {
  return new Date().toISOString();
}

function badInput(code: string): never {
  const err = new Error(code);
  (err as Error & { status?: number }).status = 400;
  throw err;
}

function normalizeCurrency(value: unknown): string {
  const cur = value ? String(value).trim().toUpperCase() : "AUD";
  return cur.length > 0 ? cur : "AUD";
}

function normalizeItems(items: unknown): PricingItem[] {
  if (!Array.isArray(items) || items.length === 0) badInput("MISSING_ITEMS");

  const norm: PricingItem[] = [];

  for (const row of items) {
    if (!row || typeof row !== "object") badInput("INVALID_ITEM_ROW");
    const r = row as Record<string, unknown>;

    const sku = r.sku ? String(r.sku).trim() : "";
    const quantity = Number(r.quantity);
    const unitPriceAUD = Number(r.unitPriceAUD);

    if (!sku) badInput("MISSING_SKU");
    if (!Number.isInteger(quantity) || quantity <= 0) badInput("INVALID_QUANTITY");
    if (!Number.isInteger(unitPriceAUD) || unitPriceAUD < 0) badInput("INVALID_UNIT_PRICE_AUD");

    const lineTotalAUD = quantity * unitPriceAUD;
    norm.push({ sku, quantity, unitPriceAUD, lineTotalAUD });
  }

  // Deterministic ordering: sort by sku asc, then unitPrice, then quantity.
  norm.sort((a, b) => {
    if (a.sku < b.sku) return -1;
    if (a.sku > b.sku) return 1;
    if (a.unitPriceAUD !== b.unitPriceAUD) return a.unitPriceAUD - b.unitPriceAUD;
    return a.quantity - b.quantity;
  });

  return norm;
}

/**
 * Canonical JSON stringify with stable key ordering for our snapshot payload.
 * We do this manually to avoid non-determinism across runtimes.
 */
function canonicalStringify(payload: {
  createdAt: string;
  currency: string;
  items: PricingItem[];
  subtotalAUD: number;
  totalAUD: number;
  metadata?: Record<string, unknown>;
}) {
  // Important: createdAt is part of payload; for determinism across identical input,
  // we do NOT include createdAt in hash computation. It is stored, but excluded from hash.
  const { createdAt: _ignored, ...hashPayload } = payload;

  // Build a stable object with stable keys.
  const stable = {
    currency: hashPayload.currency,
    items: hashPayload.items.map((i) => ({
      sku: i.sku,
      quantity: i.quantity,
      unitPriceAUD: i.unitPriceAUD,
      lineTotalAUD: i.lineTotalAUD,
    })),
    subtotalAUD: hashPayload.subtotalAUD,
    totalAUD: hashPayload.totalAUD,
    metadata: hashPayload.metadata ?? undefined,
  };

  // Deterministic stringify: keys are already ordered by insertion here.
  return JSON.stringify(stable);
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

async function ensureIndexes() {
  if (indexesInitialized) return;

  const db = await getDb();
  const col = db.collection<PricingSnapshotDoc>(COLLECTION);

  await col.createIndex({ snapshotHash: 1 });
  await col.createIndex({ createdAt: -1 });

  indexesInitialized = true;
}

function toView(doc: PricingSnapshotDoc): PricingSnapshotView {
  if (!doc._id) throw new Error("SNAPSHOT_ROW_MISSING_ID");
  return {
    snapshotId: doc._id.toString(),
    createdAt: doc.createdAt,
    orderId: doc.orderId,
    currency: doc.currency,
    items: doc.items,
    subtotalAUD: doc.subtotalAUD,
    totalAUD: doc.totalAUD,
    snapshotHash: doc.snapshotHash,
  };
}

export async function createCheckoutSession(input: {
  items: unknown;
  currency?: unknown;
  metadata?: unknown;
}) {
  await ensureIndexes();

  const items = normalizeItems(input.items);
  const currency = normalizeCurrency(input.currency);

  if (currency !== "AUD") {
    // Tranche 3 is AUD-only to remain deterministic and avoid FX.
    badInput("UNSUPPORTED_CURRENCY");
  }

  const subtotalAUD = items.reduce((sum, i) => sum + i.lineTotalAUD, 0);
  const totalAUD = subtotalAUD;

  let metadata: Record<string, unknown> | undefined;
  if (input.metadata !== undefined && input.metadata !== null) {
    if (typeof input.metadata !== "object" || Array.isArray(input.metadata)) badInput("INVALID_METADATA");
    metadata = input.metadata as Record<string, unknown>;
  }

  const createdAt = nowIso();
  const orderId = new ObjectId().toString();
  const canonical = canonicalStringify({ createdAt, currency, items, subtotalAUD, totalAUD, metadata });
  const snapshotHash = sha256Hex(canonical);

  const db = await getDb();
  const col = db.collection<PricingSnapshotDoc>(COLLECTION);

  const doc: PricingSnapshotDoc = {
    createdAt,
    orderId,
    currency,
    items,
    subtotalAUD,
    totalAUD,
    snapshotHash,
    metadata,
  };

  const ins = await col.insertOne(doc);
  const row = await col.findOne({ _id: ins.insertedId });
  if (!row) throw new Error("SNAPSHOT_CREATE_READBACK_FAILED");

  return toView(row);
}

export async function getSnapshotById(id: string): Promise<PricingSnapshotView | null> {
  await ensureIndexes();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }

  const db = await getDb();
  const col = db.collection<PricingSnapshotDoc>(COLLECTION);
  const found = await col.findOne({ _id: objectId });
  if (!found) return null;

  return toView(found);
}
