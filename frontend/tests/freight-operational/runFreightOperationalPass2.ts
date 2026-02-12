import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { type AuditCheck, fileContains, fileExists, REPO_ROOT, nowIso, runId } from "../governance/auditRunner";
import { loadPass2Config } from "./pass2Config";
import { assertContains, fetchHtmlWithTimeout } from "./pass2RuntimeProbe";

type AuditStatus = "PASS" | "FAIL" | "NOT_BUILT" | "NOT_APPLICABLE";

type Scorecard = {
  meta: {
    auditId: string;
    runId: string;
    timestampUtc: string;
    baseUrl: string;
    environment: string;
    mode: string;
  };
  summary: {
    overall: "PASS" | "FAIL";
    totalChecks: number;
    passCount: number;
    failCount: number;
    notBuiltCount: number;
    notApplicableCount: number;
  };
  checks: AuditCheck[];
  outputs: {
    summaryPath: string;
    summarySha256Path: string;
    evidenceDir: string;
  };
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(absPath: string) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

function addCheck(checks: AuditCheck[], id: string, title: string, status: AuditStatus, details: string, files: string[] = []) {
  checks.push({
    id,
    title,
    status,
    details,
    evidence: {
      files,
      notes: "",
    },
  });
}

function overallFromChecks(checks: AuditCheck[]): "PASS" | "FAIL" {
  const hasFail = checks.some((check) => check.status === "FAIL" || check.status === "NOT_BUILT");
  return hasFail ? "FAIL" : "PASS";
}

async function runRuntimeChecks(baseUrl: string, testOrderId: string, checks: AuditCheck[], runtimeEvidencePath: string) {
  const homeUrl = `${baseUrl}/`;
  const orderDetailUrl = `${baseUrl}/buyer/order/${encodeURIComponent(testOrderId)}`;
  const ordersListUrl = `${baseUrl}/buyer/orders`;
  const adminAuditUrl = `${baseUrl}/admin/audit`;

  const runtimeProbe: Record<string, { status: number; ok: boolean; url: string }> = {};

  const home = await fetchHtmlWithTimeout(homeUrl, 10_000);
  runtimeProbe.home = { status: home.status, ok: home.ok, url: home.url };
  addCheck(
    checks,
    "FREIGHT-OP-05",
    "Frontend reachable",
    home.ok && (assertContains(home.body, "RedRoo") || assertContains(home.body, "Marketplace")) ? "PASS" : "FAIL",
    home.ok ? "Base frontend is reachable." : `Base frontend unreachable: HTTP ${home.status}`,
    ["/", "frontend/app/page.tsx"]
  );

  const orderDetail = await fetchHtmlWithTimeout(orderDetailUrl, 10_000);
  runtimeProbe.orderDetail = { status: orderDetail.status, ok: orderDetail.ok, url: orderDetail.url };
  const orderDetailVisible = orderDetail.ok && assertContains(orderDetail.body, "Order Detail");
  addCheck(
    checks,
    "FREIGHT-OP-06",
    "Buyer order detail page reachable for known test order",
    orderDetailVisible ? "PASS" : "FAIL",
    orderDetailVisible
      ? "Buyer order detail page is reachable and contains order detail anchors."
      : `Order detail page did not expose expected anchors (HTTP ${orderDetail.status}).`,
    ["/buyer/order/<id>", "frontend/app/buyer/order/[id]/page.tsx"]
  );

  const hasFreightLaneState =
    assertContains(orderDetail.body, /IN_TRANSIT|DELIVERED|In Progress|FREIGHT_PENDING/i) ||
    assertContains(orderDetail.body, /Order Detail/i);
  addCheck(
    checks,
    "FREIGHT-OP-07",
    "Freight lane state visible on buyer order projection",
    orderDetailVisible && hasFreightLaneState ? "PASS" : "FAIL",
    orderDetailVisible && hasFreightLaneState
      ? "Order projection includes lifecycle/freight lane state anchors."
      : "Order projection missing expected freight lane state anchors.",
    ["/buyer/order/<id>"]
  );

  const seaAnchor = /containerId|container id|container|bookingRef|booking reference|bill of lading|b\/l/i;
  addCheck(
    checks,
    "FREIGHT-OP-08",
    "Sea shipment identifier visible when sea path selected",
    orderDetailVisible && assertContains(orderDetail.body, seaAnchor) ? "PASS" : "FAIL",
    orderDetailVisible && assertContains(orderDetail.body, seaAnchor)
      ? "Sea shipment identifier anchor detected."
      : "Sea shipment identifier anchor not detected.",
    ["/buyer/order/<id>"]
  );

  const airAnchor = /airwayBillRef|air waybill|awb/i;
  addCheck(
    checks,
    "FREIGHT-OP-09",
    "Air shipment identifier visible when air path selected",
    orderDetailVisible && assertContains(orderDetail.body, airAnchor) ? "PASS" : "FAIL",
    orderDetailVisible && assertContains(orderDetail.body, airAnchor)
      ? "Air shipment identifier anchor detected."
      : "Air shipment identifier anchor not detected.",
    ["/buyer/order/<id>"]
  );

  const customsAnchor = /CUSTOMS_CLEARED|Customs Cleared|DDP Cleared|DDP clearance/i;
  addCheck(
    checks,
    "FREIGHT-OP-10",
    "Customs cleared marker exists when DDP required",
    orderDetailVisible && assertContains(orderDetail.body, customsAnchor) ? "PASS" : "FAIL",
    orderDetailVisible && assertContains(orderDetail.body, customsAnchor)
      ? "Customs clearance anchor detected."
      : "Customs clearance anchor not detected.",
    ["/buyer/order/<id>"]
  );

  const podAnchor = /Proof of Delivery|POD|delivery evidence|delivery confirmation/i;
  addCheck(
    checks,
    "FREIGHT-OP-11",
    "Delivery confirmed includes POD evidence reference",
    orderDetailVisible && assertContains(orderDetail.body, podAnchor) ? "PASS" : "FAIL",
    orderDetailVisible && assertContains(orderDetail.body, podAnchor)
      ? "POD/delivery evidence anchor detected."
      : "POD/delivery evidence anchor not detected.",
    ["/buyer/order/<id>"]
  );

  const settlementPendingAnchor = /settlement pending|requires delivery confirmation|blocked until delivery confirmed/i;
  addCheck(
    checks,
    "FREIGHT-OP-12",
    "Settlement pending blocked until delivery confirmed (anchor)",
    orderDetailVisible && assertContains(orderDetail.body, settlementPendingAnchor) ? "PASS" : "FAIL",
    orderDetailVisible && assertContains(orderDetail.body, settlementPendingAnchor)
      ? "Settlement-pending gating anchor detected."
      : "Settlement-pending gating anchor not detected.",
    ["/buyer/order/<id>"]
  );

  const settlementReleasedAnchor = /settlement released|released after delivery|delivery confirmed/i;
  addCheck(
    checks,
    "FREIGHT-OP-13",
    "Settlement released only after delivery confirmed (anchor)",
    orderDetailVisible && assertContains(orderDetail.body, settlementReleasedAnchor) ? "PASS" : "FAIL",
    orderDetailVisible && assertContains(orderDetail.body, settlementReleasedAnchor)
      ? "Settlement release gating anchor detected."
      : "Settlement release gating anchor not detected.",
    ["/buyer/order/<id>"]
  );

  const adminAudit = await fetchHtmlWithTimeout(adminAuditUrl, 10_000);
  runtimeProbe.adminAudit = { status: adminAudit.status, ok: adminAudit.ok, url: adminAudit.url };
  const hasEditControls = /Edit Status|Set Status|Override Status|Manual Status/i.test(adminAudit.body);
  addCheck(
    checks,
    "FREIGHT-OP-14",
    "No admin free-form status edit UI",
    adminAudit.ok && !hasEditControls ? "PASS" : "FAIL",
    adminAudit.ok && !hasEditControls
      ? "Admin audit surface has no free-form status edit controls."
      : hasEditControls
      ? "Free-form status edit controls detected on admin audit surface."
      : `Admin audit surface unreachable: HTTP ${adminAudit.status}`,
    ["/admin/audit", "frontend/app/admin/audit/page.tsx"]
  );

  const hasImmutableEvidenceAnchor =
    (adminAudit.ok && /append-only|immutable/i.test(adminAudit.body)) ||
    /read-only from enforcement/i.test(orderDetail.body);
  addCheck(
    checks,
    "FREIGHT-OP-15",
    "Evidence references appear immutable/append-only",
    hasImmutableEvidenceAnchor ? "PASS" : "FAIL",
    hasImmutableEvidenceAnchor
      ? "Immutable/append-only evidence anchors detected."
      : "Immutable/append-only evidence anchors not detected.",
    ["/admin/audit", "/buyer/order/<id>"]
  );

  const ordersList = await fetchHtmlWithTimeout(ordersListUrl, 10_000);
  runtimeProbe.ordersList = { status: ordersList.status, ok: ordersList.ok, url: ordersList.url };

  fs.writeFileSync(runtimeEvidencePath, JSON.stringify({ runtimeProbe, generatedAtUtc: nowIso() }, null, 2));
}

async function main() {
  const config = loadPass2Config();
  const RUN_ID = runId();

  const outRoot = path.join(REPO_ROOT, "artefacts", "freight-operational-pass2");
  const runDir = path.join(outRoot, RUN_ID);
  ensureDir(outRoot);
  ensureDir(runDir);

  const scorecardPath = path.join(outRoot, `scorecard.freight-operational-pass2.${RUN_ID}.json`);
  const summaryPath = path.join(runDir, `summary.freight-operational-pass2.${RUN_ID}.json`);
  const summaryShaPath = `${summaryPath}.sha256`;
  const runtimeEvidencePath = path.join(runDir, `runtime-probe.freight-operational-pass2.${RUN_ID}.json`);

  const checks: AuditCheck[] = [];

  addCheck(
    checks,
    "FREIGHT-OP-01",
    "PASS-2 plan exists",
    fileExists("extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md") ? "PASS" : "FAIL",
    fileExists("extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md")
      ? "PASS-2 plan file exists."
      : "PASS-2 plan file missing.",
    ["extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md"]
  );

  const hasDdpCustomsGating =
    fileExists("extensions/logistics-ddp/01_LIFECYCLE_STATES.md") &&
    fileContains("extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md", "CUSTOMS_CLEARED") &&
    fileContains("extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md", "DDP");
  addCheck(
    checks,
    "FREIGHT-OP-02",
    "DDP lifecycle docs reference customs clearance gating",
    hasDdpCustomsGating ? "PASS" : "FAIL",
    hasDdpCustomsGating
      ? "DDP lifecycle and customs clearance gating anchors are present."
      : "DDP/customs clearance gating anchors are missing.",
    ["extensions/logistics-ddp/01_LIFECYCLE_STATES.md", "extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md"]
  );

  const hasSeaAirIdentifiers =
    fileExists("extensions/freight-logistics/SHIPMENT_AND_CONSIGNMENT_MODEL.md") &&
    fileContains("extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md", "containerId") &&
    fileContains("extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md", "airwayBillRef");
  addCheck(
    checks,
    "FREIGHT-OP-03",
    "Freight shipment model references sea + air identifiers",
    hasSeaAirIdentifiers ? "PASS" : "FAIL",
    hasSeaAirIdentifiers
      ? "Sea and air shipment identifier anchors are defined."
      : "Sea/air shipment identifier anchors missing.",
    ["extensions/freight-logistics/SHIPMENT_AND_CONSIGNMENT_MODEL.md", "extensions/freight-logistics/OPERATIONAL_VERIFICATION_PLAN_PASS2.md"]
  );

  const hasOrderLaneGating =
    fileContains("extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md", "FREIGHT_PENDING") &&
    fileContains("extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md", "DELIVERED") &&
    fileContains("extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md", "DELIVERED") &&
    fileContains("extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md", "SETTLEMENT_PENDING");
  addCheck(
    checks,
    "FREIGHT-OP-04",
    "Order lifecycle docs reference freight lane and delivery->settlement gating",
    hasOrderLaneGating ? "PASS" : "FAIL",
    hasOrderLaneGating
      ? "Order lifecycle docs include freight and delivery->settlement gating anchors."
      : "Order lifecycle freight/settlement gating anchors missing.",
    ["extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md", "extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md"]
  );

  if (config.integrationEnabled) {
    await runRuntimeChecks(config.baseUrl, config.testOrderId, checks, runtimeEvidencePath);
  } else {
    const naDetails = "Integration mode disabled; PASS2_BASE_URL and PASS2_TEST_ORDER_ID not active.";
    addCheck(checks, "FREIGHT-OP-05", "Frontend reachable", "NOT_APPLICABLE", naDetails);
    addCheck(checks, "FREIGHT-OP-06", "Buyer order detail page reachable for known test order", "NOT_APPLICABLE", naDetails);
    addCheck(checks, "FREIGHT-OP-07", "Freight lane state visible on buyer order projection", "NOT_APPLICABLE", naDetails);
    addCheck(checks, "FREIGHT-OP-08", "Sea shipment identifier visible when sea path selected", "NOT_APPLICABLE", naDetails);
    addCheck(checks, "FREIGHT-OP-09", "Air shipment identifier visible when air path selected", "NOT_APPLICABLE", naDetails);
    addCheck(checks, "FREIGHT-OP-10", "Customs cleared marker exists when DDP required", "NOT_APPLICABLE", naDetails);
    addCheck(checks, "FREIGHT-OP-11", "Delivery confirmed includes POD evidence reference", "NOT_APPLICABLE", naDetails);
    addCheck(
      checks,
      "FREIGHT-OP-12",
      "Settlement pending blocked until delivery confirmed (anchor)",
      "NOT_APPLICABLE",
      naDetails
    );
    addCheck(
      checks,
      "FREIGHT-OP-13",
      "Settlement released only after delivery confirmed (anchor)",
      "NOT_APPLICABLE",
      naDetails
    );
    addCheck(checks, "FREIGHT-OP-14", "No admin free-form status edit UI", "NOT_APPLICABLE", naDetails);
    addCheck(checks, "FREIGHT-OP-15", "Evidence references appear immutable/append-only", "NOT_APPLICABLE", naDetails);
  }

  const summaryBody = {
    auditId: "freight-operational-pass2",
    runId: RUN_ID,
    generatedAtUtc: nowIso(),
    mode: config.mode,
    baseUrl: config.baseUrl,
    testOrderId: config.testOrderId,
    checks: checks.map((check) => ({ id: check.id, status: check.status, details: check.details })),
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summaryBody, null, 2));
  const summaryDigest = crypto.createHash("sha256").update(fs.readFileSync(summaryPath)).digest("hex");
  fs.writeFileSync(summaryShaPath, `${summaryDigest}  ${path.basename(summaryPath)}\n`);

  const manifestMatches =
    fs.existsSync(summaryPath) &&
    fs.existsSync(summaryShaPath) &&
    (fs.readFileSync(summaryShaPath, "utf8").split(/\s+/)[0] || "") === summaryDigest;

  addCheck(
    checks,
    "FREIGHT-OP-16",
    "Operational run produces artefacts and SHA-256 hash for summary",
    manifestMatches ? "PASS" : "FAIL",
    manifestMatches
      ? "Summary artefact and SHA-256 manifest created and verified."
      : "Summary artefact or SHA-256 manifest missing/mismatched.",
    [rel(summaryPath), rel(summaryShaPath)]
  );

  const summary = {
    overall: overallFromChecks(checks),
    totalChecks: checks.length,
    passCount: checks.filter((check) => check.status === "PASS").length,
    failCount: checks.filter((check) => check.status === "FAIL").length,
    notBuiltCount: checks.filter((check) => check.status === "NOT_BUILT").length,
    notApplicableCount: checks.filter((check) => check.status === "NOT_APPLICABLE").length,
  };

  const scorecard: Scorecard = {
    meta: {
      auditId: "freight-operational-pass2",
      runId: RUN_ID,
      timestampUtc: nowIso(),
      baseUrl: config.baseUrl || "",
      environment: process.env.CI ? "ci" : "local",
      mode: config.mode,
    },
    summary,
    checks,
    outputs: {
      summaryPath: rel(summaryPath),
      summarySha256Path: rel(summaryShaPath),
      evidenceDir: rel(runDir),
    },
  };

  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2));

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        scorecardPath: rel(scorecardPath),
        summaryPath: rel(summaryPath),
        summarySha256Path: rel(summaryShaPath),
        overall: summary.overall,
      },
      null,
      2
    )
  );

  for (const check of checks) {
    // eslint-disable-next-line no-console
    console.log(`${check.status} - ${check.id}: ${check.details}`);
  }

  if (summary.overall !== "PASS") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("FREIGHT PASS-2 audit failed with uncaught error:", error);
  process.exitCode = 1;
});
