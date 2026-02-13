import crypto from "crypto";

export type CanonicalPricingSnapshotItemInput = {
  productSlug?: string | null;
  supplierId?: string | null;
  qty?: number | null;
  unitAmountMinor: number;
};

export type CanonicalPricingSnapshotInput = {
  orderId: string;
  currency?: string | null;
  totalAmountMinor: number;
  items: CanonicalPricingSnapshotItemInput[];
};

export type CanonicalPricingSnapshotItem = {
  productSlug: string;
  supplierId: string;
  qty: number;
  unitAmountMinor: number;
};

export type CanonicalPricingSnapshot = {
  orderId: string;
  currency: string;
  totalAmountMinor: number;
  items: CanonicalPricingSnapshotItem[];
};

function sortKeys(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((entry) => sortKeys(entry));
  }

  if (input && typeof input === "object") {
    return Object.keys(input as Record<string, unknown>)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys((input as Record<string, unknown>)[key]);
        return acc;
      }, {} as Record<string, unknown>);
  }

  return input;
}

export function stableStringify(input: unknown) {
  return JSON.stringify(sortKeys(input));
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function normalizeCurrency(currency: string | null | undefined) {
  return String(currency || "AUD").trim().toUpperCase();
}

function assertMinorUnitsInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be integer minor units`);
  }
}

function normalizeItem(item: CanonicalPricingSnapshotItemInput): CanonicalPricingSnapshotItem {
  const unitAmountMinor = Number(item?.unitAmountMinor || 0);
  assertMinorUnitsInteger(unitAmountMinor, "item.unitAmountMinor");

  return {
    productSlug: String(item?.productSlug || "").trim(),
    supplierId: String(item?.supplierId || "").trim(),
    qty: Number(item?.qty || 0),
    unitAmountMinor,
  };
}

export function buildCanonicalPricingSnapshot(input: CanonicalPricingSnapshotInput): CanonicalPricingSnapshot {
  const totalAmountMinor = Number(input?.totalAmountMinor || 0);
  assertMinorUnitsInteger(totalAmountMinor, "totalAmountMinor");

  const items = Array.isArray(input?.items)
    ? input.items
        .map(normalizeItem)
        .sort((a, b) => {
          const left = `${a.productSlug}|${a.supplierId}|${a.unitAmountMinor}|${a.qty}`;
          const right = `${b.productSlug}|${b.supplierId}|${b.unitAmountMinor}|${b.qty}`;
          return left.localeCompare(right);
        })
    : [];

  return {
    orderId: String(input?.orderId || "").trim(),
    currency: normalizeCurrency(input?.currency),
    totalAmountMinor,
    items,
  };
}

export function computeCanonicalPricingSnapshotHash(input: CanonicalPricingSnapshotInput) {
  return sha256Hex(stableStringify(buildCanonicalPricingSnapshot(input)));
}
