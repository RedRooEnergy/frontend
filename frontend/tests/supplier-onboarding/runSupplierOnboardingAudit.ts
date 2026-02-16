import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, type Page } from "playwright";
import { getProductFormSections } from "../../data/productFormSchema";
import { getCertificationRequirements } from "../../data/certificationMatrix";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const RUN_ID = `${new Date().toISOString().replace(/\W/g, "")}--${crypto.randomBytes(4).toString("hex")}`;
const ROOT_DIR = path.resolve(process.cwd(), "..");
const OUT_DIR = path.join(ROOT_DIR, "artifacts", "audit");

const STORAGE_PREFIX = "rre-v1:";

const SCORECARD_PATH = path.join(OUT_DIR, `scorecard.supplier-onboarding.${RUN_ID}.json`);

type CheckStatus = "PASS" | "FAIL" | "NOT_BUILT" | "NOT_APPLICABLE";

type Check = {
  id: string;
  title: string;
  status: CheckStatus;
  details?: string;
};

const checks: Check[] = [];

function addCheck(id: string, title: string, status: CheckStatus, details = "") {
  checks.push({ id, title, status, details });
  // eslint-disable-next-line no-console
  console.log(`${status} - ${id}: ${title}${details ? ` (${details})` : ""}`);
}

function buildSupplierProfile(supplierId: string) {
  const now = new Date().toISOString();
  return {
    supplierId,
    kybLegalName: "RRE Supplier Test",
    beneficiaryName: "RRE Supplier",
    paymentRails: ["stripe"],
    payoutCurrencies: ["AUD"],
    fullPrepaymentRequired: true,
    kybStatus: "pending",
    preferredLanguage: "en",
    createdAt: now,
    updatedAt: now,
  };
}

function buildCompanyProfileIncomplete(supplierId: string, email: string) {
  const now = new Date().toISOString();
  return {
    supplierId,
    identity: {
      legalNameNative: "",
      legalNameEnglish: "",
      tradingName: "",
      brandName: "",
      countryOfIncorporation: "CN",
      legalStructure: "",
      registrationNumber: "",
      incorporationDate: "",
      registeredAddress: { line1: "", city: "", region: "", postalCode: "", country: "CN" },
      operatingAddress: { line1: "", city: "", region: "", postalCode: "", country: "CN" },
      websiteUrl: "",
      officialEmailDomain: "",
      logoAssetId: "",
      descriptionShort: "",
      yearsInOperationRange: "UNKNOWN",
      employeeCountRange: "UNKNOWN",
    },
    contacts: {
      primaryEmail: email,
      primaryMobile: { countryCode: "+86", number: "" },
      preferredLanguage: "en",
      timeZone: "Australia/Brisbane",
    },
    representatives: {
      authorisedRepresentatives: [],
    },
    capability: {
      supplierType: undefined,
      manufacturingModel: undefined,
      factories: [],
      intendedCategoryIds: [],
      preferredCompliancePartnerIds: [],
      oemOdmConfirmed: false,
      privateLabelSupported: false,
    },
    commercial: {
      acceptedZeroCommission: false,
      acceptedServiceFeeStructure: false,
      supportedCurrencies: ["CNY", "AUD"],
      defaultMoq: undefined,
      productionLeadTimeDays: undefined,
      dispatchReadyLeadTimeDays: undefined,
    },
    logistics: {
      incotermsSupported: ["DDP"],
      exporterOfRecord: "UNKNOWN",
      preferredFreightModes: [],
      portOfDeparture: "",
      dangerousGoodsDeclared: false,
      batteryHandlingAcknowledged: false,
      insuranceAcknowledged: false,
      proofOfDeliveryAcknowledged: false,
    },
    payments: {
      settlementMethod: undefined,
      settlementCurrency: undefined,
      bankCountry: undefined,
      beneficiaryLegalName: "",
      bankDetailsRefId: "",
      bankVerificationDocumentId: "",
      bankVerified: false,
    },
    declarations: {
      supplierAgreementAccepted: false,
      complianceTruthDeclared: false,
      antiBriberyDeclared: false,
      sanctionsDeclared: false,
      productLiabilityDeclared: false,
      auditConsentGranted: false,
      privacyAccepted: false,
      jurisdictionAccepted: false,
    },
    governance: {
      status: "DRAFT",
      locked: false,
    },
    auditMeta: {
      schemaVersion: "1.0.0",
      createdAt: now,
      updatedAt: now,
      updatedByRole: "SUPPLIER",
    },
  };
}

