export type EvidenceManifestEntry = {
  path: string;
  sha256: string;
};

export type EvidenceManifest = {
  runId: string;
  commitSha: string;
  generatedAt: string;
  files: EvidenceManifestEntry[];
  manifestSha256: string;
};
