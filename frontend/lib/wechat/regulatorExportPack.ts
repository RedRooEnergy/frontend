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

function buildReadmeText(input: { generatedAt: string; scope: ExportScope }) {
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
    "3) Use manifest.sha256.txt as the authoritative checksum for manifest.json",
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

type ZipEntryInput = {
  name: string;
  data: Buffer;
};

function buildCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
}

const CRC32_TABLE = buildCrc32Table();

function crc32(input: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i += 1) {
    const byte = input[i];
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16LE(buffer: Buffer, offset: number, value: number) {
  buffer.writeUInt16LE(value & 0xffff, offset);
}

function writeUInt32LE(buffer: Buffer, offset: number, value: number) {
  buffer.writeUInt32LE(value >>> 0, offset);
}

function buildStoredZip(entries: ZipEntryInput[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    writeUInt32LE(localHeader, 0, 0x04034b50);
    writeUInt16LE(localHeader, 4, 20);
    writeUInt16LE(localHeader, 6, 0);
    writeUInt16LE(localHeader, 8, 0); // store
    writeUInt16LE(localHeader, 10, 0);
    writeUInt16LE(localHeader, 12, 0);
    writeUInt32LE(localHeader, 14, crc);
    writeUInt32LE(localHeader, 18, data.length);
    writeUInt32LE(localHeader, 22, data.length);
    writeUInt16LE(localHeader, 26, nameBytes.length);
    writeUInt16LE(localHeader, 28, 0);

    localParts.push(localHeader, nameBytes, data);

    const centralHeader = Buffer.alloc(46);
    writeUInt32LE(centralHeader, 0, 0x02014b50);
    writeUInt16LE(centralHeader, 4, 20);
    writeUInt16LE(centralHeader, 6, 20);
    writeUInt16LE(centralHeader, 8, 0);
    writeUInt16LE(centralHeader, 10, 0); // store
    writeUInt16LE(centralHeader, 12, 0);
    writeUInt16LE(centralHeader, 14, 0);
    writeUInt32LE(centralHeader, 16, crc);
    writeUInt32LE(centralHeader, 20, data.length);
    writeUInt32LE(centralHeader, 24, data.length);
    writeUInt16LE(centralHeader, 28, nameBytes.length);
    writeUInt16LE(centralHeader, 30, 0);
    writeUInt16LE(centralHeader, 32, 0);
    writeUInt16LE(centralHeader, 34, 0);
    writeUInt16LE(centralHeader, 36, 0);
    writeUInt32LE(centralHeader, 38, 0);
    writeUInt32LE(centralHeader, 42, localOffset);

    centralParts.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localSection = Buffer.concat(localParts);

  const end = Buffer.alloc(22);
  writeUInt32LE(end, 0, 0x06054b50);
  writeUInt16LE(end, 4, 0);
  writeUInt16LE(end, 6, 0);
  writeUInt16LE(end, 8, entries.length);
  writeUInt16LE(end, 10, entries.length);
  writeUInt32LE(end, 12, centralDirectory.length);
  writeUInt32LE(end, 16, localSection.length);
  writeUInt16LE(end, 20, 0);

  return Buffer.concat([localSection, centralDirectory, end]);
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
  const readmeText = buildReadmeText({ generatedAt, scope });
  const readmeBytes = toTextBytes(readmeText);

  // Policy: manifest.json intentionally excludes itself and manifest.sha256.txt from files[].
  // This avoids self-referential hashing and keeps manifestSha256 cryptographically coherent.
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
      {
        name: "README.txt",
        bytes: readmeBytes.length,
        sha256: sha256Hex(readmeBytes),
      },
    ],
    canonicalHashSha256,
  };

  const manifestBytes = toJsonBytes(manifestCore);
  const manifestSha256 = sha256Hex(manifestBytes);
  const finalManifestSha256Text = `${manifestSha256}  manifest.json\n`;
  const finalManifestSha256Bytes = toTextBytes(finalManifestSha256Text);

  const zipBuffer = buildStoredZip([
    { name: "slice.json", data: sliceBytes },
    { name: "manifest.json", data: manifestBytes },
    { name: "manifest.sha256.txt", data: finalManifestSha256Bytes },
    { name: "README.txt", data: readmeBytes },
  ]);

  return {
    zipBuffer,
    slice,
    manifest: manifestCore,
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
