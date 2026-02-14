export function normalizeNullableString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

export function assertWriteOnceTransition(input: {
  existing: unknown;
  next: unknown;
  field: string;
}) {
  const existing = normalizeNullableString(input.existing);
  const next = normalizeNullableString(input.next);

  if (!existing) return;
  if (next === existing) return;

  if (!next) {
    throw new Error(`WRITE_ONCE_VIOLATION:${input.field}:cannot_clear`);
  }

  throw new Error(`WRITE_ONCE_VIOLATION:${input.field}:cannot_change`);
}

export function assertFinalOnlyCanonicalPayload(input: {
  existingPayload: unknown;
  nextPayload: unknown;
  existingStatus: string | null | undefined;
  nextStatus: string | null | undefined;
}) {
  const existingPayload = normalizeNullableString(input.existingPayload);
  const nextPayload = normalizeNullableString(input.nextPayload);

  if (!nextPayload) {
    return;
  }

  const existingStatus = String(input.existingStatus || "").trim().toUpperCase();
  const nextStatus = String(input.nextStatus || "").trim().toUpperCase();

  if (existingPayload) {
    if (nextPayload !== existingPayload) {
      throw new Error("WRITE_ONCE_VIOLATION:settlementPayloadCanonicalJson:cannot_change");
    }
    return;
  }

  if (nextStatus !== "FINAL") {
    throw new Error("FREIGHT_SETTLEMENT_CANONICAL_JSON_REQUIRES_FINAL");
  }

  // Existing may be empty while transitioning DRAFT -> FINAL.
  if (existingStatus && existingStatus !== "DRAFT" && existingStatus !== "FINAL") {
    throw new Error("FREIGHT_SETTLEMENT_CANONICAL_JSON_INVALID_STATUS_TRANSITION");
  }
}
