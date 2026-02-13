import crypto from "crypto";

export type HashPrimitive = string | number | boolean | null | undefined;

function normalizePart(part: HashPrimitive) {
  if (part === null || part === undefined) return "";
  return String(part).trim();
}

export function lengthPrefixedEncode(parts: ReadonlyArray<HashPrimitive>) {
  return parts
    .map(normalizePart)
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

export function canonicalJson(value: unknown) {
  return JSON.stringify(sortKeys(value));
}

export function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function canonicalPayloadHash(value: unknown) {
  return sha256Hex(canonicalJson(value));
}

export function buildDeterministicArtifactId(input: {
  artifactClass: string;
  tenantId?: string | null;
  primaryKeyFields: ReadonlyArray<HashPrimitive>;
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
  primaryKeyFields: ReadonlyArray<HashPrimitive>;
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

export function assertHexSha256(value: string, field: string) {
  if (!/^[a-f0-9]{64}$/i.test(String(value || ""))) {
    throw new Error(`${field} must be SHA-256 hex`);
  }
}
