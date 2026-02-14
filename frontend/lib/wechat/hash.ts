import crypto from "crypto";

type Primitive = string | number | boolean | null | undefined;

function normalizePrimitive(value: Primitive) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function lengthPrefixedEncode(parts: ReadonlyArray<Primitive>) {
  return parts
    .map(normalizePrimitive)
    .map((part) => `${part.length}:${part}`)
    .join("|");
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce((acc: Record<string, unknown>, key) => {
      acc[key] = sortKeys((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

export function stableStringify(value: unknown) {
  return JSON.stringify(sortKeys(value));
}

export function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function canonicalPayloadHash(value: unknown) {
  return sha256Hex(stableStringify(value));
}

export function buildDeterministicId(input: {
  artifactClass: string;
  tenantId?: string | null;
  primaryKeyFields: ReadonlyArray<Primitive>;
  canonicalPayloadHash: string;
}) {
  return sha256Hex(
    lengthPrefixedEncode([
      input.artifactClass,
      input.tenantId || "",
      ...input.primaryKeyFields,
      input.canonicalPayloadHash,
    ])
  );
}

export function buildDeterministicIdempotencyKey(input: {
  artifactClass: string;
  tenantId?: string | null;
  primaryKeyFields: ReadonlyArray<Primitive>;
  canonicalPayloadHash: string;
}) {
  return sha256Hex(
    lengthPrefixedEncode([
      "idempotency",
      input.artifactClass,
      input.tenantId || "",
      ...input.primaryKeyFields,
      input.canonicalPayloadHash,
    ])
  );
}

export function assertSha256Hex(value: string, field: string) {
  if (!/^[a-f0-9]{64}$/i.test(String(value || ""))) {
    throw new Error(`${field} must be SHA-256 hex`);
  }
}
