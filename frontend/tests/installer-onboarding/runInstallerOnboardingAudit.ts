import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, type Page } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const RUN_ID = `${new Date().toISOString().replace(/\W/g, "")}--${crypto.randomBytes(4).toString("hex")}`;

type CheckStatus = "PASS" | "FAIL" | "NOT_BUILT" | "NOT_APPLICABLE";

type CheckEvidence = {
  screenshots: string[];
  htmlSnapshots: string[];
};

type Check = {
  id: string;
  title: string;
  status: CheckStatus;
  details?: string;
  evidence?: CheckEvidence;
};

const checks: Check[] = [];
const CHECK_ORDER = [
  "INSTALLER-01",
  "INSTALLER-02",
  "INSTALLER-03",
  "INSTALLER-04",
  "INSTALLER-05",
  "INSTALLER-06",
  "INSTALLER-07",
  "INSTALLER-08",
] as const;
const CHECK_TITLES: Record<(typeof CHECK_ORDER)[number], string> = {
  "INSTALLER-01": "Public entry exposes installer onboarding start",
  "INSTALLER-02": "Account creation/sign-in yields onboarding workspace access",
  "INSTALLER-03": "Terms gating is enforced before submission",
  "INSTALLER-04": "Licence/accreditation verification response is deterministic",
  "INSTALLER-05": "Required-field gating blocks incomplete onboarding",
  "INSTALLER-06": "Evidence upload rules are enforced (PDF-only, required artefacts)",
  "INSTALLER-07": "Final submission transitions state and locks editing",
  "INSTALLER-08": "Admin review produces Reviewed outcome and (if approved) activation gates access",
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolveRepoRoot() {
  const cwd = process.cwd();
  const hasFrontendPackage = fs.existsSync(path.join(cwd, "package.json")) && fs.existsSync(path.join(cwd, "app"));
  return hasFrontendPackage ? path.resolve(cwd, "..") : cwd;
}

const ROOT_DIR = resolveRepoRoot();
const OUT_DIR = path.join(ROOT_DIR, "artefacts", "installer-audit");
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots", RUN_ID);

const SCORECARD_PATH = path.join(OUT_DIR, `scorecard.installer-onboarding.${RUN_ID}.json`);
const PDF_PATH = path.join(OUT_DIR, `summary.installer-onboarding.${RUN_ID}.pdf`);
const PDF_SHA256_PATH = path.join(OUT_DIR, `summary.installer-onboarding.${RUN_ID}.sha256`);

function relFromRepo(absPath: string) {
  return path.relative(ROOT_DIR, absPath).replace(/\\/g, "/");
}

function addCheck(id: string, title: string, status: CheckStatus, details = "", evidence?: CheckEvidence) {
  checks.push({ id, title, status, details, evidence });
  // eslint-disable-next-line no-console
  console.log(`${status} - ${id}: ${title}${details ? ` (${details})` : ""}`);
}

async function seedStorage(page: Page, seed: Record<string, unknown>) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((payload) => {
    window.localStorage.clear();
    Object.entries(payload).forEach(([key, value]) => {
      window.localStorage.setItem(`rre-v1:${key}`, JSON.stringify(value));
    });
  }, seed);
  // Next.js dev can keep network busy (HMR), so "networkidle" is brittle here.
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function assertVisible(page: Page, text: string) {
  const locator = page.getByText(text, { exact: false });
  await locator.first().waitFor({ timeout: 10_000 });
}

async function isInstallerPhaseDisabled(page: Page) {
  const message = "Set NEXT_PUBLIC_INSTALLER_PHASE=on to enable installer onboarding.";
  try {
    return await page.getByText(message, { exact: false }).first().isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

async function redactForEvidence(page: Page) {
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
    for (const input of inputs) {
      const type = (input.getAttribute("type") || "").toLowerCase();
      if (["checkbox", "radio", "file", "hidden", "submit", "button"].includes(type)) continue;
      try {
        input.value = "";
      } catch {
        // ignore
      }
    }
    const areas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
    for (const area of areas) {
      try {
        area.value = "";
      } catch {
        // ignore
      }
    }

    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const phoneRe = /\\+?\\d[\\d\\s().-]{7,}\\d/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    // eslint-disable-next-line no-cond-assign
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const value = node.nodeValue || "";
      if (!value) continue;
      if (emailRe.test(value) || phoneRe.test(value)) {
        node.nodeValue = "[REDACTED]";
      }
    }
  });
}

async function captureScreenshot(page: Page, checkId: string) {
  ensureDir(SCREENSHOT_DIR);
  await redactForEvidence(page);
  const absPath = path.join(SCREENSHOT_DIR, `${checkId}.png`);
  await page.screenshot({ path: absPath, fullPage: true });
  return relFromRepo(absPath);
}

