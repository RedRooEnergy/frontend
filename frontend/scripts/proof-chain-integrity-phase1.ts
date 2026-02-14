import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function main() {
  const exportStore = read("lib/chainIntegrity/exportManifestStore.ts");
  const freightStore = read("lib/chainIntegrity/freightSettlementStore.ts");
  const guards = read("lib/chainIntegrity/writeOnceGuards.ts");

  const requiredExportFields = ["paymentSnapshotHash", "exportManifestHash", "orderId"];
  const requiredFreightFields = [
    "paymentSnapshotHash",
    "exportManifestHash",
    "freightSettlementHash",
    "settlementPayloadCanonicalJson",
    "status",
  ];

  for (const field of requiredExportFields) {
    assert(exportStore.includes(field), `Missing export field declaration: ${field}`);
  }

  for (const field of requiredFreightFields) {
    assert(freightStore.includes(field), `Missing freight field declaration: ${field}`);
  }

  assert(
    exportStore.includes("EXPORT_MANIFEST_WRITE_ONCE_FIELDS"),
    "Missing export write-once protected field list"
  );
  assert(
    freightStore.includes("FREIGHT_SETTLEMENT_WRITE_ONCE_FIELDS"),
    "Missing freight write-once protected field list"
  );
  assert(guards.includes("assertWriteOnceTransition"), "Missing shared write-once guard helper");
  assert(guards.includes("assertFinalOnlyCanonicalPayload"), "Missing FINAL-only canonical payload guard");

  console.log("PASS: EXT-CHAIN-INTEGRITY-01 Phase 1 proof scan");
}

main();
