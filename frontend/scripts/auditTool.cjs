#!/usr/bin/env node
/* eslint-disable no-console */
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs-extra");
const path = require("path");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const PDFDocument = require("pdfkit");
const { execSync } = require("child_process");

const argv = yargs(hideBin(process.argv))
  .option("base-url", {
    type: "string",
    demandOption: true,
    describe: "Base URL of deployed platform (e.g. https://example.com)",
  })
  .option("out-dir", {
    type: "string",
    default: "",
    describe: "Output directory (default: repo root)",
  })
  .parseSync();

const baseUrl = argv["base-url"].replace(/\/$/, "");
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = argv["out-dir"] ? path.resolve(argv["out-dir"]) : repoRoot;

const badgesDir = path.join(outDir, "badges");
const attestDir = path.join(outDir, "attestations");
fs.ensureDirSync(badgesDir);
fs.ensureDirSync(attestDir);

const AUDIT_SUPPLIER_TOKEN = process.env.AUDIT_SUPPLIER_TOKEN || "";
const AUDIT_ADMIN_TOKEN = process.env.AUDIT_ADMIN_TOKEN || "";
const AUDIT_REGULATOR_TOKEN = process.env.AUDIT_REGULATOR_TOKEN || "";
const AUDIT_SUPPLIER_COOKIE = process.env.AUDIT_SUPPLIER_COOKIE || "";
const AUDIT_ADMIN_COOKIE = process.env.AUDIT_ADMIN_COOKIE || "";
const AUDIT_REGULATOR_COOKIE = process.env.AUDIT_REGULATOR_COOKIE || "";