function buildCompanyProfileComplete(supplierId: string, email: string) {
  const now = new Date().toISOString();
  const base = buildCompanyProfileIncomplete(supplierId, email);
  return {
    ...base,
    identity: {
      ...base.identity,
      legalNameNative: "红袋能源",
      legalNameEnglish: "RedRoo Energy",
      legalStructure: "Limited",
      registrationNumber: `REG-${RUN_ID}`,
      registeredAddress: {
        line1: "1 Test Road",
        city: "Shenzhen",
        region: "Guangdong",
        postalCode: "518000",
        country: "CN",
      },
      operatingAddress: {
        line1: "1 Test Road",
        city: "Shenzhen",
        region: "Guangdong",
        postalCode: "518000",
        country: "CN",
      },
    },
    contacts: {
      ...base.contacts,
      primaryEmail: email,
      primaryMobile: { countryCode: "+86", number: "13800000000" },
    },
    representatives: {
      authorisedRepresentatives: [
        {
          fullName: "Test Rep",
          title: "Director",
          nationality: "CN",
          email,
          mobile: { countryCode: "+86", number: "13800000000" },
          authorityDocumentId: `AUTH-${RUN_ID}`,
          authorityDeclarationAccepted: true,
          authorityDeclaredAt: now,
        },
      ],
    },
    capability: {
      ...base.capability,
      supplierType: "MANUFACTURER",
      manufacturingModel: "OWN_FACTORY",
      intendedCategoryIds: ["solar-pv-modules"],
      preferredCompliancePartnerIds: ["cp-sgs-au"],
    },
    commercial: {
      ...base.commercial,
      acceptedZeroCommission: true,
      acceptedServiceFeeStructure: true,
    },
    logistics: {
      ...base.logistics,
      insuranceAcknowledged: true,
      proofOfDeliveryAcknowledged: true,
    },
    payments: {
      ...base.payments,
      settlementMethod: "STRIPE_CONNECT",
      settlementCurrency: "AUD",
      bankCountry: "CN",
      beneficiaryLegalName: "RedRoo Energy",
      bankDetailsRefId: `BANK-${RUN_ID}`,
      bankVerificationDocumentId: `BANK-DOC-${RUN_ID}`,
      bankVerified: true,
    },
    declarations: {
      supplierAgreementAccepted: true,
      complianceTruthDeclared: true,
      antiBriberyDeclared: true,
      sanctionsDeclared: true,
      productLiabilityDeclared: true,
      auditConsentGranted: true,
      privacyAccepted: true,
      jurisdictionAccepted: true,
    },
    auditMeta: {
      ...base.auditMeta,
      updatedAt: now,
    },
  };
}

function buildAttributes(categorySlug: string, subCategorySlug: string) {
  const sections = getProductFormSections(categorySlug);
  const attrs: Record<string, string | number | boolean> = {};
  sections.flatMap((section) => section.fields).forEach((field) => {
    if (!field.required || field.readOnly) return;
    if (attrs[field.key] !== undefined) return;
    switch (field.type) {
      case "number":
        attrs[field.key] = 10;
        break;
      case "select":
        attrs[field.key] = field.options?.[0] ?? "N/A";
        break;
      case "boolean":
        attrs[field.key] = true;
        break;
      case "textarea":
      case "text":
        attrs[field.key] = "Test value";
        break;
      case "file":
        attrs[field.key] = "file.pdf";
        break;
      case "date":
        attrs[field.key] = "2025-01-01";
        break;
      default:
        attrs[field.key] = "Test value";
    }
  });

  // Provide category/subcategory for required derived values
  attrs.identity_product_category = categorySlug;
  attrs.identity_product_subcategory = subCategorySlug;

  return attrs;
}

function buildCertifications(required: string[], complete = true) {
  const certs: any = {};
  required.forEach((cert) => {
    const key = cert.toLowerCase();
    certs[key] = complete
      ? {
          fileName: `${cert}-cert.pdf`,
          certificateNumber: `${cert}-${RUN_ID}`,
          issuingBody: "RRE Test Lab",
          expiryDate: "2027-12-31",
        }
      : {};
  });
  return certs;
}

