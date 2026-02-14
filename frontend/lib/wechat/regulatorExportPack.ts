import AdmZip from "adm-zip";
import { sha256Hex, stableStringify } from "./hash";
import {
  listWeChatDispatchSliceForRegulator,
  listWeChatInboundSliceForRegulator,
  listWeChatLedgerSliceForRegulator,
} from "./store";

type ExportScope = {
  bindingId: string | null;
  limit: number;
  page: number;
};

type RegulatorSlice = {
  reportVersion: "ext-wechat-03-regulator-slice.v1";
  generatedAt: string;
  scope: ExportScope;
  bindings: Array<{
    bindingIdMasked: string;
    status: string;
    createdAt: string;
    entityType: string;
    entityHash: string;
  }>;
  dispatches: Array<{
    dispatchIdMasked: string;
    bindingIdMasked: string;
    bodyHash: string;
    bodyLength: number;
    status: string;
    createdAt: string;
  }>;
  inbound: Array<{
    inboundIdMasked: string;
    bindingIdMasked: string;
    bodyHash: string;
    bodyLength: number;
    receivedAt: string;
    processed: boolean;
  }>;
};

type ManifestFile = {
  name: string;
  bytes: number;
  sha256: string;
};

type Manifest = {
  packType: "RRE-WECHAT-REGULATOR-EXPORT";
  version: "v1.0";
  generatedAt: string;
  scope: ExportScope;
  files: ManifestFile[];
  canonicalHashSha256: string;
};

export type WeChatRegulatorExportPack = {
  zipBuffer: Buffer;
  slice: RegulatorSlice;
  manifest: Manifest;
  manifestSha256: string;
  sliceJson: string;
  manifestJson: string;
  manifestSha256Text: string;
  readmeText: string;
};

function compareDescThenAsc(leftDate: string, rightDate: string, leftId: string, rightId: string) {
  const dateCmp = rightDate.localeCompare(leftDate);
  if (dateCmp !== 0) return dateCmp;
  return leftId.localeCompare(rightId);
}

function sortBindings(rows: RegulatorSlice["bindings"]) {
  return [...rows].sort((left, right) => compareDescThenAsc(left.createdAt, right.createdAt, left.bindingIdMasked, right.bindingIdMasked));
}

function sortDispatches(rows: RegulatorSlice["dispatches"]) {
  return [...rows].sort((left, right) => compareDescThenAsc(left.createdAt, right.createdAt, left.dispatchIdMasked, right.dispatchIdMasked));
}

function sortInbound(rows: RegulatorSlice["inbound"]) {
  return [...rows].sort((left, right) => compareDescThenAsc(left.receivedAt, right.receivedAt, left.inboundIdMasked, right.inboundIdMasked));
}