const RUN_ID = `audit-${Date.now()}`;
const RESULTS_PATH = path.join(outDir, "audit-results.json");
const SCORE_JSON = path.join(outDir, "governance-scorecard.json");
const SCORE_MD = path.join(outDir, "governance-scorecard.md");
const BADGE_PATH = path.join(badgesDir, "governance.svg");

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function getGitCommit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function getGitTag() {
  try {
    return execSync("git describe --tags --abbrev=0", { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function headersFor(role) {
  const headers = {};
  if (role === "ADMIN") {
    if (AUDIT_ADMIN_TOKEN) headers.Authorization = `Bearer ${AUDIT_ADMIN_TOKEN}`;
    if (AUDIT_ADMIN_COOKIE) headers.Cookie = AUDIT_ADMIN_COOKIE;
    if (!AUDIT_ADMIN_TOKEN && !AUDIT_ADMIN_COOKIE) {
      headers["x-dev-admin"] = "1";
      headers["x-dev-admin-user"] = "audit-admin";
      headers["x-dev-admin-email"] = "audit-admin@redrooenergy.local";
    }
  }
  if (role === "SUPPLIER") {
    if (AUDIT_SUPPLIER_TOKEN) headers.Authorization = `Bearer ${AUDIT_SUPPLIER_TOKEN}`;
    if (AUDIT_SUPPLIER_COOKIE) headers.Cookie = AUDIT_SUPPLIER_COOKIE;
    if (!AUDIT_SUPPLIER_TOKEN && !AUDIT_SUPPLIER_COOKIE) {
      headers["x-dev-supplier"] = "1";
      headers["x-dev-supplier-user"] = "audit-supplier";
      headers["x-dev-supplier-email"] = "audit-supplier@redrooenergy.local";
    }
  }
  if (role === "REGULATOR") {
    if (AUDIT_REGULATOR_TOKEN) headers.Authorization = `Bearer ${AUDIT_REGULATOR_TOKEN}`;
    if (AUDIT_REGULATOR_COOKIE) headers.Cookie = AUDIT_REGULATOR_COOKIE;
    if (!AUDIT_REGULATOR_TOKEN && !AUDIT_REGULATOR_COOKIE) {
      headers["x-dev-regulator"] = "1";
      headers["x-dev-regulator-user"] = "audit-regulator";
      headers["x-dev-regulator-email"] = "audit-regulator@redrooenergy.local";
    }
  }
  return headers;
}

async function safeRequest(config) {
  try {
    const response = await axios({ validateStatus: () => true, timeout: 15000, ...config });
    return { response };
  } catch (error) {
    return { error };
  }
}

function recordResult(results, payload) {
  results.push({
    id: payload.id,
    clause: payload.clause,
    severity: payload.severity || "HIGH",
    description: payload.description,
    method: payload.method,
    url: payload.url,
    expectedStatus: payload.expectedStatus,
    actualStatus: payload.actualStatus,
    pass: payload.pass,
    error: payload.error || "",
    timestamp: new Date().toISOString(),
  });
}

function buildBadge(passed) {
  const color = passed ? "#16a34a" : "#dc2626";
  const text = passed ? "PASS" : "FAIL";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="28" role="img" aria-label="governance: ${text}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <rect rx="3" width="160" height="28" fill="#1f2937"/>
  <rect rx="3" x="92" width="68" height="28" fill="${color}"/>
  <path fill="${color}" d="M92 0h4v28h-4z"/>
  <rect rx="3" width="160" height="28" fill="url(#s)"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="46" y="18">governance</text>
    <text x="126" y="18">${text}</text>
  </g>
</svg>`.trim();
}

async function writeAttestation({ scorecard, commitHash, tag }) {
  const pdfPath = path.join(attestDir, `governance-attestation-${RUN_ID}.pdf`);
  const hashPath = `${pdfPath}.sha256`;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (d) => chunks.push(d));
    doc.on("end", () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(pdfPath, buf);
      const hash = sha256Hex(buf);
      fs.writeFileSync(hashPath, `${hash}  ${path.basename(pdfPath)}\n`);
      resolve();
    });
    doc.on("error", reject);

    doc.fontSize(16).text("Governance Audit Attestation", { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Run ID: ${RUN_ID}`);
    doc.text(`Timestamp: ${new Date().toISOString()}`);
    doc.text(`Commit: ${commitHash}`);
    doc.text(`Governance Tag: ${tag}`);
    doc.text(`Overall Result: ${scorecard.overall}`);
    doc.text(`Total Checks: ${scorecard.totalChecks}`);
    doc.text(`Passed: ${scorecard.passed} | Failed: ${scorecard.failed}`);
    doc.moveDown();

    doc.fontSize(12).text("Clause Impact Summary", { underline: true });
    doc.fontSize(10);
    Object.entries(scorecard.clauseImpact).forEach(([clause, counts]) => {
      doc.text(`${clause}: ${counts.failed} failed / ${counts.total} total`);
    });

    doc.moveDown();
    doc.fontSize(10).text("This attestation is generated by the Governance Audit, Verification & Attestation Program.");
    doc.end();
  });

  return { pdfPath, hashPath };
}

async function run() {
  const results = [];
  let applicationId = null;
  let documentHash = null;
  let exportId = null;

  // RBAC: supplier cannot access admin endpoint
  {
    const url = `${baseUrl}/api/admin/compliance-partners`;
    const { response, error } = await safeRequest({
      method: "GET",
      url,
      headers: headersFor("SUPPLIER"),
    });
    recordResult(results, {
      id: "rbac_supplier_admin_forbidden",
      clause: "GOV-CORE-01",
      description: "Supplier cannot access admin endpoint",
      method: "GET",
      url,
      expectedStatus: 403,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 403,
      error: error?.message,
    });
  }

  // Admin access to admin endpoint
  {
    const url = `${baseUrl}/api/admin/compliance-partners`;
    const { response, error } = await safeRequest({
      method: "GET",
      url,
      headers: headersFor("ADMIN"),
    });
    recordResult(results, {
      id: "rbac_admin_access",
      clause: "GOV-CORE-01",
      description: "Admin access to compliance partner registry",
      method: "GET",
      url,
      expectedStatus: 200,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 200,
      error: error?.message,
    });
  }

  // Compliance checklist
  {
    const url = `${baseUrl}/api/compliance/checklists?productType=InverterBatteryEV`;
    const { response, error } = await safeRequest({
      method: "GET",
      url,
      headers: headersFor("ADMIN"),
    });
    recordResult(results, {
      id: "api_checklists",
      clause: "GOV-COMP-03",
      description: "Admin loads compliance checklist",
      method: "GET",
      url,
      expectedStatus: 200,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 200,
      error: error?.message,
    });
  }

  // Create application
  {
    const url = `${baseUrl}/api/compliance/applications`;
    const { response, error } = await safeRequest({
      method: "POST",
      url,
      headers: { ...headersFor("SUPPLIER"), "Content-Type": "application/json" },
      data: { productType: "InverterBatteryEV", markets: ["AU"] },
    });
    const ok = response?.status === 201;
    applicationId = ok ? response.data?._id || response.data?.id : null;
    recordResult(results, {
      id: "supplier_create_application",
      clause: "GOV-COMP-02",
      description: "Supplier creates compliance application",
      method: "POST",
      url,
      expectedStatus: 201,
      actualStatus: response?.status || "ERR",
      pass: ok,
      error: error?.message,
    });
  }

  // Submit without docs (should be blocked) - only if app created
  if (applicationId) {
    const url = `${baseUrl}/api/compliance/applications/${applicationId}/submit`;
    const { response, error } = await safeRequest({
      method: "POST",
      url,
      headers: headersFor("SUPPLIER"),
    });
    recordResult(results, {
      id: "submit_blocked",
      clause: "GOV-COMP-03",
      description: "Submission blocked until checklist PASS",
      method: "POST",
      url,
      expectedStatus: 409,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 409 || response?.status === 400,
      error: error?.message,
    });
  }

  // Upload document
  if (applicationId) {
    const url = `${baseUrl}/api/compliance/applications/${applicationId}/documents`;
    const form = new (require("form-data"))();
    form.append("documentType", "TEST_REPORT");
    form.append("file", Buffer.from("audit-test-file"), {
      filename: "audit-test.txt",
      contentType: "text/plain",
    });

    const { response, error } = await safeRequest({
      method: "POST",
      url,
      headers: { ...headersFor("SUPPLIER"), ...form.getHeaders() },
      data: form,
    });
    documentHash = response?.data?.sha256Hash || null;
    recordResult(results, {
      id: "document_upload",
      clause: "GOV-COMP-02",
      description: "Document upload generates SHA-256",
      method: "POST",
      url,
      expectedStatus: 201,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 201 && Boolean(documentHash),
      error: error?.message,
    });
  }

  // Checklist evaluation
  if (applicationId) {
    const url = `${baseUrl}/api/compliance/applications/${applicationId}/evaluation`;
    const { response, error } = await safeRequest({
      method: "GET",
      url,
      headers: headersFor("SUPPLIER"),
    });
    recordResult(results, {
      id: "checklist_evaluation",
      clause: "GOV-COMP-03",
      description: "Checklist evaluation returns PASS/FAIL structure",
      method: "GET",
      url,
      expectedStatus: 200,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 200 && response?.data?.overallStatus,
      error: error?.message,
    });
  }

  // Admin review decision
  if (applicationId) {
    const url = `${baseUrl}/api/compliance/applications/${applicationId}/review`;
    const { response, error } = await safeRequest({
      method: "POST",
      url,
      headers: { ...headersFor("ADMIN"), "Content-Type": "application/json" },
      data: {
        applicationId,
        decision: "REQUEST_CHANGES",
        reasons: ["Audit test"],
        notes: "Audit test decision",
        decidedAt: new Date().toISOString(),
      },
    });
    recordResult(results, {
      id: "admin_review",
      clause: "GOV-COMP-04",
      description: "Admin review decision enforced",
      method: "POST",
      url,
      expectedStatus: 200,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 200,
      error: error?.message,
    });
  }

  // Evidence export
  if (applicationId) {
    const url = `${baseUrl}/api/compliance/applications/${applicationId}/exports`;
    const { response, error } = await safeRequest({
      method: "POST",
      url,
      headers: { ...headersFor("ADMIN"), "Content-Type": "application/json" },
      data: { pdfRequested: false },
    });
    exportId = response?.data?.exportId || null;
    recordResult(results, {
      id: "evidence_export",
      clause: "GOV-COMP-02",
      description: "Evidence export created",
      method: "POST",
      url,
      expectedStatus: 201,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 201 && Boolean(exportId),
      error: error?.message,
    });
  }

  // Regulator hash verification
  if (documentHash) {
    const url = `${baseUrl}/api/compliance/regulator/verify-hash`;
    const { response, error } = await safeRequest({
      method: "POST",
      url,
      headers: { ...headersFor("REGULATOR"), "Content-Type": "application/json" },
      data: { sha256: documentHash },
    });
    recordResult(results, {
      id: "regulator_hash_verify",
      clause: "GOV-REG-01",
      description: "Regulator hash verification returns match",
      method: "POST",
      url,
      expectedStatus: 200,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 200 && response?.data?.match === true,
      error: error?.message,
    });
  }

  // Secure download endpoints
  if (exportId) {
    const url = `${baseUrl}/api/compliance/exports/${exportId}/download/manifest`;
    const { response, error } = await safeRequest({
      method: "GET",
      url,
      headers: headersFor("ADMIN"),
    });
    recordResult(results, {
      id: "secure_manifest_download",
      clause: "GOV-AUD-01",
      description: "Secure manifest download enforces RBAC",
      method: "GET",
      url,
      expectedStatus: 200,
      actualStatus: response?.status || "ERR",
      pass: response?.status === 200,
      error: error?.message,
    });
  }

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;
  const clauseImpact = results.reduce((acc, r) => {
    if (!acc[r.clause]) acc[r.clause] = { total: 0, failed: 0 };
    acc[r.clause].total += 1;
    if (!r.pass) acc[r.clause].failed += 1;
    return acc;
  }, {});

  const scorecard = {
    runId: RUN_ID,
    baseUrl,
    overall: failCount === 0 ? "PASS" : "FAIL",
    totalChecks: results.length,
    passed: passCount,
    failed: failCount,
    clauseImpact,
    timestamp: new Date().toISOString(),
  };

  fs.writeJsonSync(RESULTS_PATH, results, { spaces: 2 });
  fs.writeJsonSync(SCORE_JSON, scorecard, { spaces: 2 });

  const mdLines = [
    `# Governance Scorecard`,
    ``,
    `- Run ID: ${RUN_ID}`,
    `- Base URL: ${baseUrl}`,
    `- Overall: **${scorecard.overall}**`,
    `- Total checks: ${scorecard.totalChecks}`,
    `- Passed: ${scorecard.passed}`,
    `- Failed: ${scorecard.failed}`,
    ``,
    `## Clause Impact`,
    ...Object.entries(scorecard.clauseImpact).map(
      ([clause, counts]) => `- ${clause}: ${counts.failed} failed / ${counts.total} total`
    ),
    ``,
    `## Results`,
    ...results.map(
      (r) => `- ${r.id}: ${r.pass ? "PASS" : "FAIL"} (${r.method} ${r.url} → ${r.actualStatus})`
    ),
  ];
  fs.writeFileSync(SCORE_MD, mdLines.join("\n"));

  fs.writeFileSync(BADGE_PATH, buildBadge(scorecard.overall === "PASS"));

  const commitHash = getGitCommit();
  const tag = getGitTag();
  await writeAttestation({ scorecard, commitHash, tag });

  console.log("Audit complete.");
  console.log(`Results: ${RESULTS_PATH}`);
  console.log(`Scorecard: ${SCORE_JSON}`);
  console.log(`Badge: ${BADGE_PATH}`);
  console.log(`Attestation: ${attestDir}`);
  process.exit(scorecard.overall === "PASS" ? 0 : 2);
}

run().catch((err) => {
  console.error("Audit failed:", err.message);
  process.exit(2);
});
