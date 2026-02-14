import crypto from "crypto";
import { assertSha256LowerHex64 } from "./hashValidation";

export function recomputeFreightSettlementHash(canonicalJson: string) {
  const normalized = String(canonicalJson || "");
  if (!normalized) {
    throw new Error("CHAIN_INTEGRITY_CANONICAL_JSON_REQUIRED");
  }

  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex");
}

export function recomputeExportManifestHash(manifestJsonBytes: string | Buffer) {
  const bytes = typeof manifestJsonBytes === "string" ? Buffer.from(manifestJsonBytes, "utf8") : manifestJsonBytes;
  if (!bytes || bytes.length === 0) {
    throw new Error("CHAIN_INTEGRITY_MANIFEST_BYTES_REQUIRED");
  }

  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function computeChainRoot(params: {
  paymentSnapshotHash: string;
  exportManifestHash: string;
  freightSettlementHash: string;
}) {
  const paymentSnapshotHash = assertSha256LowerHex64(params.paymentSnapshotHash, "paymentSnapshotHash");
  const exportManifestHash = assertSha256LowerHex64(params.exportManifestHash, "exportManifestHash");
  const freightSettlementHash = assertSha256LowerHex64(params.freightSettlementHash, "freightSettlementHash");

  const input = `${paymentSnapshotHash}${exportManifestHash}${freightSettlementHash}`;
  return crypto.createHash("sha256").update(Buffer.from(input, "utf8")).digest("hex");
}
