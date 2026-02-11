import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, type Page } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const RUN_ID = `${new Date().toISOString().replace(/\W/g, "")}--${crypto.randomBytes(4).toString("hex")}`;

type CheckStatus = "PASS" | "FAIL" | "NOT_BUILT" | "NOT_APPLICABLE";

type CheckEvidence = {
  screenshots: string[];
  notes: string;
};

type Check = {
  id: string;
  title: string;
  status: CheckStatus;
  details?: string;
  evidence?: CheckEvidence;
};

type SessionState = {
  role: "buyer" | "supplier" | "service-partner" | "freight" | "regulator" | "admin";
  userId: string;
  email: string;
};

const checks: Check[] = [];
const CHECK_ORDER = [
  "FREIGHT-01",
  "FREIGHT-02",
  "FREIGHT-03",
  "FREIGHT-04",
  "FREIGHT-05",
  "FREIGHT-06",
  "FREIGHT-07",
  "FREIGHT-08",
] as const;

const CHECK_TITLES: Record<(typeof CHECK_ORDER)[number], string> = {
  "FREIGHT-01": "Public entry exposes freight/DDP governance start",
  "FREIGHT-02": "Freight operational surfaces enforce role gating",
  "FREIGHT-03": "Customs/DDP control posture is observable and non-editable in UI",
  "FREIGHT-04": "Shipment progression controls are deterministic at existing surfaces",
  "FREIGHT-05": "Delivery confirmation and settlement gating are enforced on existing endpoints",
  "FREIGHT-06": "Freight evidence documents are captured with deterministic metadata",
  "FREIGHT-07": "Exception classification exists and escalation traceability is observable",
  "FREIGHT-08": "Freight closure evidence is replayable across current ops/finance audit surfaces",
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
const OUT_DIR = path.join(ROOT_DIR, "artefacts", "freight-customs-audit");
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots", RUN_ID);

const SCORECARD_PATH = path.join(OUT_DIR, `scorecard.freight-customs.${RUN_ID}.json`);
const PDF_PATH = path.join(OUT_DIR, `summary.freight-customs.${RUN_ID}.pdf`);
const PDF_SHA256_PATH = path.join(OUT_DIR, `summary.freight-customs.${RUN_ID}.sha256`);

function relFromRepo(absPath: string) {
  return path.relative(ROOT_DIR, absPath).replace(/\\/g, "/");
}

function addCheck(id: string, title: string, status: CheckStatus, details = "", evidence?: CheckEvidence) {
  checks.push({ id, title, status, details, evidence });
  // eslint-disable-next-line no-console
  console.log(`${status} - ${id}: ${title}${details ? ` (${details})` : ""}`);
}

async function setSession(page: Page, session: SessionState | null, clearAll = true) {
  await page.evaluate(
    ({ nextSession, clear }) => {
      if (clear) window.localStorage.clear();
      if (nextSession) {
        window.localStorage.setItem("rre-v1:session", JSON.stringify(nextSession));
      } else {
        window.localStorage.removeItem("rre-v1:session");
      }
    },
    { nextSession: session, clear: clearAll }
  );
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function assertVisible(page: Page, text: string) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
}

async function waitUntil(check: () => Promise<boolean>, timeoutMs = 10_000, intervalMs = 250) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if (await check()) return true;
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

async function waitForFreightSigninRedirect(page: Page) {
  try {
    await page.waitForURL("**/signin?role=freight", { timeout: 6_000 });
    return true;
  } catch {
    return false;
  }
}

async function redactForEvidence(page: Page) {
  await page.evaluate(() => {
    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const phoneRe = /\+?\d[\d\s().-]{7,}\d/g;

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

    const textareas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
    for (const textarea of textareas) {
      try {
        textarea.value = "";
      } catch {
        // ignore
      }
    }

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

async function getJson(url: string) {
  const res = await fetch(url, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  return { res, json };
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

async function postJsonWithHeaders(url: string, body: unknown, headers: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function devLogin(role: SessionState["role"], email: string) {
  const res = await fetch(`${BASE_URL}/api/auth/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, email }),
  });
  if (!res.ok) return "";
  const setCookie = res.headers.get("set-cookie") || "";
  if (!setCookie) return "";
  return setCookie.split(";")[0] || "";
}

function checkTitle(id: (typeof CHECK_ORDER)[number]) {
  return CHECK_TITLES[id];
}

async function run() {
  ensureDir(OUT_DIR);

  const freightUser: SessionState = {
    role: "freight",
    userId: `freight-audit-${RUN_ID}`,
    email: "redacted",
  };
  const adminUser: SessionState = {
    role: "admin",
    userId: `admin-audit-${RUN_ID}`,
    email: "redacted",
  };

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });

    // FREIGHT-01
    try {
      await setSession(page, null, true);
      const directoryRes = await page.goto(`${BASE_URL}/service-agents/freight-shipping`, { waitUntil: "domcontentloaded" });
      if (!directoryRes || directoryRes.status() >= 400) {
        const shot = await captureScreenshot(page, "FREIGHT-01");
        addCheck("FREIGHT-01", checkTitle("FREIGHT-01"), "FAIL", "Freight directory route unavailable", {
          screenshots: [shot],
          notes: "",
        });
      } else {
        await assertVisible(page, "Approved Freight & Shipping Agents");
        const detailHref = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href]')).map((el) => el.getAttribute("href") || "");
          return (
            links.find(
              (href) => href.startsWith("/service-agents/freight-shipping/") && href !== "/service-agents/freight-shipping"
            ) || ""
          );
        });

        if (!detailHref) {
          const shot = await captureScreenshot(page, "FREIGHT-01");
          addCheck(
            "FREIGHT-01",
            checkTitle("FREIGHT-01"),
            "NOT_BUILT",
            "No freight agent detail link found from public directory",
            { screenshots: [shot], notes: "" }
          );
        } else {
          const detailRes = await page.goto(`${BASE_URL}${detailHref}`, { waitUntil: "domcontentloaded" });
          const dutyRes = await page.goto(`${BASE_URL}/freight-duty`, { waitUntil: "domcontentloaded" });
          if (!detailRes || detailRes.status() >= 400 || !dutyRes || dutyRes.status() >= 400) {
            const shot = await captureScreenshot(page, "FREIGHT-01");
            addCheck(
              "FREIGHT-01",
              checkTitle("FREIGHT-01"),
              "FAIL",
              "Freight profile or freight-duty route returned non-200 status",
              { screenshots: [shot], notes: "" }
            );
          } else {
            await assertVisible(page, "Freight & Duty");
            addCheck("FREIGHT-01", checkTitle("FREIGHT-01"), "PASS");
          }
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "FREIGHT-01");
      addCheck("FREIGHT-01", checkTitle("FREIGHT-01"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // FREIGHT-02
    try {
      await setSession(page, null, true);
      const protectedRoutes = [
        "/dashboard/freight",
        "/dashboard/freight/customs",
        "/dashboard/freight/documents",
        "/dashboard/freight/exceptions",
      ];

      const redirectFailures: string[] = [];
      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        const redirected = await waitForFreightSigninRedirect(page);
        if (!redirected) redirectFailures.push(route);
      }

      const deliveryRes = await postJson(`${BASE_URL}/api/freight/delivery-confirm`, { orderId: "ORD-AUDIT" });
      const adminDeliveryRes = await postJson(`${BASE_URL}/api/admin/freight/delivery-confirm`, { orderId: "ORD-AUDIT" });
      const notifyRes = await postJson(`${BASE_URL}/api/freight/notify`, {
        supplierId: "SUP-001",
        productSlug: "sample",
        milestone: "PICKUP",
      });

      const apiRejected = deliveryRes.res.status === 403 && adminDeliveryRes.res.status === 403 && notifyRes.res.status === 403;

      if (redirectFailures.length || !apiRejected) {
        const shot = await captureScreenshot(page, "FREIGHT-02");
        addCheck(
          "FREIGHT-02",
          checkTitle("FREIGHT-02"),
          "FAIL",
          `Redirect failures: ${redirectFailures.join(", ") || "none"}; unauth API statuses: freight=${deliveryRes.res.status}, admin=${adminDeliveryRes.res.status}, notify=${notifyRes.res.status}`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("FREIGHT-02", checkTitle("FREIGHT-02"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "FREIGHT-02");
      addCheck("FREIGHT-02", checkTitle("FREIGHT-02"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // FREIGHT-03
    try {
      await setSession(page, freightUser, true);
      await page.goto(`${BASE_URL}/dashboard/freight/customs`, { waitUntil: "domcontentloaded" });
      if (page.url().includes("/signin")) {
        const shot = await captureScreenshot(page, "FREIGHT-03");
        addCheck("FREIGHT-03", checkTitle("FREIGHT-03"), "FAIL", `Redirected to ${page.url()}`, {
          screenshots: [shot],
          notes: "",
        });
      } else {
        await assertVisible(page, "Customs tracking");
        await assertVisible(page, "DDP");
        await assertVisible(page, "HS Code");
        await assertVisible(page, "Duty");
        await assertVisible(page, "GST");
        await assertVisible(page, "Clearance");

        const editableCount = await page.locator("main input, main select, main textarea").count();
        const dutyPage = await page.goto(`${BASE_URL}/freight-duty`, { waitUntil: "domcontentloaded" });
        const customsDocPage = await page.goto(`${BASE_URL}/shipping-delivery-logistics/customs-duties-imports`, {
          waitUntil: "domcontentloaded",
        });

        if (editableCount > 0 || !dutyPage || dutyPage.status() >= 400 || !customsDocPage || customsDocPage.status() >= 400) {
          const shot = await captureScreenshot(page, "FREIGHT-03");
          addCheck(
            "FREIGHT-03",
            checkTitle("FREIGHT-03"),
            "FAIL",
            `Editable controls=${editableCount}, freight-duty=${dutyPage?.status()}, customs-doc=${customsDocPage?.status()}`,
            { screenshots: [shot], notes: "" }
          );
        } else {
          addCheck("FREIGHT-03", checkTitle("FREIGHT-03"), "PASS");
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "FREIGHT-03");
      addCheck("FREIGHT-03", checkTitle("FREIGHT-03"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // FREIGHT-04
    try {
      await setSession(page, adminUser, true);
      await page.goto(`${BASE_URL}/dashboard/supplier/shipments`, { waitUntil: "domcontentloaded" });

      const supplierPhaseDisabled = await page
        .getByText("Set NEXT_PUBLIC_SUPPLIER_PHASE=on to enable supplier workflows.", { exact: false })
        .first()
        .isVisible({ timeout: 1_500 })
        .catch(() => false);

      if (supplierPhaseDisabled) {
        const shot = await captureScreenshot(page, "FREIGHT-04");
        addCheck(
          "FREIGHT-04",
          checkTitle("FREIGHT-04"),
          "NOT_BUILT",
          "Supplier phase disabled; shipment progression surface unavailable",
          { screenshots: [shot], notes: "" }
        );
      } else {
        const productSlug = `freight-audit-${RUN_ID}`;
        const trackingId = `TRK-${RUN_ID.slice(-8)}`;

        const productSlugInput = page
          .locator("label", { hasText: "Product slug" })
          .locator("xpath=following-sibling::input[1]");
        const trackingIdInput = page
          .locator("label", { hasText: "Tracking ID" })
          .locator("xpath=following-sibling::input[1]");
        const milestoneSelect = page
          .locator("label", { hasText: "Milestone" })
          .locator("xpath=following-sibling::select[1]");

        await productSlugInput.fill(productSlug);
        await trackingIdInput.fill(trackingId);
        await milestoneSelect.selectOption("IN_TRANSIT");

        let outOfSequenceMessage = "";
        const outOfSequenceDialog = page
          .waitForEvent("dialog", { timeout: 4_000 })
          .then(async (dialog) => {
            outOfSequenceMessage = dialog.message();
            await dialog.accept();
          })
          .catch(() => undefined);
        await page.getByRole("button", { name: "Add update" }).click();
        await outOfSequenceDialog;

        await milestoneSelect.selectOption("PICKUP");
        await page.getByRole("button", { name: "Add update" }).click();
        await assertVisible(page, productSlug);

        const hasStoredShipment = await page.evaluate((slug) => {
          const raw = window.localStorage.getItem("rre-v1:shipmentUpdates");
          if (!raw) return false;
          try {
            const list = JSON.parse(raw) as Array<Record<string, unknown>>;
            return list.some(
              (entry) =>
                entry.productSlug === slug &&
                entry.milestone === "PICKUP" &&
                typeof entry.timestamp === "string" &&
                entry.timestamp.length > 0
            );
          } catch {
            return false;
          }
        }, productSlug);

        await setSession(page, freightUser, false);
        await page.goto(`${BASE_URL}/dashboard/freight`, { waitUntil: "domcontentloaded" });
        const trackingVisible = await waitUntil(async () => {
          return page.getByText(trackingId, { exact: false }).first().isVisible().catch(() => false);
        }, 15_000);

        if (!outOfSequenceMessage.includes("Next allowed milestone") || !hasStoredShipment || !trackingVisible) {
          const shot = await captureScreenshot(page, "FREIGHT-04");
          addCheck(
            "FREIGHT-04",
            checkTitle("FREIGHT-04"),
            "FAIL",
            `Out-of-sequence message ok=${outOfSequenceMessage.includes("Next allowed milestone")}, stored=${hasStoredShipment}, reflected=${trackingVisible}`,
            { screenshots: [shot], notes: "" }
          );
        } else {
          addCheck("FREIGHT-04", checkTitle("FREIGHT-04"), "PASS");
        }
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "FREIGHT-04");
      addCheck("FREIGHT-04", checkTitle("FREIGHT-04"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // FREIGHT-05
    try {
      const deliveryUnauth = await postJson(`${BASE_URL}/api/freight/delivery-confirm`, { orderId: "ORD-AUDIT" });
      const adminDeliveryUnauth = await postJson(`${BASE_URL}/api/admin/freight/delivery-confirm`, { orderId: "ORD-AUDIT" });
      const settlementUnauth = await postJson(`${BASE_URL}/api/settlements/wise/create-transfer`, { orderId: "ORD-AUDIT" });
      const freightCookie = await devLogin("freight", `freight-audit-${RUN_ID}@test.local`);
      const adminCookie = await devLogin("admin", `admin-audit-${RUN_ID}@test.local`);
      const authAvailable = Boolean(freightCookie) && Boolean(adminCookie);

      const ineligibleOrderId = `ORD-AUDIT-INELIGIBLE-${RUN_ID.slice(-8)}`;
      const eligibleOrderId = `ORD-AUDIT-ELIGIBLE-${RUN_ID.slice(-8)}`;
      const trackingId = `TRK-${RUN_ID.slice(-8)}`;

      let ineligibleSettlement = { res: { status: 0 }, json: {} as any };
      let deliveryAuth = { res: { status: 0 }, json: {} as any };
      let settlementEligible = { res: { status: 0 }, json: {} as any };
      let settlementReplay = { res: { status: 0 }, json: {} as any };

      if (authAvailable) {
        ineligibleSettlement = await postJsonWithHeaders(
          `${BASE_URL}/api/settlements/wise/create-transfer`,
          { orderId: ineligibleOrderId },
          { cookie: adminCookie }
        );
        deliveryAuth = await postJsonWithHeaders(
          `${BASE_URL}/api/freight/delivery-confirm`,
          {
            orderId: eligibleOrderId,
            trackingId,
            evidenceNote: "Audit delivery evidence",
          },
          { cookie: freightCookie }
        );
        settlementEligible = await postJsonWithHeaders(
          `${BASE_URL}/api/settlements/wise/create-transfer`,
          { orderId: eligibleOrderId },
          { cookie: adminCookie }
        );
        settlementReplay = await postJsonWithHeaders(
          `${BASE_URL}/api/settlements/wise/create-transfer`,
          { orderId: eligibleOrderId },
          { cookie: adminCookie }
        );
      }

      const unauthGatingPass =
        deliveryUnauth.res.status === 403 &&
        adminDeliveryUnauth.res.status === 403 &&
        (settlementUnauth.res.status === 401 || settlementUnauth.res.status === 403);
      const ineligibleGatingPass = ineligibleSettlement.res.status === 400;
      const deliveryPersistencePass =
        deliveryAuth.res.status === 200 &&
        deliveryAuth.json?.orderStatus === "DELIVERED" &&
        deliveryAuth.json?.timelineLatestStatus === "DELIVERED";
      const eligibleSettlementPass =
        settlementEligible.res.status === 200 &&
        settlementEligible.json?.orderStatus === "SETTLED" &&
        settlementEligible.json?.escrowStatus === "SETTLED" &&
        typeof settlementEligible.json?.transferId === "string" &&
        settlementEligible.json.transferId.length > 0 &&
        settlementEligible.json?.timelineLatestStatus === "SETTLED";
      const replayGatePass = settlementReplay.res.status === 400;

      if (!unauthGatingPass) {
        const shot = await captureScreenshot(page, "FREIGHT-05");
        addCheck(
          "FREIGHT-05",
          checkTitle("FREIGHT-05"),
          "FAIL",
          `Unauth statuses freight=${deliveryUnauth.res.status}, admin=${adminDeliveryUnauth.res.status}, settlement=${settlementUnauth.res.status}`,
          { screenshots: [shot], notes: "" }
        );
      } else if (!authAvailable) {
        const shot = await captureScreenshot(page, "FREIGHT-05");
        addCheck(
          "FREIGHT-05",
          checkTitle("FREIGHT-05"),
          "NOT_BUILT",
          "Authenticated delivery/settlement probe unavailable because dev-login session cookie could not be established",
          { screenshots: [shot], notes: "" }
        );
      } else if (!ineligibleGatingPass || !deliveryPersistencePass || !eligibleSettlementPass || !replayGatePass) {
        const shot = await captureScreenshot(page, "FREIGHT-05");
        addCheck(
          "FREIGHT-05",
          checkTitle("FREIGHT-05"),
          "FAIL",
          `ineligible=${ineligibleSettlement.res.status}, delivery=${deliveryAuth.res.status}/${deliveryAuth.json?.orderStatus || "n/a"}, settle=${settlementEligible.res.status}/${settlementEligible.json?.orderStatus || "n/a"}, replay=${settlementReplay.res.status}`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("FREIGHT-05", checkTitle("FREIGHT-05"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "FREIGHT-05");
      addCheck("FREIGHT-05", checkTitle("FREIGHT-05"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // FREIGHT-06
    try {
      const docsContext = await browser.newContext();
      await docsContext.addInitScript((session) => {
        window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
      }, freightUser);
      const docsPage = await docsContext.newPage();
      await docsPage.goto(`${BASE_URL}/dashboard/freight/documents`, { waitUntil: "domcontentloaded" });

      if (docsPage.url().includes("/signin")) {
        const shot = await captureScreenshot(docsPage, "FREIGHT-06");
        addCheck("FREIGHT-06", checkTitle("FREIGHT-06"), "FAIL", `Redirected to ${docsPage.url()}`, {
          screenshots: [shot],
          notes: "",
        });
      } else {
        const seededShipmentId = `TRK-${RUN_ID.slice(-6)}`;
        const seededName = `freight-evidence-${RUN_ID}.pdf`;
        const seededId = `seed-${RUN_ID}`;
        const seededAt = new Date().toISOString();

        await docsPage.evaluate(
          ({ id, shipmentId, name, uploadedAt }) => {
            window.localStorage.setItem(
              "rre-v1:freightDocuments",
              JSON.stringify([
                {
                  id,
                  shipmentId,
                  name,
                  type: "B/L",
                  uploadedAt,
                },
              ])
            );
          },
          {
            id: seededId,
            shipmentId: seededShipmentId,
            name: seededName,
            uploadedAt: seededAt,
          }
        );
        await docsPage.reload({ waitUntil: "domcontentloaded" });

        const registerVisible = await waitUntil(
          async () => docsPage.getByText(seededName, { exact: false }).first().isVisible().catch(() => false),
          8_000
        );

        const hasMetadata = await waitUntil(
          async () =>
            docsPage.evaluate(
              ({ id, shipmentId, name, uploadedAt }) => {
                const raw = window.localStorage.getItem("rre-v1:freightDocuments");
                if (!raw) return false;
                try {
                  const list = JSON.parse(raw) as Array<Record<string, unknown>>;
                  return list.some(
                    (entry) =>
                      entry.id === id &&
                      entry.shipmentId === shipmentId &&
                      entry.name === name &&
                      entry.type === "B/L" &&
                      entry.uploadedAt === uploadedAt &&
                      typeof entry.id === "string" &&
                      typeof entry.type === "string" &&
                      typeof entry.uploadedAt === "string"
                  );
                } catch {
                  return false;
                }
              },
              {
                id: seededId,
                shipmentId: seededShipmentId,
                name: seededName,
                uploadedAt: seededAt,
              }
            ),
          12_000
        );

        const removeCount = await docsPage.getByRole("button", { name: "Remove" }).count();

        if (!registerVisible || !hasMetadata) {
          const shot = await captureScreenshot(docsPage, "FREIGHT-06");
          addCheck(
            "FREIGHT-06",
            checkTitle("FREIGHT-06"),
            "FAIL",
            `Document register/metadata not deterministic (registerVisible=${registerVisible}, hasMetadata=${hasMetadata})`,
            { screenshots: [shot], notes: "" }
          );
        } else if (removeCount > 0) {
          const shot = await captureScreenshot(docsPage, "FREIGHT-06");
          addCheck(
            "FREIGHT-06",
            checkTitle("FREIGHT-06"),
            "FAIL",
            "Hard-delete path exposed via Remove action without immutable/tombstone evidence",
            { screenshots: [shot], notes: "" }
          );
        } else {
          addCheck("FREIGHT-06", checkTitle("FREIGHT-06"), "PASS");
        }
      }
      await docsContext.close();
    } catch (err: any) {
      const shot = await captureScreenshot(page, "FREIGHT-06");
      addCheck("FREIGHT-06", checkTitle("FREIGHT-06"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // FREIGHT-07
    try {
      const exceptionsContext = await browser.newContext();
      await exceptionsContext.addInitScript((session) => {
        window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
      }, freightUser);
      const exceptionsPage = await exceptionsContext.newPage();
      await exceptionsPage.goto(`${BASE_URL}/dashboard/freight/exceptions`, { waitUntil: "domcontentloaded" });

      if (exceptionsPage.url().includes("/signin")) {
        const shot = await captureScreenshot(exceptionsPage, "FREIGHT-07");
        addCheck("FREIGHT-07", checkTitle("FREIGHT-07"), "FAIL", `Redirected to ${exceptionsPage.url()}`, {
          screenshots: [shot],
          notes: "",
        });
      } else {
        const shipmentId = `EXC-${RUN_ID.slice(-6)}`;
        const exceptionId = `EXREF-${RUN_ID.slice(-8)}`;
        const seededAt = new Date().toISOString();

        await exceptionsPage.evaluate(
          ({ id, shipmentId: sid, createdAt }) => {
            window.localStorage.setItem(
              "rre-v1:freightExceptions",
              JSON.stringify([
                {
                  id,
                  shipmentId: sid,
                  issueType: "Customs Hold",
                  severity: "High",
                  status: "OPEN",
                  evidenceNote: "Audit reference seed",
                  createdAt,
                  updatedAt: createdAt,
                },
              ])
            );
          },
          { id: exceptionId, shipmentId, createdAt: seededAt }
        );
        await exceptionsPage.reload({ waitUntil: "domcontentloaded" });

        const hasFreightReference = await waitUntil(
          async () =>
            exceptionsPage.getByText(`Exception ${exceptionId}`, { exact: false }).first().isVisible().catch(() => false),
          8_000
        );
        const hasFreightShipmentRef = await waitUntil(
          async () =>
            exceptionsPage.getByText(`Shipment ${shipmentId}`, { exact: false }).first().isVisible().catch(() => false),
          8_000
        );

        const adminContext = await browser.newContext();
        const adminPage = await adminContext.newPage();
        await adminPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
        await adminPage.evaluate(
          ({ admin, id, shipmentId: sid, createdAt }) => {
            window.localStorage.setItem("rre-v1:session", JSON.stringify(admin));
            window.localStorage.setItem(
              "rre-v1:freightExceptions",
              JSON.stringify([
                {
                  id,
                  shipmentId: sid,
                  issueType: "Customs Hold",
                  severity: "High",
                  status: "OPEN",
                  evidenceNote: "Audit reference seed",
                  createdAt,
                  updatedAt: createdAt,
                },
              ])
            );
          },
          { admin: adminUser, id: exceptionId, shipmentId, createdAt: seededAt }
        );

        await adminPage.goto(`${BASE_URL}/dashboard/admin/executive`, { waitUntil: "domcontentloaded" });
        const hasExecutiveVisibility = await adminPage
          .getByText("Freight exceptions", { exact: false })
          .first()
          .isVisible({ timeout: 4_000 })
          .catch(() => false);

        await adminPage.goto(`${BASE_URL}/dashboard/admin/orders`, { waitUntil: "domcontentloaded" });
        const hasEscalationReference = await waitUntil(
          async () => {
            const visibleRef = await adminPage
              .getByText(`Exception ${exceptionId}`, { exact: false })
              .first()
              .isVisible()
              .catch(() => false);
            if (visibleRef) return true;
            return adminPage.evaluate((id) => document.body.innerText.includes(id), exceptionId).catch(() => false);
          },
          8_000
        );
        await adminContext.close();

        if (!hasFreightReference || !hasFreightShipmentRef || !hasExecutiveVisibility) {
          const shot = await captureScreenshot(exceptionsPage, "FREIGHT-07");
          addCheck(
            "FREIGHT-07",
            checkTitle("FREIGHT-07"),
            "FAIL",
            `freight-ref=${hasFreightReference}, freight-shipment-ref=${hasFreightShipmentRef}, executive-visibility=${hasExecutiveVisibility}`,
            { screenshots: [shot], notes: "" }
          );
        } else if (!hasEscalationReference) {
          const shot = await captureScreenshot(exceptionsPage, "FREIGHT-07");
          addCheck(
            "FREIGHT-07",
            checkTitle("FREIGHT-07"),
            "FAIL",
            "No deterministic escalation reference for the open freight exception in admin review surfaces",
            { screenshots: [shot], notes: "" }
          );
        } else {
          addCheck("FREIGHT-07", checkTitle("FREIGHT-07"), "PASS");
        }
      }
      await exceptionsContext.close();
    } catch (err: any) {
      const shot = await captureScreenshot(page, "FREIGHT-07");
      addCheck("FREIGHT-07", checkTitle("FREIGHT-07"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // FREIGHT-08
    try {
      const replaySuffix = RUN_ID.slice(-8);
      const replayOrderId = `ORD-AUDIT-REPLAY-${replaySuffix}`;
      const replayTrackingId = `TRK-REPLAY-${replaySuffix}`;
      const replayTimestamp = new Date().toISOString();
      const replayBuyerEmail = `buyer-audit-${replaySuffix}@test.local`;
      const replayProductSlug = `freight-replay-${replaySuffix}`;
      const replayOrder = {
        orderId: replayOrderId,
        createdAt: replayTimestamp,
        buyerEmail: replayBuyerEmail,
        shippingAddress: {
          line1: "Audit Street",
          city: "Sydney",
          state: "NSW",
          postcode: "2000",
          country: "AU",
        },
        items: [
          {
            productSlug: replayProductSlug,
            name: "Freight Replay Fixture",
            qty: 1,
            price: 100,
            supplierId: "SUP-AUDIT",
          },
        ],
        supplierIds: ["SUP-AUDIT"],
        total: 100,
        currency: "aud",
        status: "SETTLED",
        escrowStatus: "SETTLED",
        deliveredAt: replayTimestamp,
        timeline: [
          { status: "PROCESSING", timestamp: replayTimestamp, note: "Order processing" },
          { status: "DELIVERED", timestamp: replayTimestamp, note: "Delivery confirmed by freight" },
          { status: "SETTLEMENT_ELIGIBLE", timestamp: replayTimestamp, note: "Settlement eligibility met" },
          { status: "SETTLED", timestamp: replayTimestamp, note: "Settled (sandbox)" },
        ],
      };
      const replayShipmentUpdate = {
        id: `ship-${replaySuffix}`,
        supplierId: "SUP-AUDIT",
        productSlug: replayProductSlug,
        milestone: "DELIVERED",
        trackingId: replayTrackingId,
        evidenceNote: `Replay fixture for ${replayOrderId}`,
        timestamp: replayTimestamp,
      };

      await setSession(page, adminUser, true);
      await page.evaluate(
        ({ order, shipmentUpdate }) => {
          window.localStorage.setItem("rre-v1:orders", JSON.stringify([order]));
          window.localStorage.setItem("rre-v1:shipmentUpdates", JSON.stringify([shipmentUpdate]));
        },
        { order: replayOrder, shipmentUpdate: replayShipmentUpdate }
      );

      await page.goto(`${BASE_URL}/dashboard/admin/orders`, { waitUntil: "domcontentloaded" });
      const hasOrdersSurface = await page
        .getByText("Admin Orders & Escalations", { exact: false })
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);
      const hasShipmentReplay = await waitUntil(
        async () => {
          const trackingVisible = await page
            .getByText(replayTrackingId, { exact: false })
            .first()
            .isVisible()
            .catch(() => false);
          const deliveredVisible = await page
            .getByText("DELIVERED", { exact: false })
            .first()
            .isVisible()
            .catch(() => false);
          return trackingVisible && deliveredVisible;
        },
        8_000
      );

      await page.goto(`${BASE_URL}/dashboard/admin/settlements`, { waitUntil: "domcontentloaded" });
      const hasSettlementsSurface = await page
        .getByText("Settlements (Wise Sandbox)", { exact: false })
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);
      const hasSettlementReplay = await waitUntil(
        async () => {
          const orderVisible = await page
            .getByText(replayOrderId, { exact: false })
            .first()
            .isVisible()
            .catch(() => false);
          const settledVisible = await page
            .getByText("Escrow: SETTLED", { exact: false })
            .first()
            .isVisible()
            .catch(() => false);
          return orderVisible && settledVisible;
        },
        8_000
      );

      const buyerContext = await browser.newContext();
      const buyerPage = await buyerContext.newPage();
      await buyerPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await buyerPage.evaluate(
        ({ buyerSession, order, shipmentUpdate }) => {
          window.localStorage.setItem("rre-v1:session", JSON.stringify(buyerSession));
          window.localStorage.setItem("rre-v1:orders", JSON.stringify([order]));
          window.localStorage.setItem("rre-v1:shipmentUpdates", JSON.stringify([shipmentUpdate]));
        },
        {
          buyerSession: {
            role: "buyer",
            userId: `buyer-audit-${replaySuffix}`,
            email: replayBuyerEmail,
          },
          order: replayOrder,
          shipmentUpdate: replayShipmentUpdate,
        }
      );
      await buyerPage.goto(`${BASE_URL}/dashboard/buyer/orders/${encodeURIComponent(replayOrderId)}`, {
        waitUntil: "domcontentloaded",
      });
      const hasDeliveredTimelineEvidence = await waitUntil(
        async () => {
          const deliveredVisible = await buyerPage
            .getByText("Delivered", { exact: false })
            .first()
            .isVisible()
            .catch(() => false);
          const settledVisible = await buyerPage
            .getByText("Settled", { exact: false })
            .first()
            .isVisible()
            .catch(() => false);
          return deliveredVisible && settledVisible;
        },
        8_000
      );
      await buyerContext.close();

      await page.goto(`${BASE_URL}/dashboard/admin/audit-exports`, { waitUntil: "domcontentloaded" });
      const adminPhaseDisabled = await page
        .getByText("Admin phase disabled (NEXT_PUBLIC_ADMIN_PHASE).", { exact: false })
        .first()
        .isVisible({ timeout: 1_500 })
        .catch(() => false);
      const hasAuditExportSurface = await page
        .getByText("Audit Exports", { exact: false })
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);

      const feeLedgerUnauth = await getJson(`${BASE_URL}/api/admin/fee-ledger`);
      const feeLedgerSummaryUnauth = await getJson(`${BASE_URL}/api/admin/fee-ledger/summary`);
      const feeLedgerMeUnauth = await getJson(`${BASE_URL}/api/fee-ledger/me`);
      const internalFeeEngineUnauth = await postJson(`${BASE_URL}/api/internal/fee-engine`, {
        triggerEvent: "ORDER_PAID",
        orderId: "ORD-AUDIT",
        installerId: "installer-audit",
        baseAmount: 100,
        currency: "AUD",
      });

      const apiRoleGating =
        feeLedgerUnauth.res.status === 403 &&
        feeLedgerSummaryUnauth.res.status === 403 &&
        feeLedgerMeUnauth.res.status === 401 &&
        internalFeeEngineUnauth.res.status === 401;

      if (!hasOrdersSurface || !hasSettlementsSurface || !apiRoleGating) {
        const shot = await captureScreenshot(page, "FREIGHT-08");
        addCheck(
          "FREIGHT-08",
          checkTitle("FREIGHT-08"),
          "FAIL",
          `orders=${hasOrdersSurface}, settlements=${hasSettlementsSurface}, apiRoleGating=${apiRoleGating}`,
          { screenshots: [shot], notes: "" }
        );
      } else if (adminPhaseDisabled) {
        const shot = await captureScreenshot(page, "FREIGHT-08");
        addCheck(
          "FREIGHT-08",
          checkTitle("FREIGHT-08"),
          "NOT_BUILT",
          "Admin audit-exports is disabled by NEXT_PUBLIC_ADMIN_PHASE; replay closure is unavailable",
          { screenshots: [shot], notes: "" }
        );
      } else if (!hasAuditExportSurface || !hasShipmentReplay || !hasDeliveredTimelineEvidence || !hasSettlementReplay) {
        const shot = await captureScreenshot(page, "FREIGHT-08");
        addCheck(
          "FREIGHT-08",
          checkTitle("FREIGHT-08"),
          "FAIL",
          `auditExports=${hasAuditExportSurface}, shipmentReplay=${hasShipmentReplay}, deliveredTimeline=${hasDeliveredTimelineEvidence}, settlementReplay=${hasSettlementReplay}`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("FREIGHT-08", checkTitle("FREIGHT-08"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "FREIGHT-08");
      addCheck("FREIGHT-08", checkTitle("FREIGHT-08"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }
  } finally {
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
          notes: check.evidence?.notes ?? "",
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

    const overall: "PASS" | "FAIL" = summaryCounts.fail > 0 || summaryCounts.notBuilt > 0 ? "FAIL" : "PASS";
    const scorecard = {
      meta: {
        auditId: "freight-customs",
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
      await pdfPage.goto(`${BASE_URL}/__audit/freight-customs/summary?runId=${encodeURIComponent(RUN_ID)}`, {
        waitUntil: "domcontentloaded",
      });
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
