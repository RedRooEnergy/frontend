import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type EvidenceDefinition = {
  key: string;
  label: string;
  directory: string;
  scorecardPrefix: string;
  summaryPrefix: string;
};

type EvidenceArtifact = {
  key: string;
  label: string;
  directory: string;
  latestScorecardPath: string | null;
  latestPdfPath: string | null;
  latestShaPath: string | null;
  latestPdfSha256: string | null;
  updatedAtUtc: string | null;
};

export type EvidenceIndex = {
  generatedAtUtc: string;
  repoRoot: string;
  tags: Record<string, string | null>;
  evidence: EvidenceArtifact[];
};

const EVIDENCE_DEFINITIONS: EvidenceDefinition[] = [
  {
    key: "buyer-onboarding",
    label: "Buyer Onboarding Audit",
    directory: "artefacts/buyer-onboarding-audit",
    scorecardPrefix: "scorecard.buyer-onboarding.",
    summaryPrefix: "summary.buyer-onboarding.",
  },
  {
    key: "freight-customs",
    label: "Freight & Customs Audit",
    directory: "artefacts/freight-customs-audit",
    scorecardPrefix: "scorecard.freight-customs.",
    summaryPrefix: "summary.freight-customs.",
  },
  {
    key: "installer-onboarding",
    label: "Installer Onboarding Audit",
    directory: "artefacts/installer-onboarding-audit",
    scorecardPrefix: "scorecard.installer-onboarding.",
    summaryPrefix: "summary.installer-onboarding.",
  },
  {
    key: "order-lifecycle",
    label: "Order Lifecycle Audit",
    directory: "artefacts/order-lifecycle-audit",
    scorecardPrefix: "scorecard.order-lifecycle.",
    summaryPrefix: "summary.order-lifecycle.",
  },
  {
    key: "freight-operational-pass2",
    label: "Freight Operational PASS-2",
    directory: "artefacts/freight-operational-pass2",
    scorecardPrefix: "scorecard.freight-operational-pass2.",
    summaryPrefix: "summary.freight-operational-pass2.",
  },
];

const TRACKED_TAGS = [
  "governance-baseline-v1.0-investor",
  "marketplace-governance-v1.0.0",
  "order-lifecycle-v1.0.0",
  "freight-customs-audit-v1.0.0",
  "installer-onboarding-v1.0.0",
  "buyer-onboarding-audit-v1.0.0",
];

function pickRepoRoot() {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, "..")];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, ".git"))) {
      return candidate;
    }
  }
  return path.resolve(cwd, "..");
}

function toPosixRelative(base: string, target: string) {
  return path.relative(base, target).split(path.sep).join("/");
}

function latestMatchingFile(directory: string, predicate: (filename: string) => boolean) {
  if (!fs.existsSync(directory)) return null;
  const entries = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => {
      const absolutePath = path.join(directory, entry.name);
      const stats = fs.statSync(absolutePath);
      return {
        absolutePath,
        modifiedMs: stats.mtimeMs,
      };
    })
    .sort((a, b) => b.modifiedMs - a.modifiedMs);

  return entries[0] || null;
}

function readShaValue(filePath: string | null) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8").trim();
  if (!content) return null;
  return content.split(/\s+/)[0] || null;
}

function readTagCommit(repoRoot: string, tag: string) {
  try {
    return execSync(`git rev-parse --verify ${tag}^{commit}`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

export function buildEvidenceIndex(): EvidenceIndex {
  const repoRoot = pickRepoRoot();
  const evidence = EVIDENCE_DEFINITIONS.map((definition) => {
    const directory = path.join(repoRoot, definition.directory);
    const latestScorecard = latestMatchingFile(
      directory,
      (filename) => filename.startsWith(definition.scorecardPrefix) && filename.endsWith(".json")
    );
    const latestPdf = latestMatchingFile(
      directory,
      (filename) => filename.startsWith(definition.summaryPrefix) && filename.endsWith(".pdf")
    );
    const latestSha = latestMatchingFile(
      directory,
      (filename) => filename.startsWith(definition.summaryPrefix) && filename.endsWith(".sha256")
    );

    const updatedAtMs = Math.max(latestScorecard?.modifiedMs || 0, latestPdf?.modifiedMs || 0, latestSha?.modifiedMs || 0);
    return {
      key: definition.key,
      label: definition.label,
      directory: definition.directory,
      latestScorecardPath: latestScorecard ? toPosixRelative(repoRoot, latestScorecard.absolutePath) : null,
      latestPdfPath: latestPdf ? toPosixRelative(repoRoot, latestPdf.absolutePath) : null,
      latestShaPath: latestSha ? toPosixRelative(repoRoot, latestSha.absolutePath) : null,
      latestPdfSha256: readShaValue(latestSha?.absolutePath || null),
      updatedAtUtc: updatedAtMs ? new Date(updatedAtMs).toISOString() : null,
    };
  });

  const tags = Object.fromEntries(TRACKED_TAGS.map((tag) => [tag, readTagCommit(repoRoot, tag)]));

  return {
    generatedAtUtc: new Date().toISOString(),
    repoRoot,
    tags,
    evidence,
  };
}
