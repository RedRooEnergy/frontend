import fs from "node:fs";
import path from "node:path";
import fsExtra from "fs-extra";
import AdmZip from "adm-zip";
import { buildEvidencePack } from "../scripts/evidence/build-evidence-pack";
import { sha256File } from "../scripts/crypto/sha256";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const tmpRoot = path.join(process.cwd(), ".tmp", "evidence-pack");
  const auditDir = path.join(tmpRoot, "artifacts", "audit", "EXT-BUYER-01");
  const outRoot = path.join(tmpRoot, "artifacts", "evidence", "EXT-BUYER-01");

  await fsExtra.emptyDir(tmpRoot);
  await fsExtra.ensureDir(auditDir);
  await fsExtra.ensureDir(path.join(auditDir, "traces"));
  await fsExtra.ensureDir(path.join(auditDir, "screenshots"));

  const scorecard = {
    runId: "RUN-TEST-001",
    checks: [
      {
        checkId: "CHK-CART-04",
        status: "FAIL",
      },
    ],
    summary: { overall: "FAIL" },
  };
  fs.writeFileSync(path.join(auditDir, "scorecard.json"), JSON.stringify(scorecard, null, 2));
  fs.writeFileSync(path.join(auditDir, "scorecard.html"), "<html>scorecard</html>");
  fs.writeFileSync(path.join(auditDir, "playwright-report.json"), "{}");
  fs.writeFileSync(path.join(auditDir, "traces", "CHK-CART-04.zip"), "trace");
  fs.writeFileSync(path.join(auditDir, "screenshots", "CHK-CART-04.png"), "png");

  const { outputDir } = await buildEvidencePack({
    auditDir,
    outRoot,
    commitSha: "TESTCOMMIT",
  });

  const manifestPath = path.join(outputDir, "manifest.json");
  const manifestShaPath = path.join(outputDir, "manifest.sha256");
  const zipPath = path.join(outputDir, "evidence-pack.zip");

  assert(fs.existsSync(manifestPath), "manifest.json missing");
  assert(fs.existsSync(manifestShaPath), "manifest.sha256 missing");
  assert(fs.existsSync(zipPath), "evidence-pack.zip missing");

  const manifestHash = sha256File(manifestPath);
  const manifestShaFile = fs.readFileSync(manifestShaPath, "utf8").trim();
  assert(manifestHash === manifestShaFile, "manifest.sha256 does not match manifest.json");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    files: { path: string; sha256: string }[];
  };
  const scorecardEntry = manifest.files.find((entry) => entry.path === "scorecard.json");
  assert(!!scorecardEntry, "manifest missing scorecard.json entry");
  const scorecardHash = sha256File(path.join(outputDir, "scorecard.json"));
  assert(scorecardEntry?.sha256 === scorecardHash, "scorecard.json hash mismatch in manifest");

  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries().map((entry) => entry.entryName);
  const requiredFiles = ["scorecard.json", "scorecard.html", "manifest.json", "manifest.sha256"];
  for (const required of requiredFiles) {
    assert(zipEntries.includes(required), `ZIP missing ${required}`);
  }

  const htmlPath = path.join(outputDir, "scorecard.html");
  assert(fs.existsSync(htmlPath), "scorecard.html missing");
  const htmlContent = fs.readFileSync(htmlPath, "utf8");
  assert(
    htmlContent.includes("CHK-CART-04"),
    "scorecard.html does not include CHK-CART-04"
  );
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
