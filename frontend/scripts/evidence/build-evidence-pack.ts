import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import fsExtra from "fs-extra";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { sha256File, sha256String } from "../crypto/sha256";
import { enrichScorecard } from "./enrich-scorecard";

type ManifestEntry = {
  path: string;
  sha256: string;
};

export type EvidenceManifest = {
  runId: string;
  commitSha: string;
  generatedAt: string;
  files: ManifestEntry[];
  manifestSha256: string;
};

function resolveRootDir() {
  const cwd = process.cwd();
  const hasFrontendPackage = fs.existsSync(path.join(cwd, "package.json"));
  return hasFrontendPackage ? path.resolve(cwd, "..") : cwd;
}

function listScorecards(auditDir: string) {
  if (!fs.existsSync(auditDir)) return [];
  return fs
    .readdirSync(auditDir)
    .filter((name) => name.startsWith("scorecard") && name.endsWith(".json"))
    .map((name) => path.join(auditDir, name));
}

function pickLatestFile(files: string[]) {
  if (!files.length) return null;
  return files
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
}

function collectFiles(dir: string, baseDir: string, ignore: Set<string>) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(baseDir, full);
    if (ignore.has(rel)) continue;
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, baseDir, ignore));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function buildManifest(runId: string, commitSha: string, outputDir: string) {
  const ignore = new Set([
    "manifest.json",
    "manifest.sha256",
    "evidence-pack.zip",
    "evidence-pack.zip.sha256",
  ]);
  const files = collectFiles(outputDir, outputDir, ignore).sort();
  const entries: ManifestEntry[] = files.map((file) => ({
    path: path.relative(outputDir, file).replace(/\\/g, "/"),
    sha256: sha256File(file),
  }));

  const manifest: EvidenceManifest = {
    runId,
    commitSha,
    generatedAt: new Date().toISOString(),
    files: entries,
    manifestSha256: "",
  };

  const manifestHash = sha256String(
    JSON.stringify({ ...manifest, manifestSha256: "" })
  );
  manifest.manifestSha256 = manifestHash;
  return manifest;
}

async function writeManifest(outputDir: string, manifest: EvidenceManifest) {
  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const manifestFileHash = sha256File(manifestPath);
  const manifestShaPath = path.join(outputDir, "manifest.sha256");
  fs.writeFileSync(manifestShaPath, `${manifestFileHash}\n`);
}

async function buildZip(outputDir: string) {
  const zipPath = path.join(outputDir, "evidence-pack.zip");
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    archive.glob("**/*", {
      cwd: outputDir,
      ignore: ["evidence-pack.zip"],
    });
    archive.finalize();
  });

  const zipHash = sha256File(zipPath);
  fs.writeFileSync(path.join(outputDir, "evidence-pack.zip.sha256"), `${zipHash}\n`);
}

export type EvidencePackOptions = {
  auditDir?: string;
  outRoot?: string;
  scorecard?: string;
  runId?: string;
  commitSha?: string;
  clauseIndexPath?: string;
  chkMapPath?: string;
  pdfFileName?: string;
};

export async function buildEvidencePack(options: EvidencePackOptions = {}) {
  const rootDir = resolveRootDir();
  const defaultAuditDir = path.join(rootDir, "artifacts", "audit", "EXT-BUYER-01");
  const defaultOutRoot = path.join(rootDir, "artifacts", "evidence", "EXT-BUYER-01");
  const defaultClauseIndexPath = path.join(
    rootDir,
    "docs",
    "extensions",
    "EXT-BUYER-01",
    "CLAUSE_INDEX.json"
  );
  const defaultChkMapPath = path.join(
    rootDir,
    "audits",
    "EXT-BUYER-01",
    "chk-to-clause.map.json"
  );

  const auditDir = options.auditDir ?? defaultAuditDir;
  const outRoot = options.outRoot ?? defaultOutRoot;
  const scorecardPath =
    options.scorecard ?? pickLatestFile(listScorecards(auditDir));
  if (!scorecardPath || !fs.existsSync(scorecardPath)) {
    throw new Error("Scorecard not found; run audit before building evidence pack.");
  }

  const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));
  const runId =
    options.runId ?? scorecard.runId ?? path.basename(scorecardPath).replace(/\.json$/, "");
  const commitSha =
    options.commitSha ?? process.env.GITHUB_SHA ?? "UNKNOWN";

  enrichScorecard({
    scorecardPath,
    clauseIndexPath: options.clauseIndexPath ?? defaultClauseIndexPath,
    chkMapPath: options.chkMapPath ?? defaultChkMapPath,
    pdfFileName: options.pdfFileName ?? "EXT-BUYER-01_GOVERNANCE_PACK_v1.0.pdf",
  });

  const outputDir = path.join(outRoot, runId);
  await fsExtra.emptyDir(outputDir);

  await fsExtra.copy(scorecardPath, path.join(outputDir, "scorecard.json"));
  const optionalFiles = [
    path.join(auditDir, "scorecard.html"),
    path.join(auditDir, "playwright-report.json"),
  ];
  for (const file of optionalFiles) {
    if (fs.existsSync(file)) {
      await fsExtra.copy(file, path.join(outputDir, path.basename(file)));
    }
  }

  const optionalDirs = ["traces", "screenshots"];
  for (const dir of optionalDirs) {
    const source = path.join(auditDir, dir);
    if (fs.existsSync(source)) {
      await fsExtra.copy(source, path.join(outputDir, dir));
    }
  }

  const manifest = buildManifest(runId, commitSha, outputDir);
  await writeManifest(outputDir, manifest);
  await buildZip(outputDir);

  return { outputDir, manifest };
}

async function runCli() {
  const rootDir = resolveRootDir();
  const defaultAuditDir = path.join(rootDir, "artifacts", "audit", "EXT-BUYER-01");
  const defaultOutRoot = path.join(rootDir, "artifacts", "evidence", "EXT-BUYER-01");

  const argv = await yargs(hideBin(process.argv))
    .options({
      auditDir: { type: "string", default: defaultAuditDir },
      outRoot: { type: "string", default: defaultOutRoot },
      scorecard: { type: "string" },
      runId: { type: "string" },
      commitSha: { type: "string" },
    })
    .strict()
    .parse();

  await buildEvidencePack({
    auditDir: argv.auditDir,
    outRoot: argv.outRoot,
    scorecard: argv.scorecard,
    runId: argv.runId,
    commitSha: argv.commitSha,
  });
}

if (process.argv[1] && process.argv[1].includes("build-evidence-pack")) {
  runCli().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