function buildServicePartnerComplianceProfile(partnerId: string, overrides: Partial<any> = {}) {
  const now = new Date().toISOString();
  const base = {
    partnerId,
    status: "DRAFT",
    updatedAt: now,
    changeRequestNote: "",
    changeRequestedAt: "",
    unlockedSections: [],
    adminReviewNotes: "",
    identity: {
      legalName: "RRE Audit Partner",
      tradingName: "",
      businessType: "Private certifier",
      registrationNumber: `REG-${RUN_ID}`,
      country: "AU",
      address: "1 Audit Street",
      contactName: "REDACTED",
      contactEmail: "REDACTED",
      contactPhone: "REDACTED",
      jurisdictions: "AU",
    },
    accreditation: {
      body: "CEC",
      licenceNumber: `LIC-${RUN_ID}`,
      certificationTypes: ["installation"],
      standards: "AS/NZS 5033",
      issueDate: "2025-01-01",
      expiryDate: "2030-01-01",
      scopeLimitations: "",
      accreditationCertFile: "service-partner/accreditation/cert.pdf",
      scopeDocFile: "service-partner/accreditation/scope.pdf",
      regulatorLetterFile: "",
    },
    capabilities: {
      canIssueCertificates: false,
      canInspect: true,
      canReviewReports: false,
      canReject: false,
      canConditionalApprove: false,
      canMandateRemediation: false,
      remoteInspections: false,
      remoteMethodology: "N/A",
      turnaroundDays: "10",
    },
    personnel: {
      responsibleOfficer: "REDACTED",
      technicalLead: "REDACTED",
      inspectorCount: "1",
      licenceNumbers: "",
      licenceExpiries: "",
      licenceFiles: [],
    },
    conflicts: {
      declarations: {
        independentSuppliers: true,
        noFinancialInterest: true,
        noOwnershipLinks: true,
        acceptAuditAccess: true,
        acknowledgePenalties: true,
      },
      conflictDisclosure: "None",
    },
    methodology: {
      inspectionSummary: "Audit",
      issuanceWorkflow: "Audit",
      retentionYears: "7",
      complaintHandling: "N/A",
      processManualFile: "service-partner/methodology/manual.pdf",
      checklistFile: "service-partner/methodology/checklist.pdf",
      sampleCertificateFile: "service-partner/methodology/sample.pdf",
    },
    insurance: {
      insurer: "Audit Insurer",
      policyNumber: "POL-1",
      coverageAmount: "N/A",
      expiryDate: "2030-01-01",
      certificateFile: "service-partner/insurance/cert.pdf",
    },
    security: {
      documentHandling: true,
      dataProtection: true,
      breachProcess: true,
      iso27001: false,
    },
    declarations: {
      accuracyConfirmed: true,
      agreementAccepted: true,
      auditAccessAccepted: true,
      installerServicePartnerTermsAccepted: true,
      installerServicePartnerTermsAcceptedAt: now,
      signatoryName: "REDACTED",
      signatoryTitle: "REDACTED",
      signatureDate: "2026-02-10",
      signature: "REDACTED",
    },
  };
  return { ...base, ...overrides };
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function run() {
  ensureDir(OUT_DIR);

  const installerApplicantId = `installer-audit-${RUN_ID}`;
  const adminId = `audit-admin-${RUN_ID}`;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // INSTALLER-01
    try {
      await page.goto(`${BASE_URL}/service-agents/installers`, { waitUntil: "domcontentloaded" });
      if (await isInstallerPhaseDisabled(page)) {
        addCheck(
          "INSTALLER-01",
          "Public entry exposes installer onboarding start",
          "NOT_APPLICABLE",
          "Installer phase disabled"
        );
      } else {
        await assertVisible(page, "Approved Licensed Installers");
        const cta = page.locator('a[href*="/signin?role=service-partner"]');
        if ((await cta.count()) > 0) {
          addCheck("INSTALLER-01", "Public entry exposes installer onboarding start", "PASS");
        } else {
          const shot = await captureScreenshot(page, "INSTALLER-01");
          addCheck(
            "INSTALLER-01",
            "Public entry exposes installer onboarding start",
            "NOT_BUILT",
            "Onboarding CTA to /signin?role=service-partner not found",
            { screenshots: [shot], htmlSnapshots: [] }
          );
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "INSTALLER-01");
      addCheck(
        "INSTALLER-01",
        "Public entry exposes installer onboarding start",
        "FAIL",
        err?.message || String(err),
        { screenshots: [shot], htmlSnapshots: [] }
      );
    }

    // INSTALLER-02
    try {
      await seedStorage(page, {
        session: { role: "service-partner", userId: installerApplicantId, email: "redacted" },
        servicePartnerComplianceProfiles: [],
      });
      await page.goto(`${BASE_URL}/dashboard/service-partner/compliance`, { waitUntil: "domcontentloaded" });
      if (await isInstallerPhaseDisabled(page)) {
        addCheck(
          "INSTALLER-02",
          "Account creation/sign-in yields onboarding workspace access",
          "NOT_APPLICABLE",
          "Installer phase disabled"
        );
      } else if (page.url().includes("/signin")) {
        const shot = await captureScreenshot(page, "INSTALLER-02");
        addCheck(
          "INSTALLER-02",
          "Account creation/sign-in yields onboarding workspace access",
          "FAIL",
          `Redirected to ${page.url()}`,
          { screenshots: [shot], htmlSnapshots: [] }
        );
      } else {
        await assertVisible(page, "Onboarding progress");
        addCheck("INSTALLER-02", "Account creation/sign-in yields onboarding workspace access", "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "INSTALLER-02");
      addCheck(
        "INSTALLER-02",
        "Account creation/sign-in yields onboarding workspace access",
        "FAIL",
        err?.message || String(err),
        { screenshots: [shot], htmlSnapshots: [] }
      );
    }

    // INSTALLER-03
    try {
      const termsHref = "/documents/core-legal-consumer/installer-service-partner-terms";
      const termsMissingLabel = "Installer / Service Partner Terms acceptance";
      const installerTermsApplicantId = `${installerApplicantId}-terms`;
      const profileWithoutTerms = buildServicePartnerComplianceProfile(installerTermsApplicantId, {
        declarations: {
          accuracyConfirmed: true,
          agreementAccepted: true,
          auditAccessAccepted: true,
          installerServicePartnerTermsAccepted: false,
          installerServicePartnerTermsAcceptedAt: "",
          signatoryName: "REDACTED",
          signatoryTitle: "REDACTED",
          signatureDate: "2026-02-10",
          signature: "REDACTED",
        },
      });

      await seedStorage(page, {
        session: { role: "service-partner", userId: installerTermsApplicantId, email: "redacted" },
        servicePartnerComplianceProfiles: [profileWithoutTerms],
      });
      await page.goto(`${BASE_URL}/dashboard/service-partner/compliance`, { waitUntil: "domcontentloaded" });
      if (await isInstallerPhaseDisabled(page)) {
        addCheck(
          "INSTALLER-03",
          "Terms gating is enforced before submission",
          "NOT_APPLICABLE",
          "Installer phase disabled"
        );
      } else {
        await page.getByRole("button", { name: /Legal declarations/i }).click();
        const termsLink = page.locator(`main a[href="${termsHref}"]`).first();
        if ((await termsLink.count()) === 0) {
          const shot = await captureScreenshot(page, "INSTALLER-03");
          addCheck(
            "INSTALLER-03",
            "Terms gating is enforced before submission",
            "NOT_BUILT",
            "No installer/service-partner terms acknowledgement/link found within onboarding workspace",
            { screenshots: [shot], htmlSnapshots: [] }
          );
        } else {
          const termsPage = await fetch(`${BASE_URL}${termsHref}`);
          if (termsPage.status === 404) {
            const shot = await captureScreenshot(page, "INSTALLER-03");
            addCheck(
              "INSTALLER-03",
              "Terms gating is enforced before submission",
              "FAIL",
              `Terms link resolves to 404 at ${termsHref}`,
              { screenshots: [shot], htmlSnapshots: [] }
            );
          } else {
            await page.getByRole("button", { name: "Submit for review" }).click();
            await assertVisible(page, "Missing required items");
            const blockedByTerms = await page
              .getByText(termsMissingLabel, { exact: false })
              .first()
              .isVisible({ timeout: 2000 })
              .catch(() => false);
            if (!blockedByTerms) {
              const shot = await captureScreenshot(page, "INSTALLER-03");
              addCheck(
                "INSTALLER-03",
                "Terms gating is enforced before submission",
                "FAIL",
                "Submission was not blocked by installer/service-partner terms acknowledgement",
                { screenshots: [shot], htmlSnapshots: [] }
              );
            } else {
              const termsCheckbox = page.getByLabel("I acknowledge and accept the Installer / Service Partner Terms.");
              if (!(await termsCheckbox.isChecked())) {
                await termsCheckbox.check();
              }
              await page.getByRole("button", { name: "Save draft" }).click();
              await page.reload({ waitUntil: "domcontentloaded" });
              await page.getByRole("button", { name: /Legal declarations/i }).click();

              const persistedAfterReload = await termsCheckbox.isChecked().catch(() => false);
              if (!persistedAfterReload) {
                const shot = await captureScreenshot(page, "INSTALLER-03");
                addCheck(
                  "INSTALLER-03",
                  "Terms gating is enforced before submission",
                  "FAIL",
                  "Terms acknowledgement did not persist after reload",
                  { screenshots: [shot], htmlSnapshots: [] }
                );
              } else {
                addCheck("INSTALLER-03", "Terms gating is enforced before submission", "PASS");
              }
            }
          }
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "INSTALLER-03");
      addCheck(
        "INSTALLER-03",
        "Terms gating is enforced before submission",
        "FAIL",
        err?.message || String(err),
        { screenshots: [shot], htmlSnapshots: [] }
      );
    }

    // INSTALLER-04
    try {
      const expiryError = "Accreditation expiry date must be today or later.";
      const expiredProfile = buildServicePartnerComplianceProfile(installerApplicantId, {
        accreditation: {
          body: "CEC",
          licenceNumber: `LIC-${RUN_ID}`,
          certificationTypes: ["installation"],
          standards: "AS/NZS 5033",
          issueDate: "2020-01-01",
          expiryDate: "2000-01-01",
          scopeLimitations: "",
          accreditationCertFile: "service-partner/accreditation/cert.pdf",
          scopeDocFile: "service-partner/accreditation/scope.pdf",
          regulatorLetterFile: "",
        },
      });

      await seedStorage(page, {
        session: { role: "service-partner", userId: installerApplicantId, email: "redacted" },
        servicePartnerComplianceProfiles: [expiredProfile],
      });
      await page.goto(`${BASE_URL}/dashboard/service-partner/compliance`, { waitUntil: "domcontentloaded" });
      if (await isInstallerPhaseDisabled(page)) {
        addCheck(
          "INSTALLER-04",
          "Licence/accreditation verification response is deterministic",
          "NOT_APPLICABLE",
          "Installer phase disabled"
        );
      } else {
        await page.getByRole("button", { name: /Authority & scope/i }).click();
        await assertVisible(page, "Accreditation authority & scope");
        await page.getByRole("button", { name: "Save & continue" }).click();
        const missingItemsVisible = await page
          .getByText("Missing required items", { exact: false })
          .first()
          .isVisible({ timeout: 4000 })
          .catch(() => false);
        const expiryErrorVisible = await page
          .getByText(expiryError, { exact: false })
          .first()
          .isVisible({ timeout: 4000 })
          .catch(() => false);
        const progressedToNextStep = await page
          .getByText("Capabilities matrix", { exact: false })
          .first()
          .isVisible({ timeout: 1500 })
          .catch(() => false);

        if (missingItemsVisible && expiryErrorVisible && !progressedToNextStep) {
          addCheck(
            "INSTALLER-04",
            "Licence/accreditation verification response is deterministic",
            "PASS"
          );
        } else {
          const shot = await captureScreenshot(page, "INSTALLER-04");
          addCheck(
            "INSTALLER-04",
            "Licence/accreditation verification response is deterministic",
            "FAIL",
            "Expired accreditation date was not deterministically blocked by expiry validation",
            { screenshots: [shot], htmlSnapshots: [] }
          );
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "INSTALLER-04");
      addCheck(
        "INSTALLER-04",
        "Licence/accreditation verification response is deterministic",
        "FAIL",
        err?.message || String(err),
        { screenshots: [shot], htmlSnapshots: [] }
      );
    }

    // INSTALLER-05
    try {
      await seedStorage(page, {
        session: { role: "service-partner", userId: installerApplicantId, email: "redacted" },
        servicePartnerComplianceProfiles: [],
      });
      await page.goto(`${BASE_URL}/dashboard/service-partner/compliance`, { waitUntil: "domcontentloaded" });
      if (await isInstallerPhaseDisabled(page)) {
        addCheck(
          "INSTALLER-05",
          "Required-field gating blocks incomplete onboarding",
          "NOT_APPLICABLE",
          "Installer phase disabled"
        );
      } else {
        await assertVisible(page, "Company identity");
        await page.getByRole("button", { name: "Save & continue" }).click();
        await assertVisible(page, "Missing required items");
        addCheck("INSTALLER-05", "Required-field gating blocks incomplete onboarding", "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "INSTALLER-05");
      addCheck(
        "INSTALLER-05",
        "Required-field gating blocks incomplete onboarding",
        "FAIL",
        err?.message || String(err),
        { screenshots: [shot], htmlSnapshots: [] }
      );
    }

    // INSTALLER-06
    try {
      // UI: non-PDF rejected
      await seedStorage(page, {
        session: { role: "service-partner", userId: installerApplicantId, email: "redacted" },
        servicePartnerComplianceProfiles: [],
      });
      await page.goto(`${BASE_URL}/dashboard/service-partner/compliance`, { waitUntil: "domcontentloaded" });
      if (await isInstallerPhaseDisabled(page)) {
        addCheck(
          "INSTALLER-06",
          "Evidence upload rules are enforced (PDF-only, required artefacts)",
          "NOT_APPLICABLE",
          "Installer phase disabled"
        );
      } else {
        await page.getByRole("button", { name: /Authority & scope/i }).click();
        const fileField = page.locator("label", { hasText: "Accreditation certificate (PDF)" }).first();
        const fileInput = fileField.locator("..").locator('input[type="file"]');
        await fileInput.setInputFiles({
          name: "not-a-pdf.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not a pdf"),
        });
        await assertVisible(page, "PDF files only.");

        // API: presign enforces MIME + extension, then upload -> download URL resolves.
        const presignUrl = `${BASE_URL}/api/service-partner/compliance/presign`;
        const invalidExt = await postJson(presignUrl, {
          fileName: "audit.txt",
          fileType: "application/pdf",
          fileSize: 64,
          kind: "installer-audit",
        });
        if (invalidExt.res.ok) {
          const shot = await captureScreenshot(page, "INSTALLER-06");
          addCheck(
            "INSTALLER-06",
            "Evidence upload rules are enforced (PDF-only, required artefacts)",
            "FAIL",
            "Presign accepted invalid file extension",
            { screenshots: [shot], htmlSnapshots: [] }
          );
        } else {
          const invalidMime = await postJson(presignUrl, {
            fileName: "audit.pdf",
            fileType: "text/plain",
            fileSize: 64,
            kind: "installer-audit",
          });
          if (invalidMime.res.ok) {
            const shot = await captureScreenshot(page, "INSTALLER-06");
            addCheck(
              "INSTALLER-06",
              "Evidence upload rules are enforced (PDF-only, required artefacts)",
              "FAIL",
              "Presign accepted invalid MIME type",
              { screenshots: [shot], htmlSnapshots: [] }
            );
          } else {
            const { res: presignRes, json: presign } = await postJson(presignUrl, {
              fileName: "audit.pdf",
              fileType: "application/pdf",
              fileSize: 64,
              kind: "installer-audit",
            });

            if (presignRes.status === 404) {
              const shot = await captureScreenshot(page, "INSTALLER-06");
              addCheck(
                "INSTALLER-06",
                "Evidence upload rules are enforced (PDF-only, required artefacts)",
                "NOT_BUILT",
                "Presign endpoint not found",
                { screenshots: [shot], htmlSnapshots: [] }
              );
            } else if (!presignRes.ok) {
              const shot = await captureScreenshot(page, "INSTALLER-06");
              addCheck(
                "INSTALLER-06",
                "Evidence upload rules are enforced (PDF-only, required artefacts)",
                "FAIL",
                String(presign?.error || "Presign failed"),
                { screenshots: [shot], htmlSnapshots: [] }
              );
            } else {
              const uploadUrl = String(presign.uploadUrl || "");
              const uploadTarget = uploadUrl.startsWith("/") ? `${BASE_URL}${uploadUrl}` : uploadUrl;
              const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
              const uploadRes = await fetch(uploadTarget, {
                method: "PUT",
                headers: presign.headers || { "Content-Type": "application/pdf" },
                body: pdfBytes,
              });
              if (!uploadRes.ok) {
                const shot = await captureScreenshot(page, "INSTALLER-06");
                addCheck(
                  "INSTALLER-06",
                  "Evidence upload rules are enforced (PDF-only, required artefacts)",
                  "FAIL",
                  `Upload failed (${uploadRes.status})`,
                  { screenshots: [shot], htmlSnapshots: [] }
                );
              } else {
                const storageKey = String(presign.storageKey || "");
                const dlRes = await fetch(
                  `${BASE_URL}/api/service-partner/compliance/download?key=${encodeURIComponent(storageKey)}`
                );
                const dlJson = await dlRes.json().catch(() => ({}));
                if (!dlRes.ok || !dlJson.url) {
                  const shot = await captureScreenshot(page, "INSTALLER-06");
                  addCheck(
                    "INSTALLER-06",
                    "Evidence upload rules are enforced (PDF-only, required artefacts)",
                    "FAIL",
                    String(dlJson?.error || `Download URL not available (${dlRes.status})`),
                    { screenshots: [shot], htmlSnapshots: [] }
                  );
                } else {
                  const url = String(dlJson.url);
                  const target = url.startsWith("/") ? `${BASE_URL}${url}` : url;
                  const fetched = await fetch(target);
                  if (!fetched.ok) {
                    const shot = await captureScreenshot(page, "INSTALLER-06");
                    addCheck(
                      "INSTALLER-06",
                      "Evidence upload rules are enforced (PDF-only, required artefacts)",
                      "FAIL",
                      `Uploaded file download not accessible (${fetched.status})`,
                      { screenshots: [shot], htmlSnapshots: [] }
                    );
                  } else {
                    addCheck(
                      "INSTALLER-06",
                      "Evidence upload rules are enforced (PDF-only, required artefacts)",
                      "PASS"
                    );
                  }
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "INSTALLER-06");
      addCheck(
        "INSTALLER-06",
        "Evidence upload rules are enforced (PDF-only, required artefacts)",
        "FAIL",
        err?.message || String(err),
        { screenshots: [shot], htmlSnapshots: [] }
      );
    }

    // INSTALLER-07
    try {
      const complete = buildServicePartnerComplianceProfile(installerApplicantId);
      await seedStorage(page, {
        session: { role: "service-partner", userId: installerApplicantId, email: "redacted" },
        servicePartnerComplianceProfiles: [complete],
      });
      await page.goto(`${BASE_URL}/dashboard/service-partner/compliance`, { waitUntil: "domcontentloaded" });
      if (await isInstallerPhaseDisabled(page)) {
        addCheck(
          "INSTALLER-07",
          "Final submission transitions state and locks editing",
          "NOT_APPLICABLE",
          "Installer phase disabled"
        );
      } else {
        await page.getByRole("button", { name: /Legal declarations/i }).click();
        const submit = page.getByRole("button", { name: "Submit for review" });
        if ((await submit.count()) === 0) {
          const shot = await captureScreenshot(page, "INSTALLER-07");
          addCheck(
            "INSTALLER-07",
            "Final submission transitions state and locks editing",
            "NOT_BUILT",
            "Submit action not present",
            { screenshots: [shot], htmlSnapshots: [] }
          );
        } else {
          await submit.first().click();
          try {
            await assertVisible(page, "Submitted for review. Fields are locked pending admin decision.");
            await assertVisible(page, "Read-only mode");
            const mutationAttempt = await postJson(`${BASE_URL}/api/service-partner/compliance/profile`, {
              ...complete,
              status: "DRAFT",
              identity: { ...complete.identity, legalName: "Mutated After Submit" },
            });
            if (mutationAttempt.res.status !== 409) {
              const shot = await captureScreenshot(page, "INSTALLER-07");
              addCheck(
                "INSTALLER-07",
                "Final submission transitions state and locks editing",
                "FAIL",
                "Server accepted profile mutation after SUBMITTED status",
                { screenshots: [shot], htmlSnapshots: [] }
              );
            } else {
              const logsRes = await fetch(
                `${BASE_URL}/api/admin/service-partners/audit?partnerId=${encodeURIComponent(installerApplicantId)}&limit=20`,
                {
                  headers: {
                    "x-dev-admin": "1",
                    "x-dev-admin-user": adminId,
                    "x-dev-admin-email": "redacted",
                  },
                }
              );
              const logsJson = await logsRes.json().catch(() => ({}));
              const logs = Array.isArray(logsJson?.logs) ? logsJson.logs : [];
              const hasSubmissionLog = logs.some(
                (log: any) =>
                  log?.action === "SERVICE_PARTNER_SUBMITTED" &&
                  log?.targetId === installerApplicantId &&
                  log?.actorId === installerApplicantId
              );
              if (!logsRes.ok || !hasSubmissionLog) {
                const shot = await captureScreenshot(page, "INSTALLER-07");
                addCheck(
                  "INSTALLER-07",
                  "Final submission transitions state and locks editing",
                  "FAIL",
                  "Submission audit record missing or not attributable",
                  { screenshots: [shot], htmlSnapshots: [] }
                );
              } else {
                addCheck("INSTALLER-07", "Final submission transitions state and locks editing", "PASS");
              }
            }
          } catch (e: any) {
            const shot = await captureScreenshot(page, "INSTALLER-07");
            addCheck(
              "INSTALLER-07",
              "Final submission transitions state and locks editing",
              "FAIL",
              "Submission did not complete successfully (likely backend persistence dependency)",
              { screenshots: [shot], htmlSnapshots: [] }
            );
          }
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "INSTALLER-07");
      addCheck(
        "INSTALLER-07",
        "Final submission transitions state and locks editing",
        "FAIL",
        err?.message || String(err),
        { screenshots: [shot], htmlSnapshots: [] }
      );
    }

    // INSTALLER-08
    try {
      const reviewChecklist = {
        identityVerified: true,
        accreditationVerified: true,
        insuranceVerified: true,
        conflictsReviewed: true,
        methodologyReviewed: true,
      };
      const adminHeaders = {
        "x-dev-admin": "1",
        "x-dev-admin-user": adminId,
        "x-dev-admin-email": "redacted",
      };

      // Gate check: non-active applicant cannot unlock interest board requests.
      const draftProfile = buildServicePartnerComplianceProfile(installerApplicantId, { status: "DRAFT" });
      await seedStorage(page, {
        session: { role: "service-partner", userId: installerApplicantId, email: "redacted" },
        servicePartnerComplianceProfiles: [draftProfile],
      });
      await page.goto(`${BASE_URL}/dashboard/service-partner/interest-board`, { waitUntil: "domcontentloaded" });
      await assertVisible(page, "Complete accreditation to unlock requests");

      // Admin review surfaces (service-partner substrate).
      await seedStorage(page, {
        session: { role: "admin", userId: adminId, email: "redacted" },
      });
      await page.goto(`${BASE_URL}/dashboard/admin/service-partners`, { waitUntil: "domcontentloaded" });
      await assertVisible(page, "Accreditation review queue");

      const listRes = await fetch(`${BASE_URL}/api/admin/service-partners`, {
        headers: adminHeaders,
      });
      const listJson = await listRes.json().catch(() => ({}));
      const profiles = Array.isArray(listJson?.profiles) ? listJson.profiles : [];
      const submissionInQueue = profiles.some((profile: any) => profile?.partnerId === installerApplicantId);
      if (!listRes.ok || !submissionInQueue) {
        const shot = await captureScreenshot(page, "INSTALLER-08");
        addCheck(
          "INSTALLER-08",
          "Admin review produces Reviewed outcome and (if approved) activation gates access",
          "FAIL",
          "Submitted installer profile not visible in admin review queue",
          { screenshots: [shot], htmlSnapshots: [] }
        );
      } else {
        const detailRes = await fetch(`${BASE_URL}/api/admin/service-partners/${encodeURIComponent(installerApplicantId)}`, {
          headers: adminHeaders,
        });
        const detailJson = await detailRes.json().catch(() => ({}));
        const detailProfile = detailJson?.profile;
        if (!detailRes.ok || !detailProfile || detailProfile.partnerId !== installerApplicantId) {
          const shot = await captureScreenshot(page, "INSTALLER-08");
          addCheck(
            "INSTALLER-08",
            "Admin review produces Reviewed outcome and (if approved) activation gates access",
            "FAIL",
            "Admin review detail did not resolve to submitted installer profile",
            { screenshots: [shot], htmlSnapshots: [] }
          );
        } else {
          // Activation must be gated behind APPROVED.
          const preActiveRes = await fetch(`${BASE_URL}/api/admin/service-partners/decision`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...adminHeaders },
            body: JSON.stringify({
              partnerId: installerApplicantId,
              status: "ACTIVE",
              reasonCode: "APPROVE_COMPLIANT",
              checklist: reviewChecklist,
              actorId: adminId,
            }),
          });
          const preActiveJson = await preActiveRes.json().catch(() => ({}));
          if (preActiveRes.status !== 400) {
            const shot = await captureScreenshot(page, "INSTALLER-08");
            addCheck(
              "INSTALLER-08",
              "Admin review produces Reviewed outcome and (if approved) activation gates access",
              "FAIL",
              "Activation was allowed before APPROVED state",
              { screenshots: [shot], htmlSnapshots: [] }
            );
          } else {
            const approveRes = await fetch(`${BASE_URL}/api/admin/service-partners/decision`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...adminHeaders },
              body: JSON.stringify({
                partnerId: installerApplicantId,
                status: "APPROVED",
                reasonCode: "APPROVE_COMPLIANT",
                checklist: reviewChecklist,
                actorId: adminId,
              }),
            });
            const approveJson = await approveRes.json().catch(() => ({}));
            if (!approveRes.ok) {
              const shot = await captureScreenshot(page, "INSTALLER-08");
              addCheck(
                "INSTALLER-08",
                "Admin review produces Reviewed outcome and (if approved) activation gates access",
                "FAIL",
                String(approveJson?.error || "Approval decision failed"),
                { screenshots: [shot], htmlSnapshots: [] }
              );
            } else {
              const logsRes = await fetch(
                `${BASE_URL}/api/admin/service-partners/audit?partnerId=${encodeURIComponent(installerApplicantId)}&limit=30`,
                { headers: adminHeaders }
              );
              const logsJson = await logsRes.json().catch(() => ({}));
              const logs = Array.isArray(logsJson?.logs) ? logsJson.logs : [];
              const hasApprovedDecisionLog = logs.some(
                (log: any) =>
                  log?.action === "SERVICE_PARTNER_DECISION" &&
                  log?.targetId === installerApplicantId &&
                  log?.reasonCode === "APPROVE_COMPLIANT" &&
                  log?.metadata?.status === "APPROVED"
              );
              if (!logsRes.ok || !hasApprovedDecisionLog) {
                const shot = await captureScreenshot(page, "INSTALLER-08");
                addCheck(
                  "INSTALLER-08",
                  "Admin review produces Reviewed outcome and (if approved) activation gates access",
                  "FAIL",
                  "Approved decision audit log missing",
                  { screenshots: [shot], htmlSnapshots: [] }
                );
              } else {
                // Approved is still non-active and must remain locked.
                const approvedProfile = buildServicePartnerComplianceProfile(installerApplicantId, { status: "APPROVED" });
                await seedStorage(page, {
                  session: { role: "service-partner", userId: installerApplicantId, email: "redacted" },
                  servicePartnerComplianceProfiles: [approvedProfile],
                });
                await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
                await page.goto(`${BASE_URL}/dashboard/service-partner/interest-board`, { waitUntil: "domcontentloaded" });
                // Ensure route-level shell rendered before asserting lock copy.
                await assertVisible(page, "Certification Interest Board");
                const lockedAsApproved = await page
                  .getByText("Your status is currently APPROVED. Only ACTIVE compliance partners can express interest.", {
                    exact: false,
                  })
                  .first()
                  .isVisible({ timeout: 15_000 })
                  .catch(() => false);
                if (!lockedAsApproved) {
                  const shot = await captureScreenshot(page, "INSTALLER-08");
                  addCheck(
                    "INSTALLER-08",
                    "Admin review produces Reviewed outcome and (if approved) activation gates access",
                    "FAIL",
                    "APPROVED profile incorrectly gained ACTIVE access",
                    { screenshots: [shot], htmlSnapshots: [] }
                  );
                } else {
                  const activateRes = await fetch(`${BASE_URL}/api/admin/service-partners/decision`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...adminHeaders },
                    body: JSON.stringify({
                      partnerId: installerApplicantId,
                      status: "ACTIVE",
                      reasonCode: "APPROVE_WITH_MONITORING",
                      checklist: reviewChecklist,
                      actorId: adminId,
                    }),
                  });
                  const activateJson = await activateRes.json().catch(() => ({}));
                  if (!activateRes.ok) {
                    const shot = await captureScreenshot(page, "INSTALLER-08");
                    addCheck(
                      "INSTALLER-08",
                      "Admin review produces Reviewed outcome and (if approved) activation gates access",
                      "FAIL",
                      String(activateJson?.error || "Activation decision failed"),
                      { screenshots: [shot], htmlSnapshots: [] }
                    );
                  } else {
                    const activeProfile = buildServicePartnerComplianceProfile(installerApplicantId, { status: "ACTIVE" });
                    await seedStorage(page, {
                      session: { role: "service-partner", userId: installerApplicantId, email: "redacted" },
                      servicePartnerComplianceProfiles: [activeProfile],
                    });
                    await page.goto(`${BASE_URL}/dashboard/service-partner/interest-board`, {
                      waitUntil: "domcontentloaded",
                    });
                    const stillLocked = await page
                      .getByText("Complete accreditation to unlock requests", { exact: false })
                      .first()
                      .isVisible({ timeout: 3_000 })
                      .catch(() => false);
                    if (stillLocked || preActiveJson?.error !== "Profile must be APPROVED before activation.") {
                      const shot = await captureScreenshot(page, "INSTALLER-08");
                      addCheck(
                        "INSTALLER-08",
                        "Admin review produces Reviewed outcome and (if approved) activation gates access",
                        "FAIL",
                        "Activation gating did not behave deterministically",
                        { screenshots: [shot], htmlSnapshots: [] }
                      );
                    } else {
                      addCheck(
                        "INSTALLER-08",
                        "Admin review produces Reviewed outcome and (if approved) activation gates access",
                        "PASS"
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "INSTALLER-08");
      addCheck(
        "INSTALLER-08",
        "Admin review produces Reviewed outcome and (if approved) activation gates access",
        "FAIL",
        err?.message || String(err),
        { screenshots: [shot], htmlSnapshots: [] }
      );
    }
  } finally {
    // Render PDF summary via deterministic HTML route (always attempt)
    const checkById = new Map<string, Check>();
    for (const check of checks) {
      if (!checkById.has(check.id)) checkById.set(check.id, check);
    }
    const orderedChecks = CHECK_ORDER.map((id) => {
      const check = checkById.get(id);
      if (!check) {
        return {
          id,
          title: CHECK_TITLES[id],
          status: "FAIL" as const,
          details: "Check did not execute.",
          evidence: {
            screenshots: [],
            notes: "",
          },
        };
      }
      return {
        id: check.id,
        title: check.title || CHECK_TITLES[id],
        status: check.status,
        details: check.details || "",
        evidence: {
          screenshots: check.evidence?.screenshots ?? [],
          notes: "",
        },
      };
    });

    const summaryCounts = orderedChecks.reduce(
      (acc, check) => {
        acc.totalChecks += 1;
        if (check.status === "PASS") acc.pass += 1;
        if (check.status === "FAIL") acc.fail += 1;
        if (check.status === "NOT_BUILT") acc.notBuilt += 1;
        if (check.status === "NOT_APPLICABLE") acc.notApplicable += 1;
        return acc;
      },
      { totalChecks: 0, pass: 0, fail: 0, notBuilt: 0, notApplicable: 0 }
    );

    const overall: "PASS" | "FAIL" = summaryCounts.fail > 0 ? "FAIL" : "PASS";
    const scorecard = {
      meta: {
        auditId: "installer-onboarding",
        runId: RUN_ID,
        timestampUtc: new Date().toISOString(),
        baseUrl: BASE_URL,
        environment: process.env.AUDIT_ENV || "local",
      },
      summary: {
        overall,
        totalChecks: CHECK_ORDER.length,
        passCount: summaryCounts.pass,
        failCount: summaryCounts.fail,
        notBuiltCount: summaryCounts.notBuilt,
        notApplicableCount: summaryCounts.notApplicable,
      },
      checks: orderedChecks,
      outputs: {
        pdfPath: relFromRepo(PDF_PATH),
        pdfSha256Path: relFromRepo(PDF_SHA256_PATH),
      },
    };

    ensureDir(OUT_DIR);
    fs.writeFileSync(SCORECARD_PATH, JSON.stringify(scorecard, null, 2));
    // eslint-disable-next-line no-console
    console.log(`Scorecard written: ${SCORECARD_PATH}`);

    try {
      const pdfPage = await context.newPage();
      await pdfPage.goto(
        `${BASE_URL}/__audit/installer-onboarding/summary?runId=${encodeURIComponent(RUN_ID)}`,
        // Next.js dev can keep network busy (HMR), so "networkidle" is brittle here.
        { waitUntil: "domcontentloaded" }
      );
      await pdfPage.pdf({ path: PDF_PATH, format: "A4", printBackground: true, preferCSSPageSize: true });
      await pdfPage.close();

      const bytes = fs.readFileSync(PDF_PATH);
      const hash = crypto.createHash("sha256").update(bytes).digest("hex");
      fs.writeFileSync(PDF_SHA256_PATH, `${hash}  ${path.basename(PDF_PATH)}\n`);
      // eslint-disable-next-line no-console
      console.log(`PDF written: ${PDF_PATH}`);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("PDF generation failed:", err?.message || String(err));
    }

    await browser.close();

    if (overall === "FAIL") process.exit(1);
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
