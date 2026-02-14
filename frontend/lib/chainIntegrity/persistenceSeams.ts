import { type FreightSettlementStatus, upsertFreightSettlementRecord } from "./freightSettlementStore";
import { upsertExportManifestRecord } from "./exportManifestStore";

type ExportManifestLinkageInput = {
  orderId?: string | null;
  paymentSnapshotHash?: string | null;
  exportManifestHash?: string | null;
  manifestPath?: string | null;
  generatedAt?: string | null;
  keyId?: string | null;
  signaturePresent?: boolean;
};

type FreightSettlementLinkageInput = {
  orderId?: string | null;
  settlementVersion?: string;
  paymentSnapshotHash?: string | null;
  exportManifestHash?: string | null;
  freightSettlementHash?: string | null;
  settlementPayloadCanonicalJson?: string | null;
  status?: FreightSettlementStatus;
  evidenceRefs?: Array<{ type: string; id: string; hash?: string; path?: string }>;
};

function hasAnyLinkageHash(input: {
  paymentSnapshotHash?: string | null;
  exportManifestHash?: string | null;
  freightSettlementHash?: string | null;
}) {
  return Boolean(
    String(input.paymentSnapshotHash || "").trim() ||
      String(input.exportManifestHash || "").trim() ||
      String(input.freightSettlementHash || "").trim()
  );
}

export async function persistExportManifestLinkageIfProvided(input: ExportManifestLinkageInput) {
  const orderId = String(input.orderId || "").trim();
  if (!orderId) return null;
  if (!hasAnyLinkageHash(input)) return null;

  return upsertExportManifestRecord({
    orderId,
    paymentSnapshotHash: input.paymentSnapshotHash,
    exportManifestHash: input.exportManifestHash,
    manifestPath: input.manifestPath,
    generatedAt: input.generatedAt,
    keyId: input.keyId,
    signaturePresent: input.signaturePresent,
  });
}

export async function persistFreightSettlementLinkageIfProvided(input: FreightSettlementLinkageInput) {
  const orderId = String(input.orderId || "").trim();
  if (!orderId) return null;
  if (!hasAnyLinkageHash(input) && !String(input.settlementPayloadCanonicalJson || "").trim()) return null;

  return upsertFreightSettlementRecord({
    orderId,
    settlementVersion: input.settlementVersion,
    paymentSnapshotHash: input.paymentSnapshotHash,
    exportManifestHash: input.exportManifestHash,
    freightSettlementHash: input.freightSettlementHash,
    settlementPayloadCanonicalJson: input.settlementPayloadCanonicalJson,
    status: input.status,
    evidenceRefs: input.evidenceRefs,
  });
}
