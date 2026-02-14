const SHA256_LOWER_HEX_64 = /^[0-9a-f]{64}$/;

export function isSha256LowerHex64(value: string | null | undefined) {
  return SHA256_LOWER_HEX_64.test(String(value || "").trim());
}

export function assertSha256LowerHex64(value: string | null | undefined, field: string) {
  const normalized = String(value || "").trim();
  if (!SHA256_LOWER_HEX_64.test(normalized)) {
    throw new Error(`${field} must be 64-char lowercase SHA-256 hex`);
  }
  return normalized;
}