function buildProductRecord(options: {
  id: string;
  supplierId: string;
  categorySlug: string;
  subCategorySlug: string;
  imagesComplete: boolean;
  certsComplete: boolean;
  authorityComplete: boolean;
  partnerReviewStatus?: "not_started" | "pending" | "pass" | "fail";
}) {
  const now = new Date().toISOString();
  const requiredCerts = getCertificationRequirements(options.categorySlug, options.subCategorySlug).required;
  const imageFiles = options.imagesComplete
    ? Array.from({ length: 6 }, (_, idx) => `image-${idx + 1}.jpg`)
    : ["image-1.jpg"];
  return {
    id: options.id,
    supplierId: options.supplierId,
    status: "DRAFT",
    name: `Test Product ${options.id}`,
    categorySlug: options.categorySlug,
    subCategorySlug: options.subCategorySlug,
    attributes: buildAttributes(options.categorySlug, options.subCategorySlug),
    imageFiles,
    certifications: buildCertifications(requiredCerts, options.certsComplete),
    compliancePartnerId: "cp-sgs-au",
    supplierApprovalSigned: options.authorityComplete,
    supplierApprovalName: options.authorityComplete ? "Test Approver" : "",
    partnerReviewStatus: options.partnerReviewStatus ?? "not_started",
    completeness: options.imagesComplete && options.certsComplete ? 90 : 50,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedStorage(page: Page, seed: Record<string, any>) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate((payload) => {
    window.localStorage.clear();
    Object.entries(payload).forEach(([key, value]) => {
      window.localStorage.setItem(`rre-v1:${key}`, JSON.stringify(value));
    });
  }, seed);
  await page.reload({ waitUntil: "networkidle" });
}

async function assertVisible(page: Page, text: string) {
  const locator = page.getByText(text, { exact: false });
  await locator.first().waitFor({ timeout: 10_000 });
}

async function openApprovalSection(page: Page) {
  const tab = page.getByRole("tab", { name: /Supplier Approval & Submission/i });
  await tab.first().click();
}

async function isPhaseDisabled(page: Page) {
  const message = "Set NEXT_PUBLIC_SUPPLIER_PHASE=on to enable supplier workflows.";
  try {
    const locator = page.getByText(message, { exact: false });
    return await locator.first().isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

async function fillByLabel(page: Page, labelText: string, value: string) {
  const label = page.locator("label", { hasText: labelText }).first();
  await label.waitFor({ timeout: 10_000 });
  const input = label.locator("..").locator("input");
  await input.fill(value);
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const supplierId = `supplier-${RUN_ID}`;
  const supplierEmail = `supplier-${RUN_ID}@example.com`;
  const adminSession = { role: "admin", userId: "admin-1", email: "admin@example.com" };
  const supplierSession = { role: "supplier", userId: supplierId, email: supplierEmail };

  const supplierProfile = buildSupplierProfile(supplierId);
  const incompleteProfile = buildCompanyProfileIncomplete(supplierId, supplierEmail);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Supplier onboarding required fields gate
    await seedStorage(page, {
      session: supplierSession,
      supplierProfiles: [supplierProfile],
      supplierCompanyProfiles: [incompleteProfile],
      supplierProductRecords: [],
    });
    await page.goto(`${BASE_URL}/dashboard/supplier/profile`, { waitUntil: "networkidle" });

    try {
      await assertVisible(page, "Submission blocked");
      addCheck("SUP-01", "Supplier profile shows required field gating", "PASS");
    } catch (err: any) {
      addCheck("SUP-01", "Supplier profile shows required field gating", "FAIL", err?.message || String(err));
    }

    // 2. Save state check
    try {
      await fillByLabel(page, "Legal company name (native)", "红袋能源");
      await page.getByRole("button", { name: "Save section" }).first().click();
      const saved = await page.evaluate((sid) => {
        const raw = window.localStorage.getItem("rre-v1:supplierCompanyProfiles");
        if (!raw) return null;
        const data = JSON.parse(raw);
        const profile = data.find((entry: any) => entry.supplierId === sid);
        return profile?.identity?.legalNameNative || null;
      }, supplierId);
      if (saved === "红袋能源") {
        addCheck("SUP-02", "Supplier profile save persists to storage", "PASS");
      } else {
        addCheck("SUP-02", "Supplier profile save persists to storage", "FAIL", `Saved value mismatch: ${saved}`);
      }
    } catch (err: any) {
      addCheck("SUP-02", "Supplier profile save persists to storage", "FAIL", err?.message || String(err));
    }

    // 3. Submit supplier profile (complete)
    try {
      const completeProfile = buildCompanyProfileComplete(supplierId, supplierEmail);
      await seedStorage(page, {
        session: supplierSession,
        supplierProfiles: [supplierProfile],
        supplierCompanyProfiles: [completeProfile],
        supplierProductRecords: [],
      });
      await page.goto(`${BASE_URL}/dashboard/supplier/profile`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Submit for review" }).click();
      await assertVisible(page, "Submitted. Profile is locked for review.");
      addCheck("SUP-03", "Supplier profile submission succeeds when complete", "PASS");
    } catch (err: any) {
      addCheck("SUP-03", "Supplier profile submission succeeds when complete", "FAIL", err?.message || String(err));
    }

    // 4. Admin approval action via UI
    try {
      await seedStorage(page, {
        session: adminSession,
        supplierProfiles: [supplierProfile],
        supplierCompanyProfiles: [buildCompanyProfileComplete(supplierId, supplierEmail)],
        supplierProductRecords: [],
      });
      await page.goto(`${BASE_URL}/dashboard/admin/suppliers`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Approve" }).first().click();
      const status = await page.evaluate((sid) => {
        const raw = window.localStorage.getItem("rre-v1:supplierProfiles");
        if (!raw) return null;
        const data = JSON.parse(raw);
        const profile = data.find((entry: any) => entry.supplierId === sid);
        return profile?.kybStatus || null;
      }, supplierId);
      if (status === "verified") {
        addCheck("ADMIN-01", "Admin approval updates supplier KYB status", "PASS");
      } else {
        addCheck("ADMIN-01", "Admin approval updates supplier KYB status", "FAIL", `Status is ${status}`);
      }
    } catch (err: any) {
      addCheck("ADMIN-01", "Admin approval updates supplier KYB status", "FAIL", err?.message || String(err));
    }

    // 5. Product submission negative cases
    const categorySlug = "mounting-racking";
    const subCategorySlug = "pitched-roof";
    const negativeImage = buildProductRecord({
      id: `draft-images-${RUN_ID}`,
      supplierId,
      categorySlug,
      subCategorySlug,
      imagesComplete: false,
      certsComplete: true,
      authorityComplete: true,
      partnerReviewStatus: "pass",
    });
    const negativeCerts = buildProductRecord({
      id: `draft-certs-${RUN_ID}`,
      supplierId,
      categorySlug,
      subCategorySlug,
      imagesComplete: true,
      certsComplete: false,
      authorityComplete: true,
      partnerReviewStatus: "pass",
    });
    const negativeAuthority = buildProductRecord({
      id: `draft-auth-${RUN_ID}`,
      supplierId,
      categorySlug,
      subCategorySlug,
      imagesComplete: true,
      certsComplete: true,
      authorityComplete: false,
      partnerReviewStatus: "pass",
    });

    await seedStorage(page, {
      session: supplierSession,
      supplierProfiles: [supplierProfile],
      supplierCompanyProfiles: [buildCompanyProfileComplete(supplierId, supplierEmail)],
      supplierProductRecords: [negativeImage, negativeCerts, negativeAuthority],
    });

    await page.goto(`${BASE_URL}/dashboard/supplier/products/draft/${negativeImage.id}`, { waitUntil: "networkidle" });
    const phaseDisabled = await isPhaseDisabled(page);
    if (phaseDisabled) {
      const negativeCases = [
        { id: negativeImage.id, label: "missing images" },
        { id: negativeCerts.id, label: "missing certifications" },
        { id: negativeAuthority.id, label: "missing authority" },
      ];
      for (const testCase of negativeCases) {
        addCheck(
          `PROD-NEG-${testCase.id}`,
          `Product submission blocked (${testCase.label})`,
          "NOT_APPLICABLE",
          "Supplier phase disabled"
        );
      }
      addCheck(
        "PROD-POS-01",
        "Product submission enabled when all requirements satisfied",
        "NOT_APPLICABLE",
        "Supplier phase disabled"
      );
    } else {
    const negativeCases = [
      { id: negativeImage.id, label: "missing images" },
      { id: negativeCerts.id, label: "missing certifications" },
      { id: negativeAuthority.id, label: "missing authority" },
    ];

    for (const testCase of negativeCases) {
      try {
        await page.goto(`${BASE_URL}/dashboard/supplier/products/draft/${testCase.id}`, { waitUntil: "networkidle" });
        await openApprovalSection(page);
        await assertVisible(
          page,
          "Submission locked until required fields, images, certifications, partner review, and approval are complete."
        );
        const button = page.getByRole("button", { name: /Submit to RRE Admin/i });
        const disabled = await button.isDisabled();
        if (disabled) {
          addCheck(
            `PROD-NEG-${testCase.id}`,
            `Product submission blocked (${testCase.label})`,
            "PASS"
          );
        } else {
          addCheck(
            `PROD-NEG-${testCase.id}`,
            `Product submission blocked (${testCase.label})`,
            "FAIL",
            "Submit button enabled"
          );
        }
      } catch (err: any) {
        addCheck(
          `PROD-NEG-${testCase.id}`,
          `Product submission blocked (${testCase.label})`,
          "FAIL",
          err?.message || String(err)
        );
      }
    }

    // 6. Product submission positive attempt (current UI reality)
    try {
      const positiveRecord = buildProductRecord({
        id: `draft-pass-${RUN_ID}`,
        supplierId,
        categorySlug,
        subCategorySlug,
        imagesComplete: true,
        certsComplete: true,
        authorityComplete: true,
        partnerReviewStatus: "pass",
      });
      await seedStorage(page, {
        session: supplierSession,
        supplierProfiles: [supplierProfile],
        supplierCompanyProfiles: [buildCompanyProfileComplete(supplierId, supplierEmail)],
        supplierProductRecords: [positiveRecord],
      });
      await page.goto(`${BASE_URL}/dashboard/supplier/products/draft/${positiveRecord.id}`, { waitUntil: "networkidle" });
      await openApprovalSection(page);
      const submitButton = page.getByRole("button", { name: /Submit to RRE Admin/i });
      const disabled = await submitButton.isDisabled();
      if (disabled) {
        addCheck(
          "PROD-POS-01",
          "Product submission enabled when all requirements satisfied",
          "FAIL",
          "Submit button remains disabled (partner review passes locks form)"
        );
      } else {
        await submitButton.click();
        await page.waitForURL("**/dashboard/supplier/products", { timeout: 10_000 });
        addCheck("PROD-POS-01", "Product submission enabled when all requirements satisfied", "PASS");
      }
    } catch (err: any) {
      addCheck(
        "PROD-POS-01",
        "Product submission enabled when all requirements satisfied",
        "FAIL",
        err?.message || String(err)
      );
    }
    }

    // 7. Backend persistence & TTL checks (explicitly NOT BUILT / NOT APPLICABLE)
    addCheck(
      "BACKEND-01",
      "Backend supplier persistence (Mongo/REST)",
      "NOT_BUILT",
      "Current platform uses localStorage; no server persistence"
    );
    addCheck(
      "BACKEND-02",
      "Backend product persistence (Mongo/REST)",
      "NOT_BUILT",
      "Current platform uses localStorage; no server persistence"
    );
    addCheck(
      "BACKEND-03",
      "TTL cleanup + index verification",
      "NOT_APPLICABLE",
      "No backend TTL data layer in current platform build"
    );
  } finally {
    await browser.close();
  }

  const summary = checks.reduce(
    (acc, check) => {
      acc.total += 1;
      if (check.status === "PASS") acc.pass += 1;
      if (check.status === "FAIL") acc.fail += 1;
      if (check.status === "NOT_BUILT") acc.notBuilt += 1;
      if (check.status === "NOT_APPLICABLE") acc.notApplicable += 1;
      return acc;
    },
    { total: 0, pass: 0, fail: 0, notBuilt: 0, notApplicable: 0 }
  );

  const overall = summary.fail > 0 ? "FAIL" : "PASS";

  const scorecard = {
    meta: {
      system: "RedRooEnergy",
      auditId: RUN_ID,
      auditVersion: "ui-v1",
      environment: process.env.AUDIT_ENV || "local",
    },
    run: {
      timestampUtc: new Date().toISOString(),
      baseUrl: BASE_URL,
      runner: { type: "playwright", actor: "ui-audit" },
    },
    summary: {
      overall,
      counts: summary,
    },
    checks,
  };

  fs.writeFileSync(SCORECARD_PATH, JSON.stringify(scorecard, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Scorecard written: ${SCORECARD_PATH}`);

  if (overall === "FAIL") {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
