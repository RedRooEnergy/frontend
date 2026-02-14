import crypto from "crypto";
import type { AuditCommsCompletenessLabel } from "../hash/compositeEvidenceHash";
import type {
  AdminSliceEvidenceRow,
  RegulatorSliceEvidenceRow,
  SliceViewResponse,
} from "../slice/sliceRenderer";

type AllowedSliceRow = RegulatorSliceEvidenceRow | AdminSliceEvidenceRow;

type ArtifactName = "view.json" | "export.json";

export type EvidencePackArtifactDigest = {
  artifactName: ArtifactName;
  sha256: string;
  bytes: number;
};

export type EvidencePackManifest = {
  manifestVersion: "audit-comms-export-manifest.v1";
  generatedAt: string;
  scopeLabel: string;
  completenessLabel: AuditCommsCompletenessLabel;
  compositeEvidenceHash: string;
  artifacts: EvidencePackArtifactDigest[];
};

export type EvidencePack = {
  generatedAt: string;
  scopeLabel: string;
  completenessLabel: AuditCommsCompletenessLabel;
  compositeEvidenceHash: string;
  artifacts: {
    "view.json": string;
    "export.json": string;
    "manifest.json": string;
  };
  artifactDigests: EvidencePackArtifactDigest[];
  manifestHash: string;
};

export type AssembleEvidencePackInput<RowType extends AllowedSliceRow> = {
  view: SliceViewResponse<RowType>;
  exportView?: SliceViewResponse<RowType>;
};

export type ManifestIntegrityVerificationResult = {
  valid: boolean;
  manifestHashMatches: boolean;
  artifactHashMatches: boolean;
  artifactByteMatches: boolean;
  details: Array<{
    artifactName: ArtifactName;
    expectedSha256: string;
    actualSha256: string;
    expectedBytes: number;
    actualBytes: number;
    hashMatch: boolean;
    byteMatch: boolean;
  }>;
};

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort((left, right) => left.localeCompare(right));
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`)
    .join(",")}}`;
}

function artifactDigest(artifactName: ArtifactName, content: string): EvidencePackArtifactDigest {
  return {
    artifactName,
    sha256: sha256Hex(content),
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

function sortArtifactDigests(digests: EvidencePackArtifactDigest[]): EvidencePackArtifactDigest[] {
  return [...digests].sort((left, right) => left.artifactName.localeCompare(right.artifactName));
}

export function assembleEvidencePack<RowType extends AllowedSliceRow>(
  input: AssembleEvidencePackInput<RowType>
): EvidencePack {
  const view = input.view;
  const exportView = input.exportView || input.view;

  const viewJson = stableSerialize(view);
  const exportJson = stableSerialize(exportView);

  const digests = sortArtifactDigests([
    artifactDigest("view.json", viewJson),
    artifactDigest("export.json", exportJson),
  ]);

  const manifest: EvidencePackManifest = {
    manifestVersion: "audit-comms-export-manifest.v1",
    generatedAt: view.generatedAt,
    scopeLabel: view.scopeLabel,
    completenessLabel: view.completenessLabel,
    compositeEvidenceHash: view.compositeEvidenceHash,
    artifacts: digests,
  };

  const manifestJson = stableSerialize(manifest);
  const manifestHash = sha256Hex(manifestJson);

  return {
    generatedAt: view.generatedAt,
    scopeLabel: view.scopeLabel,
    completenessLabel: view.completenessLabel,
    compositeEvidenceHash: view.compositeEvidenceHash,
    artifacts: {
      "view.json": viewJson,
      "export.json": exportJson,
      "manifest.json": manifestJson,
    },
    artifactDigests: digests,
    manifestHash,
  };
}

export function verifyEvidencePackManifestIntegrity(pack: EvidencePack): ManifestIntegrityVerificationResult {
  const parsedManifest = JSON.parse(pack.artifacts["manifest.json"]) as EvidencePackManifest;

  const details = parsedManifest.artifacts.map((artifact) => {
    const content = artifact.artifactName === "view.json" ? pack.artifacts["view.json"] : pack.artifacts["export.json"];
    const actualSha256 = sha256Hex(content);
    const actualBytes = Buffer.byteLength(content, "utf8");
    const hashMatch = actualSha256 === artifact.sha256;
    const byteMatch = actualBytes === artifact.bytes;

    return {
      artifactName: artifact.artifactName,
      expectedSha256: artifact.sha256,
      actualSha256,
      expectedBytes: artifact.bytes,
      actualBytes,
      hashMatch,
      byteMatch,
    };
  });

  const manifestHashMatches = sha256Hex(pack.artifacts["manifest.json"]) === pack.manifestHash;
  const artifactHashMatches = details.every((row) => row.hashMatch);
  const artifactByteMatches = details.every((row) => row.byteMatch);

  return {
    valid: manifestHashMatches && artifactHashMatches && artifactByteMatches,
    manifestHashMatches,
    artifactHashMatches,
    artifactByteMatches,
    details,
  };
}