function isoCompact(value: string) {
  return value.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildReadmeText(input: { generatedAt: string; scope: ExportScope; manifestSha256: string }) {
  const lines = [
    "RRE WeChat Regulator Export Pack",
    `Generated At: ${input.generatedAt}`,
    `Scope: bindingId=${input.scope.bindingId || "null"}, limit=${input.scope.limit}, page=${input.scope.page}`,
    "",
    "Contents:",
    "- slice.json: masked, hash-first regulator evidence slice",
    "- manifest.json: deterministic file manifest + canonical hash",
    "- manifest.sha256.txt: SHA-256 of manifest.json",
    "",
    "Verification:",
    "1) Compute SHA-256 for manifest.json and compare to manifest.sha256.txt",
    "2) Validate each listed file hash in manifest.json",
    `3) Expected manifest sha256: ${input.manifestSha256}`,
  ];
  return `${lines.join("\n")}\n`;
}

function buildCanonicalHashPayload(slice: RegulatorSlice) {
  return {
    reportVersion: slice.reportVersion,
    scope: slice.scope,
    bindings: slice.bindings,
    dispatches: slice.dispatches,
    inbound: slice.inbound,
  };
}

function toJsonBytes(value: unknown) {
  return Buffer.from(`${stableStringify(value)}\n`, "utf8");
}

function toTextBytes(value: string) {
  return Buffer.from(value, "utf8");
}

export async function buildWeChatRegulatorExportPack(input: {
  bindingId?: string;
  limit?: number;
  page?: number;
} = {}): Promise<WeChatRegulatorExportPack> {
  const scope: ExportScope = {
    bindingId: String(input.bindingId || "").trim() || null,
    limit: Math.min(Math.max(Number(input.limit || 50), 1), 200),
    page: Math.min(Math.max(Number(input.page || 1), 1), 10_000),
  };

  const generatedAt = new Date().toISOString();

  const [bindingSlice, dispatchSlice, inboundSlice] = await Promise.all([
    listWeChatLedgerSliceForRegulator({ bindingId: scope.bindingId || undefined, limit: scope.limit, page: scope.page }),
    listWeChatDispatchSliceForRegulator({ bindingId: scope.bindingId || undefined, limit: scope.limit, page: scope.page }),
    listWeChatInboundSliceForRegulator({ bindingId: scope.bindingId || undefined, limit: scope.limit, page: scope.page }),
  ]);

  const slice: RegulatorSlice = {
    reportVersion: "ext-wechat-03-regulator-slice.v1",
    generatedAt,
    scope,
    bindings: sortBindings(bindingSlice.items),
    dispatches: sortDispatches(dispatchSlice.items),
    inbound: sortInbound(inboundSlice.items),
  };

  const canonicalHashSha256 = sha256Hex(stableStringify(buildCanonicalHashPayload(slice)));

  const sliceBytes = toJsonBytes(slice);
  const sliceSha256 = sha256Hex(sliceBytes);

  const manifestCore: Manifest = {
    packType: "RRE-WECHAT-REGULATOR-EXPORT",
    version: "v1.0",
    generatedAt,
    scope,
    files: [
      {
        name: "slice.json",
        bytes: sliceBytes.length,
        sha256: sliceSha256,
      },
    ],
    canonicalHashSha256,
  };

  const provisionalManifestBytes = toJsonBytes(manifestCore);
  const provisionalManifestSha256 = sha256Hex(provisionalManifestBytes);
  const manifestSha256Text = `${provisionalManifestSha256}  manifest.json\n`;
  const manifestSha256Bytes = toTextBytes(manifestSha256Text);

  const readmeText = buildReadmeText({ generatedAt, scope, manifestSha256: provisionalManifestSha256 });
  const readmeBytes = toTextBytes(readmeText);

  const manifest: Manifest = {
    ...manifestCore,
    files: [
      {
        name: "slice.json",
        bytes: sliceBytes.length,
        sha256: sliceSha256,
      },
      {
        name: "README.txt",
        bytes: readmeBytes.length,
        sha256: sha256Hex(readmeBytes),
      },
      {
        name: "manifest.sha256.txt",
        bytes: manifestSha256Bytes.length,
        sha256: sha256Hex(manifestSha256Bytes),
      },
      {
        name: "manifest.json",
        bytes: provisionalManifestBytes.length,
        sha256: provisionalManifestSha256,
      },
    ],
  };

  const manifestBytes = toJsonBytes(manifest);
  const manifestSha256 = sha256Hex(manifestBytes);

  const finalManifestSha256Text = `${manifestSha256}  manifest.json\n`;
  const finalManifestSha256Bytes = toTextBytes(finalManifestSha256Text);

  const zip = new AdmZip();
  zip.addFile("slice.json", sliceBytes);
  zip.addFile("manifest.json", manifestBytes);
  zip.addFile("manifest.sha256.txt", finalManifestSha256Bytes);
  zip.addFile("README.txt", readmeBytes);

  const zipBuffer = zip.toBuffer();

  return {
    zipBuffer,
    slice,
    manifest,
    manifestSha256,
    sliceJson: sliceBytes.toString("utf8"),
    manifestJson: manifestBytes.toString("utf8"),
    manifestSha256Text: finalManifestSha256Text,
    readmeText,
  };
}

export function buildWeChatRegulatorExportFilename(generatedAt: string) {
  return `wechat-regulator-export-pack-${isoCompact(generatedAt)}.zip`;
}
