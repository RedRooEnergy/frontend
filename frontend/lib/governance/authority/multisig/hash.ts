import crypto from "node:crypto";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const asObject = value as Record<string, unknown>;
  const keys = Object.keys(asObject).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(asObject[key])}`).join(",")}}`;
}

export function canonicalPayloadHash(payload: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(payload), "utf8").digest("hex");
}
