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
  "BUYER-01",
  "BUYER-02",
  "BUYER-03",
  "BUYER-04",
  "BUYER-05",
  "BUYER-06",
  "BUYER-07",
  "BUYER-08",
] as const;

const CHECK_TITLES: Record<(typeof CHECK_ORDER)[number], string> = {
  "BUYER-01": "Public entry exposes buyer onboarding start",
  "BUYER-02": "Account creation/sign-in yields buyer workspace access",
  "BUYER-03": "Buyer terms acknowledgement is explicit and persisted before checkout",
  "BUYER-04": "Checkout eligibility gating blocks ineligible buyer progression",
  "BUYER-05": "Order creation invariants are captured deterministically",
  "BUYER-06": "Payment and escrow transitions are observable across buyer/admin surfaces",
  "BUYER-07": "Buyer evidence visibility and role gating are enforced",
  "BUYER-08": "Admin oversight and replay evidence are deterministic for buyer order lifecycle",
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
const OUT_DIR = path.join(ROOT_DIR, "artefacts", "buyer-onboarding-audit");
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots", RUN_ID);

const SCORECARD_PATH = path.join(OUT_DIR, `scorecard.buyer-onboarding.${RUN_ID}.json`);
const PDF_PATH = path.join(OUT_DIR, `summary.buyer-onboarding.${RUN_ID}.pdf`);
const PDF_SHA256_PATH = path.join(OUT_DIR, `summary.buyer-onboarding.${RUN_ID}.sha256`);

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

async function waitForBuyerSigninRedirect(page: Page) {
  try {
    await page.waitForURL("**/signin?role=buyer", { timeout: 6_000 });
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

async function getJson(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, { method: "GET", headers });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function postJson(url: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
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

function seedBuyerRecord(buyerId: string, email: string) {
  return {
    buyerId,
    email,
    name: "REDACTED",
    phone: "+61111111111",
    phoneCountryCode: "+61",
    phoneNumber: "111111111",
    buyerType: "Individual",
    businessVerified: false,
    createdAt: new Date().toISOString(),
  };
}

function seedCartItem() {
  return {
    productSlug: `buyer-audit-${RUN_ID.slice(-8)}`,
    name: "Buyer Audit Fixture",
    qty: 1,
    price: 199,
    supplierId: "SUP-AUDIT",
  };
}

async function run() {
  ensureDir(OUT_DIR);

  const buyerId = `buyer-audit-${RUN_ID}`;
  const buyerEmail = `buyer-audit-${RUN_ID.slice(-8)}@test.local`;
  const buyerUser: SessionState = { role: "buyer", userId: buyerId, email: buyerEmail };
  const adminUser: SessionState = {
    role: "admin",
    userId: `admin-audit-${RUN_ID}`,
    email: `admin-audit-${RUN_ID.slice(-8)}@test.local`,
  };

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });

    // BUYER-01
    try {
      await setSession(page, null, true);
      const signinRes = await page.goto(`${BASE_URL}/signin?role=buyer`, { waitUntil: "domcontentloaded" });
      const signinOk = Boolean(signinRes) && signinRes.status() < 400;
      const hasSignInTitle = await page
        .getByText("Sign in to RedRooEnergy", { exact: false })
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);
      const hasBuyerRoleOption =
        (await page.locator('#signin-role option[value="buyer"]').count()) > 0 ||
        (await page.getByText("Role: buyer", { exact: false }).count()) > 0;

      const registerRes = await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
      const registerOk = Boolean(registerRes) && registerRes.status() < 400;
      const hasRegisterTitle = await page
        .getByText("Create Account", { exact: false })
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);

      if (!signinOk || !registerOk) {
        const shot = await captureScreenshot(page, "BUYER-01");
        addCheck(
          "BUYER-01",
          checkTitle("BUYER-01"),
          "FAIL",
          `Entry route status invalid (signin=${signinRes?.status()}, register=${registerRes?.status()})`,
          { screenshots: [shot], notes: "" }
        );
      } else if (!hasSignInTitle || !hasBuyerRoleOption || !hasRegisterTitle) {
        const shot = await captureScreenshot(page, "BUYER-01");
        addCheck(
          "BUYER-01",
          checkTitle("BUYER-01"),
          "FAIL",
          `Buyer auth entry surface missing expected controls (title=${hasSignInTitle}, roleOption=${hasBuyerRoleOption}, register=${hasRegisterTitle})`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("BUYER-01", checkTitle("BUYER-01"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "BUYER-01");
      addCheck("BUYER-01", checkTitle("BUYER-01"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // BUYER-02
    try {
      await setSession(page, null, true);
      const protectedRoutes = ["/dashboard/buyer", "/dashboard/buyer/orders", "/dashboard/buyer/profile"];
      const redirectFailures: string[] = [];
      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        const redirected = await waitForBuyerSigninRedirect(page);
        if (!redirected) redirectFailures.push(route);
      }

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ session, buyers }) => {
          window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
          window.localStorage.setItem("rre-v1:buyers", JSON.stringify(buyers));
        },
        { session: buyerUser, buyers: [seedBuyerRecord(buyerId, buyerEmail)] }
      );
      await page.goto(`${BASE_URL}/dashboard/buyer`, { waitUntil: "domcontentloaded" });

      const hasBuyerWorkspace = await page
        .getByText("Buyer Overview", { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);

      const authStatusUnauth = await getJson(`${BASE_URL}/api/auth/status`);
      const unauthOk = authStatusUnauth.res.status === 200 && authStatusUnauth.json?.session === null;

      const buyerCookie = await devLogin("buyer", buyerEmail);
      const authStatusBuyer = buyerCookie
        ? await getJson(`${BASE_URL}/api/auth/status`, { cookie: buyerCookie })
        : { res: { status: 0 }, json: {} as any };
      const authOk = buyerCookie
        ? authStatusBuyer.res.status === 200 && authStatusBuyer.json?.session?.role === "buyer"
        : false;

      if (redirectFailures.length > 0 || !hasBuyerWorkspace || !unauthOk || !authOk) {
        const shot = await captureScreenshot(page, "BUYER-02");
        addCheck(
          "BUYER-02",
          checkTitle("BUYER-02"),
          "FAIL",
          `redirectFailures=${redirectFailures.join(",") || "none"}, buyerWorkspace=${hasBuyerWorkspace}, authUnauth=${authStatusUnauth.res.status}, authBuyer=${authStatusBuyer.res.status}`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("BUYER-02", checkTitle("BUYER-02"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "BUYER-02");
      addCheck("BUYER-02", checkTitle("BUYER-02"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // BUYER-03
    try {
      await setSession(page, null, true);
      const termsRoute1 = await page.goto(`${BASE_URL}/buyer-terms`, { waitUntil: "domcontentloaded" });
      const termsRoute2 = await page.goto(`${BASE_URL}/core-legal-consumer/buyer-terms`, { waitUntil: "domcontentloaded" });

      const termsRouteAvailable =
        (termsRoute1 && termsRoute1.status() < 400) || (termsRoute2 && termsRoute2.status() < 400);

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ session, buyers, cart }) => {
          window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
          window.localStorage.setItem("rre-v1:buyers", JSON.stringify(buyers));
          window.localStorage.setItem("rre-v1:cart", JSON.stringify([cart]));
          window.localStorage.setItem("rre-v1:orders", JSON.stringify([]));
        },
        {
          session: buyerUser,
          buyers: [seedBuyerRecord(buyerId, buyerEmail)],
          cart: seedCartItem(),
        }
      );
      await page.goto(`${BASE_URL}/checkout`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);

      const termsCheckbox = page.locator("#buyer-terms-ack");
      const hasTermsCheckbox = (await termsCheckbox.count()) > 0;
      const hasTermsLink =
        (await page.locator('a[href*="/core-legal-consumer/buyer-terms"],a[href*="/buyer-terms"]').count()) > 0;

      await page.getByLabel("Contact email").fill(buyerEmail);
      await page.getByPlaceholder("Street address").fill("1 Audit Street");
      await page.getByPlaceholder("City").fill("Sydney");
      await page.getByPlaceholder("State").fill("NSW");
      await page.getByPlaceholder("Postcode").fill("2000");

      const placeOrderButton = page.getByRole("button", { name: "Place Order" });
      const blockedBeforeAck = await placeOrderButton.isDisabled().catch(() => false);

      if (hasTermsCheckbox) {
        await page.evaluate(() => {
          const node = document.getElementById("buyer-terms-ack");
          if (!node) return;
          const checkbox = node as HTMLInputElement;
          if (!checkbox.disabled && !checkbox.checked) checkbox.click();
        });
      }
      const enabledAfterAck = await waitUntil(async () => !(await placeOrderButton.isDisabled().catch(() => true)), 8_000);

      const hasBuyerTermsPersistence = await waitUntil(async () => {
        return page.evaluate(({ email, expectedVersion }) => {
          const raw = window.localStorage.getItem("rre-v1:buyers");
          if (!raw) return false;
          try {
            const buyers = JSON.parse(raw) as Array<Record<string, unknown>>;
            const buyer = buyers.find((entry) => entry.email === email);
            if (!buyer) return false;
            const row = buyer as any;
            return (
              row.buyerTermsAccepted === true &&
              typeof row.buyerTermsAcceptedAt === "string" &&
              row.buyerTermsAcceptedAt.length > 0 &&
              row.buyerTermsVersion === expectedVersion
            );
          } catch {
            return false;
          }
        }, { email: buyerEmail, expectedVersion: "v1.0" });
      }, 8_000);

      await page.reload({ waitUntil: "domcontentloaded" });
      const survivesReload = await waitUntil(async () => {
        return page.evaluate(({ email, expectedVersion }) => {
          const raw = window.localStorage.getItem("rre-v1:buyers");
          if (!raw) return false;
          try {
            const buyers = JSON.parse(raw) as Array<Record<string, unknown>>;
            const buyer = buyers.find((entry) => entry.email === email);
            if (!buyer) return false;
            const row = buyer as any;
            return (
              row.buyerTermsAccepted === true &&
              typeof row.buyerTermsAcceptedAt === "string" &&
              row.buyerTermsAcceptedAt.length > 0 &&
              row.buyerTermsVersion === expectedVersion
            );
          } catch {
            return false;
          }
        }, { email: buyerEmail, expectedVersion: "v1.0" });
      }, 8_000);

      const checkboxLockedAfterReload = await waitUntil(
        async () => page.locator("#buyer-terms-ack").isDisabled().catch(() => false),
        8_000
      );

      if (!termsRouteAvailable) {
        const shot = await captureScreenshot(page, "BUYER-03");
        addCheck(
          "BUYER-03",
          checkTitle("BUYER-03"),
          "FAIL",
          `Buyer terms route unavailable (buyer-terms=${termsRoute1?.status()}, core-legal=${termsRoute2?.status()})`,
          { screenshots: [shot], notes: "" }
        );
      } else if (!hasTermsCheckbox || !hasTermsLink) {
        const shot = await captureScreenshot(page, "BUYER-03");
        addCheck(
          "BUYER-03",
          checkTitle("BUYER-03"),
          "NOT_BUILT",
          `Explicit persisted buyer-terms acknowledgement not found (checkbox=${hasTermsCheckbox}, link=${hasTermsLink}, persisted=${hasBuyerTermsPersistence})`,
          { screenshots: [shot], notes: "" }
        );
      } else if (!hasBuyerTermsPersistence || !blockedBeforeAck || !enabledAfterAck || !survivesReload || !checkboxLockedAfterReload) {
        const shot = await captureScreenshot(page, "BUYER-03");
        addCheck(
          "BUYER-03",
          checkTitle("BUYER-03"),
          "FAIL",
          `terms gating failed (persisted=${hasBuyerTermsPersistence}, blockedBeforeAck=${blockedBeforeAck}, enabledAfterAck=${enabledAfterAck}, survivesReload=${survivesReload}, lockedAfterReload=${checkboxLockedAfterReload})`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("BUYER-03", checkTitle("BUYER-03"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "BUYER-03");
      addCheck("BUYER-03", checkTitle("BUYER-03"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // BUYER-04
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate((cart) => {
        window.localStorage.clear();
        window.localStorage.setItem("rre-v1:cart", JSON.stringify([cart]));
        window.localStorage.setItem("rre-v1:orders", JSON.stringify([]));
      }, seedCartItem());
      await page.goto(`${BASE_URL}/checkout`, { waitUntil: "domcontentloaded" });

      const hasBanner = await page
        .getByTestId("checkout-eligibility-banner")
        .isVisible({ timeout: 4_000 })
        .catch(() => false);
      const ctaHref = await page
        .getByTestId("checkout-eligibility-cta")
        .getAttribute("href")
        .catch(() => "");

      const nonBuyerCtaTarget = ctaHref || "/account/upgrade-to-buyer";
      const nonBuyerUpgradeRes = await page.goto(`${BASE_URL}${nonBuyerCtaTarget}`, { waitUntil: "domcontentloaded" });
      const nonBuyerCtaResolves = Boolean(nonBuyerUpgradeRes) && nonBuyerUpgradeRes.status() < 400;

      await page.goto(`${BASE_URL}/checkout`, { waitUntil: "domcontentloaded" });
      await page.getByLabel("Contact email").fill("redacted@test.local");
      await page.getByPlaceholder("Street address").fill("1 Audit Street");
      await page.getByPlaceholder("City").fill("Sydney");
      await page.getByPlaceholder("State").fill("NSW");
      await page.getByPlaceholder("Postcode").fill("2000");
      const placeOrderButton = page.getByRole("button", { name: "Place Order" });
      const placeOrderDisabled = await placeOrderButton.isDisabled().catch(() => false);
      if (!placeOrderDisabled) {
        await placeOrderButton.click();
      }

      const createdIneligibleOrder = await waitUntil(async () => {
        return page.evaluate(() => {
          const raw = window.localStorage.getItem("rre-v1:orders");
          if (!raw) return false;
          try {
            const orders = JSON.parse(raw) as Array<Record<string, unknown>>;
            return orders.length > 0;
          } catch {
            return false;
          }
        });
      }, 5_000);

      if (!hasBanner || !ctaHref) {
        const shot = await captureScreenshot(page, "BUYER-04");
        addCheck(
          "BUYER-04",
          checkTitle("BUYER-04"),
          "FAIL",
          `Eligibility banner not deterministic (visible=${hasBanner}, ctaHref=${ctaHref || "missing"})`,
          { screenshots: [shot], notes: "" }
        );
      } else if (!nonBuyerCtaResolves) {
        const shot = await captureScreenshot(page, "BUYER-04");
        addCheck(
          "BUYER-04",
          checkTitle("BUYER-04"),
          "FAIL",
          "Eligibility CTA target does not resolve",
          { screenshots: [shot], notes: "" }
        );
      } else if (createdIneligibleOrder) {
        const shot = await captureScreenshot(page, "BUYER-04");
        addCheck(
          "BUYER-04",
          checkTitle("BUYER-04"),
          "FAIL",
          "Ineligible/non-buyer checkout still created an order",
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("BUYER-04", checkTitle("BUYER-04"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "BUYER-04");
      addCheck("BUYER-04", checkTitle("BUYER-04"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // BUYER-05
    try {
      const acceptedAt = new Date().toISOString();
      await page.goto(`${BASE_URL}/checkout`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ session, buyers, cart }) => {
          window.localStorage.clear();
          window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
          window.localStorage.setItem("rre-v1:buyers", JSON.stringify(buyers));
          window.localStorage.setItem("rre-v1:cart", JSON.stringify([cart]));
          window.localStorage.setItem("rre-v1:orders", JSON.stringify([]));
        },
        {
          session: buyerUser,
          buyers: [
            {
              ...seedBuyerRecord(buyerId, buyerEmail),
              buyerTermsAccepted: true,
              buyerTermsAcceptedAt: acceptedAt,
              buyerTermsVersion: "v1.0",
            },
          ],
          cart: seedCartItem(),
        }
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);

      const hasPendingBanner = await page
        .getByText("Complete your buyer profile", { exact: false })
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      const checkoutForm = page.locator("form").first();
      const emailInput = checkoutForm.locator("#email");
      const streetInput = checkoutForm.locator('input[placeholder="Street address"]');
      const cityInput = checkoutForm.locator('input[placeholder="City"]');
      const stateInput = checkoutForm.locator('input[placeholder="State"]');
      const postcodeInput = checkoutForm.locator('input[placeholder="Postcode"]');

      await emailInput.fill(buyerEmail);
      await streetInput.fill("1 Audit Street");
      await cityInput.fill("Sydney");
      await stateInput.fill("NSW");
      await postcodeInput.fill("2000");

      const fieldValuesPersisted = await waitUntil(async () => {
        const [emailValue, streetValue, cityValue, stateValue, postcodeValue] = await Promise.all([
          emailInput.inputValue().catch(() => ""),
          streetInput.inputValue().catch(() => ""),
          cityInput.inputValue().catch(() => ""),
          stateInput.inputValue().catch(() => ""),
          postcodeInput.inputValue().catch(() => ""),
        ]);
        return (
          emailValue === buyerEmail &&
          streetValue === "1 Audit Street" &&
          cityValue === "Sydney" &&
          stateValue === "NSW" &&
          postcodeValue === "2000"
        );
      }, 5_000);

      const placeOrderButton = page.getByRole("button", { name: "Place Order" });
      const placeOrderEnabled = await waitUntil(async () => !(await placeOrderButton.isDisabled().catch(() => true)), 8_000);
      let submitTriggered = false;
      if (placeOrderEnabled && fieldValuesPersisted) {
        await placeOrderButton.click();
        submitTriggered = true;
      }

      let createdOrder:
        | {
            pass: boolean;
            orderId: string;
            statusOk: boolean;
            orderIdOk: boolean;
            hashOk: boolean;
            timelineOk: boolean;
            supplierOk: boolean;
            buyerEmailOk: boolean;
          }
        | null = null;
      await waitUntil(async () => {
        const probe = await page.evaluate(({ email }) => {
          const raw = window.localStorage.getItem("rre-v1:orders");
          if (!raw) return null;
          try {
            const orders = JSON.parse(raw) as Array<Record<string, any>>;
            if (!orders.length) return null;
            const order = orders[orders.length - 1];
            const hasTimeline =
              Array.isArray(order.timeline) && order.timeline.some((entry: any) => entry.status === "PENDING");
            const hasSupplierIds = Array.isArray(order.supplierIds) && order.supplierIds.length > 0;
            const statusOk = order.status === "PENDING";
            const orderIdOk = typeof order.orderId === "string" && order.orderId.length > 0;
            const hashOk = typeof order.pricingSnapshotHash === "string" && order.pricingSnapshotHash.length > 0;
            const timelineOk = hasTimeline;
            const supplierOk = hasSupplierIds;
            const buyerEmailOk = order.buyerEmail === email;
            const pass = statusOk && orderIdOk && hashOk && timelineOk && supplierOk && buyerEmailOk;
            return {
              pass,
              orderId: String(order.orderId || ""),
              statusOk,
              orderIdOk,
              hashOk,
              timelineOk,
              supplierOk,
              buyerEmailOk,
            };
          } catch {
            return null;
          }
        }, { email: buyerEmail });
        if (!probe || !probe.orderId) return false;
        createdOrder = probe;
        return true;
      }, 8_000);

      const invariantPass = Boolean(createdOrder?.pass);
      const createdOrderId = createdOrder?.orderId || "";

      await page.goto(`${BASE_URL}/dashboard/buyer/orders`, { waitUntil: "domcontentloaded" });
      const listedInOrders =
        createdOrderId.length > 0
          ? await page
              .getByText(createdOrderId, { exact: false })
              .first()
              .isVisible({ timeout: 6_000 })
              .catch(() => false)
          : false;
      const detailVisible =
        createdOrderId.length > 0
          ? await (async () => {
              await page.goto(`${BASE_URL}/dashboard/buyer/orders/${encodeURIComponent(createdOrderId)}`, {
                waitUntil: "domcontentloaded",
              });
              const notFoundVisible = await page
                .getByText("Order not found.", { exact: false })
                .first()
                .isVisible({ timeout: 3_000 })
                .catch(() => false);
              const hasOrderTitle = await page
                .getByText(createdOrderId, { exact: false })
                .first()
                .isVisible({ timeout: 6_000 })
                .catch(() => false);
              return hasOrderTitle && !notFoundVisible;
            })()
          : false;
      const projectedForBuyer = listedInOrders || detailVisible;

      if (hasPendingBanner) {
        const shot = await captureScreenshot(page, "BUYER-05");
        addCheck(
          "BUYER-05",
          checkTitle("BUYER-05"),
          "FAIL",
          "Buyer with complete profile is still treated as pending at checkout",
          { screenshots: [shot], notes: "" }
        );
      } else if (!invariantPass) {
        const shot = await captureScreenshot(page, "BUYER-05");
        addCheck(
          "BUYER-05",
          checkTitle("BUYER-05"),
          "FAIL",
          `Order invariants not deterministic (fieldsPersisted=${fieldValuesPersisted}, buttonEnabled=${placeOrderEnabled}, submitTriggered=${submitTriggered}, invariants=${invariantPass}, listed=${listedInOrders}, detailVisible=${detailVisible}, projected=${projectedForBuyer}, statusOk=${Boolean(
            createdOrder?.statusOk
          )}, orderIdOk=${Boolean(createdOrder?.orderIdOk)}, hashOk=${Boolean(createdOrder?.hashOk)}, timelineOk=${Boolean(
            createdOrder?.timelineOk
          )}, supplierOk=${Boolean(createdOrder?.supplierOk)}, buyerEmailOk=${Boolean(createdOrder?.buyerEmailOk)})`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("BUYER-05", checkTitle("BUYER-05"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "BUYER-05");
      addCheck("BUYER-05", checkTitle("BUYER-05"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // BUYER-06
    try {
      const orderId = `ORD-BUYER-PAY-${RUN_ID.slice(-8)}`;
      const now = new Date().toISOString();
      const paidOrder = {
        orderId,
        createdAt: now,
        buyerEmail,
        shippingAddress: {
          line1: "1 Audit Street",
          city: "Sydney",
          state: "NSW",
          postcode: "2000",
          country: "AU",
        },
        items: [seedCartItem()],
        total: 199,
        currency: "aud",
        status: "PAID",
        escrowStatus: "HELD",
        pricingSnapshotHash: `hash-${RUN_ID.slice(-8)}`,
        timeline: [
          { status: "PENDING", timestamp: now },
          { status: "PAID", timestamp: now, note: "Payment confirmed (test mode)" },
        ],
      };

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ session, buyers, order }) => {
          window.localStorage.clear();
          window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
          window.localStorage.setItem("rre-v1:buyers", JSON.stringify(buyers));
          window.localStorage.setItem("rre-v1:orders", JSON.stringify([order]));
        },
        {
          session: buyerUser,
          buyers: [seedBuyerRecord(buyerId, buyerEmail)],
          order: paidOrder,
        }
      );

      await page.goto(`${BASE_URL}/dashboard/buyer/payments`, { waitUntil: "domcontentloaded" });
      const buyerEscrowVisible = await waitUntil(
        async () =>
          page
            .getByText(`${orderId} ·`, { exact: false })
            .first()
            .isVisible()
            .catch(() => false),
        8_000
      );
      const buyerHeldVisible = await page
        .getByText("HELD", { exact: false })
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);

      await page.goto(`${BASE_URL}/dashboard/buyer/orders/${encodeURIComponent(orderId)}`, { waitUntil: "domcontentloaded" });
      const buyerOrderPaidVisible = await waitUntil(
        async () =>
          page
            .getByText("funds held in escrow", { exact: false })
            .first()
            .isVisible()
            .catch(() => false),
        8_000
      );
      const buyerPaidHeldInvariant = await page.evaluate(
        ({ expectedOrderId, expectedBuyerEmail }) => {
          const raw = window.localStorage.getItem("rre-v1:orders");
          if (!raw) return false;
          try {
            const orders = JSON.parse(raw) as Array<Record<string, any>>;
            const order = orders.find((entry) => entry.orderId === expectedOrderId);
            if (!order) return false;
            return (
              order.status === "PAID" &&
              order.escrowStatus === "HELD" &&
              order.buyerEmail === expectedBuyerEmail
            );
          } catch {
            return false;
          }
        },
        { expectedOrderId: orderId, expectedBuyerEmail: buyerEmail }
      );

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ session, order }) => {
          window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
          window.localStorage.setItem("rre-v1:orders", JSON.stringify([order]));
        },
        { session: adminUser, order: paidOrder }
      );
      await page.goto(`${BASE_URL}/dashboard/admin/finance`, { waitUntil: "domcontentloaded" });
      const adminFinanceVisible = await page
        .getByText("Admin Payments, Escrow & Settlement", { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);
      const adminHeldCountVisible = await page
        .getByText("Escrow held", { exact: false })
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);

      if (
        !buyerEscrowVisible ||
        !buyerHeldVisible ||
        !buyerOrderPaidVisible ||
        !buyerPaidHeldInvariant ||
        !adminFinanceVisible ||
        !adminHeldCountVisible
      ) {
        const shot = await captureScreenshot(page, "BUYER-06");
        addCheck(
          "BUYER-06",
          checkTitle("BUYER-06"),
          "FAIL",
          `buyerEscrow=${buyerEscrowVisible}, buyerHeld=${buyerHeldVisible}, buyerPaid=${buyerOrderPaidVisible}, buyerPaidHeldInvariant=${buyerPaidHeldInvariant}, adminFinance=${adminFinanceVisible}, adminHeld=${adminHeldCountVisible}`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("BUYER-06", checkTitle("BUYER-06"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "BUYER-06");
      addCheck("BUYER-06", checkTitle("BUYER-06"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // BUYER-07
    try {
      const orderId = `ORD-BUYER-DOC-${RUN_ID.slice(-8)}`;
      const foreignOrderId = `ORD-OTHER-${orderId}`;
      const now = new Date().toISOString();
      const buyerDocName = `Buyer Audit Document ${RUN_ID.slice(-8)}`;
      const foreignDocName = `Other Buyer Document ${RUN_ID.slice(-8)}`;
      const ownTicketSubject = `Buyer Support Ticket ${RUN_ID.slice(-8)}`;
      const foreignTicketSubject = `Foreign Support Ticket ${RUN_ID.slice(-8)}`;

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({
          session,
          buyers,
          orderId: seededOrderId,
          foreignOrderId: seededForeignOrderId,
          now: seededNow,
          buyerEmailValue,
          buyerDoc,
          foreignDoc,
          ownTicketSubject: seededOwnTicketSubject,
          foreignTicketSubject: seededForeignTicketSubject,
        }) => {
          window.localStorage.clear();
          window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
          window.localStorage.setItem("rre-v1:buyers", JSON.stringify(buyers));
          window.localStorage.setItem(
            "rre-v1:orders",
            JSON.stringify([
              {
                orderId: seededOrderId,
                createdAt: seededNow,
                buyerEmail: buyerEmailValue,
                shippingAddress: { line1: "1", city: "Sydney", state: "NSW", postcode: "2000" },
                items: [],
                total: 10,
                status: "PENDING",
              },
              {
                orderId: seededForeignOrderId,
                createdAt: seededNow,
                buyerEmail: "other-buyer@test.local",
                shippingAddress: { line1: "2", city: "Sydney", state: "NSW", postcode: "2001" },
                items: [],
                total: 20,
                status: "PENDING",
              },
            ])
          );
          window.localStorage.setItem(
            "rre-v1:documents",
            JSON.stringify([
              {
                documentId: `doc-${seededOrderId}`,
                orderId: seededOrderId,
                buyerEmail: buyerEmailValue,
                type: "ORDER_CONFIRMATION",
                name: buyerDoc,
                createdAt: seededNow,
              },
              {
                documentId: `doc-other-${seededOrderId}`,
                orderId: seededForeignOrderId,
                buyerEmail: "other-buyer@test.local",
                type: "ORDER_CONFIRMATION",
                name: foreignDoc,
                createdAt: seededNow,
              },
            ])
          );
          window.localStorage.setItem(
            "rre-v1:tickets",
            JSON.stringify([
              {
                ticketId: `TKT-${seededOrderId}`,
                buyerEmail: buyerEmailValue,
                subject: seededOwnTicketSubject,
                message: "Need order assistance",
                category: "ORDER_ISSUE",
                orderId: seededOrderId,
                status: "OPEN",
                createdAt: seededNow,
                updatedAt: seededNow,
              },
              {
                ticketId: `TKT-OTHER-${seededOrderId}`,
                buyerEmail: "other-buyer@test.local",
                subject: seededForeignTicketSubject,
                message: "Foreign thread",
                category: "GENERAL",
                orderId: seededForeignOrderId,
                status: "OPEN",
                createdAt: seededNow,
                updatedAt: seededNow,
              },
            ])
          );
        },
        {
          session: buyerUser,
          buyers: [seedBuyerRecord(buyerId, buyerEmail)],
          orderId,
          foreignOrderId,
          now,
          buyerEmailValue: buyerEmail,
          buyerDoc: buyerDocName,
          foreignDoc: foreignDocName,
          ownTicketSubject,
          foreignTicketSubject,
        }
      );

      await page.goto(`${BASE_URL}/dashboard/buyer/orders`, { waitUntil: "domcontentloaded" });
      const ownOrderVisible = await waitUntil(
        async () =>
          page
            .getByText(orderId, { exact: false })
            .first()
            .isVisible()
            .catch(() => false),
        8_000
      );
      const foreignOrderVisible = await page
        .getByText(foreignOrderId, { exact: false })
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false);

      await page.goto(`${BASE_URL}/dashboard/buyer/orders/${encodeURIComponent(foreignOrderId)}`, {
        waitUntil: "domcontentloaded",
      });
      const foreignOrderBlocked = await page
        .getByText("No order matches this ID.", { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);

      await page.goto(`${BASE_URL}/dashboard/buyer/documents`, { waitUntil: "domcontentloaded" });
      const seesOwnDoc = await waitUntil(
        async () => {
          const body = await page.locator("body").innerText().catch(() => "");
          return body.includes(buyerDocName);
        },
        8_000
      );
      const seesForeignDoc = await page
        .getByText(foreignDocName, { exact: false })
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false);

      await page.goto(`${BASE_URL}/dashboard/buyer/messages`, { waitUntil: "domcontentloaded" });
      const ownTicketVisible = await waitUntil(
        async () =>
          page
            .getByText(ownTicketSubject, { exact: false })
            .first()
            .isVisible()
            .catch(() => false),
        8_000
      );
      const foreignTicketVisible = await page
        .getByText(foreignTicketSubject, { exact: false })
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false);

      await setSession(page, null, true);
      await page.goto(`${BASE_URL}/dashboard/buyer/orders`, { waitUntil: "domcontentloaded" });
      const unauthBuyerRedirect = await waitForBuyerSigninRedirect(page);

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(({ session }) => {
        window.localStorage.setItem("rre-v1:session", JSON.stringify(session));
      }, { session: { role: "supplier", userId: `supplier-audit-${RUN_ID}`, email: `supplier-audit-${RUN_ID.slice(-8)}@test.local` } });
      await page.goto(`${BASE_URL}/dashboard/buyer/documents`, { waitUntil: "domcontentloaded" });
      const wrongRoleBuyerRedirect = await waitForBuyerSigninRedirect(page);

      const emailInboxUnauth = await getJson(`${BASE_URL}/api/email/inbox`);
      const unauthRejected = emailInboxUnauth.res.status === 401;

      const buyerCookie = await devLogin("buyer", buyerEmail);
      const emailInboxBuyer = buyerCookie
        ? await getJson(`${BASE_URL}/api/email/inbox`, { cookie: buyerCookie })
        : { res: { status: 0 }, json: {} as any };
      const buyerInbox200 = emailInboxBuyer.res.status === 200;

      const supplierCookie = await devLogin("supplier", `supplier-audit-${RUN_ID.slice(-8)}@test.local`);
      const emailInboxSupplier = supplierCookie
        ? await getJson(`${BASE_URL}/api/email/inbox`, { cookie: supplierCookie })
        : { res: { status: 0 }, json: {} as any };
      const wrongRoleInboxRejected = emailInboxSupplier.res.status === 401 || emailInboxSupplier.res.status === 403;
      const wrongRoleInboxNoLeak =
        wrongRoleInboxRejected ||
        (emailInboxSupplier.res.status === 200 &&
          Array.isArray(emailInboxSupplier.json?.items) &&
          !emailInboxSupplier.json.items.some((row: any) => {
            const reference = row?.entityRefs?.referenceId || row?.entityRefs?.orderId || row?.entityRefs?.primaryId;
            return typeof reference === "string" && reference.includes(orderId);
          }));

      if (!buyerCookie) {
        const shot = await captureScreenshot(page, "BUYER-07");
        addCheck(
          "BUYER-07",
          checkTitle("BUYER-07"),
          "NOT_BUILT",
          "Authenticated buyer email-inbox probe unavailable because dev-login session cookie could not be established",
          { screenshots: [shot], notes: "" }
        );
      } else if (
        !ownOrderVisible ||
        foreignOrderVisible ||
        !foreignOrderBlocked ||
        !seesOwnDoc ||
        seesForeignDoc ||
        !ownTicketVisible ||
        foreignTicketVisible ||
        !unauthBuyerRedirect ||
        !wrongRoleBuyerRedirect ||
        !unauthRejected ||
        !buyerInbox200 ||
        !wrongRoleInboxNoLeak
      ) {
        const shot = await captureScreenshot(page, "BUYER-07");
        addCheck(
          "BUYER-07",
          checkTitle("BUYER-07"),
          "FAIL",
          `ownOrder=${ownOrderVisible}, foreignOrderVisible=${foreignOrderVisible}, foreignOrderBlocked=${foreignOrderBlocked}, ownDoc=${seesOwnDoc}, foreignDocVisible=${seesForeignDoc}, ownTicket=${ownTicketVisible}, foreignTicketVisible=${foreignTicketVisible}, unauthRedirect=${unauthBuyerRedirect}, wrongRoleRedirect=${wrongRoleBuyerRedirect}, unauthInbox=${emailInboxUnauth.res.status}, buyerInbox=${emailInboxBuyer.res.status}, wrongRoleInbox=${emailInboxSupplier.res.status}, wrongRoleNoLeak=${wrongRoleInboxNoLeak}`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("BUYER-07", checkTitle("BUYER-07"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "BUYER-07");
      addCheck("BUYER-07", checkTitle("BUYER-07"), "FAIL", err?.message || String(err), {
        screenshots: [shot],
        notes: "",
      });
    }

    // BUYER-08
    try {
      const replayOrderId = `ORD-BUYER-REPLAY-${RUN_ID.slice(-8)}`;
      const now = new Date().toISOString();
      const replayOrder = {
        orderId: replayOrderId,
        createdAt: now,
        buyerEmail,
        shippingAddress: {
          line1: "1 Audit Street",
          city: "Sydney",
          state: "NSW",
          postcode: "2000",
          country: "AU",
        },
        items: [seedCartItem()],
        total: 299,
        currency: "aud",
        status: "PAYMENT_REVIEW_REQUIRED",
        escrowStatus: "HELD",
        deliveredAt: now,
        timeline: [
          { status: "PENDING", timestamp: now },
          { status: "PAID", timestamp: now },
          { status: "PAYMENT_REVIEW_REQUIRED", timestamp: now, note: "Payment requires verification" },
        ],
      };
      const shipmentUpdate = {
        id: `ship-${RUN_ID.slice(-8)}`,
        supplierId: "SUP-AUDIT",
        productSlug: seedCartItem().productSlug,
        milestone: "DELIVERED",
        trackingId: `TRK-BUYER-${RUN_ID.slice(-6)}`,
        timestamp: now,
      };

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ admin, order, update }) => {
          window.localStorage.clear();
          window.localStorage.setItem("rre-v1:session", JSON.stringify(admin));
          window.localStorage.setItem("rre-v1:orders", JSON.stringify([order]));
          window.localStorage.setItem("rre-v1:shipmentUpdates", JSON.stringify([update]));
        },
        { admin: adminUser, order: replayOrder, update: shipmentUpdate }
      );

      await page.goto(`${BASE_URL}/dashboard/admin/executive`, { waitUntil: "domcontentloaded" });
      const adminExecutiveVisible = await page
        .getByText("Admin Executive Overview", { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);

      await page.goto(`${BASE_URL}/dashboard/admin/orders`, { waitUntil: "domcontentloaded" });
      const adminReplayOrderVisible = await waitUntil(
        async () =>
          page
            .getByText(replayOrderId, { exact: false })
            .first()
            .isVisible()
            .catch(() => false),
        8_000
      );
      const adminReplayBuyerVisible = await page
        .getByText(`Buyer ${buyerEmail}`, { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);

      await page.goto(`${BASE_URL}/dashboard/admin/payments`, { waitUntil: "domcontentloaded" });
      const adminPaymentsReplayVisible = await waitUntil(
        async () =>
          page
            .getByText(replayOrderId, { exact: false })
            .first()
            .isVisible()
            .catch(() => false),
        8_000
      );
      const adminPaymentsHeldVisible = await page
        .getByText("HELD", { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);

      await page.context().clearCookies();
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ buyer, buyers, order, update }) => {
          window.localStorage.clear();
          window.localStorage.setItem("rre-v1:session", JSON.stringify(buyer));
          window.localStorage.setItem("rre-v1:buyers", JSON.stringify(buyers));
          window.localStorage.setItem("rre-v1:orders", JSON.stringify([order]));
          window.localStorage.setItem("rre-v1:shipmentUpdates", JSON.stringify([update]));
        },
        { buyer: buyerUser, buyers: [seedBuyerRecord(buyerId, buyerEmail)], order: replayOrder, update: shipmentUpdate }
      );
      await page.goto(`${BASE_URL}/dashboard/buyer/orders`, {
        waitUntil: "domcontentloaded",
      });
      const buyerReplayOrderListed = await waitUntil(
        async () =>
          page
            .getByText(replayOrderId, { exact: false })
            .first()
            .isVisible()
            .catch(() => false),
        8_000
      );
      if (buyerReplayOrderListed) {
        const detailLink = page
          .locator(`a[href="/dashboard/buyer/orders/${encodeURIComponent(replayOrderId)}"]`)
          .first();
        if ((await detailLink.count()) > 0) {
          await detailLink.click();
          await page.waitForURL(`**/dashboard/buyer/orders/${encodeURIComponent(replayOrderId)}`, { timeout: 8_000 }).catch(() => {});
        }
      }
      const buyerReplayOrderVisible = await page
        .getByText(replayOrderId, { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);
      const buyerPaymentReviewVisible = await page
        .getByText("Payment under review", { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);
      const buyerTimelinePaidVisible = await page
        .getByText("Paid", { exact: false })
        .first()
        .isVisible({ timeout: 6_000 })
        .catch(() => false);

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(({ buyer }) => {
        window.localStorage.setItem("rre-v1:session", JSON.stringify(buyer));
      }, { buyer: buyerUser });
      await page.goto(`${BASE_URL}/dashboard/admin/orders`, { waitUntil: "domcontentloaded" });
      const buyerBlockedFromAdmin = await page
        .waitForURL("**/signin?role=admin", { timeout: 6_000 })
        .then(() => true)
        .catch(() => false);

      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(({ supplier }) => {
        window.localStorage.setItem("rre-v1:session", JSON.stringify(supplier));
      }, { supplier: { role: "supplier", userId: `supplier-audit-${RUN_ID}`, email: `supplier-audit-${RUN_ID.slice(-8)}@test.local` } });
      await page.goto(`${BASE_URL}/dashboard/admin/orders`, { waitUntil: "domcontentloaded" });
      const supplierBlockedFromAdmin = await page
        .waitForURL("**/signin?role=admin", { timeout: 6_000 })
        .then(() => true)
        .catch(() => false);

      const feeLedgerUnauth = await getJson(`${BASE_URL}/api/admin/fee-ledger`);
      const feeLedgerSummaryUnauth = await getJson(`${BASE_URL}/api/admin/fee-ledger/summary`);
      const feeLedgerMeUnauth = await getJson(`${BASE_URL}/api/fee-ledger/me`);
      const feeEngineUnauth = await postJson(`${BASE_URL}/api/internal/fee-engine`, {
        triggerEvent: "ORDER_PAID",
        orderId: replayOrderId,
        installerId: "installer-audit",
        baseAmount: 100,
        currency: "AUD",
      });

      const unauthRoleGating =
        feeLedgerUnauth.res.status === 403 &&
        feeLedgerSummaryUnauth.res.status === 403 &&
        feeLedgerMeUnauth.res.status === 401 &&
        feeEngineUnauth.res.status === 401;

      const adminCookie = await devLogin("admin", adminUser.email);
      const authAdminLedger = adminCookie
        ? await getJson(`${BASE_URL}/api/admin/fee-ledger`, { cookie: adminCookie })
        : { res: { status: 0 }, json: {} as any };

      if (!adminCookie) {
        const shot = await captureScreenshot(page, "BUYER-08");
        addCheck(
          "BUYER-08",
          checkTitle("BUYER-08"),
          "NOT_BUILT",
          "Authenticated admin probe unavailable because dev-login session cookie could not be established",
          { screenshots: [shot], notes: "" }
        );
      } else if (
        !adminExecutiveVisible ||
        !adminReplayOrderVisible ||
        !adminReplayBuyerVisible ||
        !adminPaymentsReplayVisible ||
        !adminPaymentsHeldVisible ||
        !buyerReplayOrderVisible ||
        !buyerPaymentReviewVisible ||
        !buyerTimelinePaidVisible ||
        !buyerBlockedFromAdmin ||
        !supplierBlockedFromAdmin ||
        !unauthRoleGating ||
        authAdminLedger.res.status !== 200
      ) {
        const shot = await captureScreenshot(page, "BUYER-08");
        addCheck(
          "BUYER-08",
          checkTitle("BUYER-08"),
          "FAIL",
          `adminExecutive=${adminExecutiveVisible}, adminReplayOrder=${adminReplayOrderVisible}, adminReplayBuyer=${adminReplayBuyerVisible}, adminPaymentsReplay=${adminPaymentsReplayVisible}, adminPaymentsHeld=${adminPaymentsHeldVisible}, buyerReplayOrder=${buyerReplayOrderVisible}, buyerPaymentReview=${buyerPaymentReviewVisible}, buyerTimelinePaid=${buyerTimelinePaidVisible}, buyerBlockedFromAdmin=${buyerBlockedFromAdmin}, supplierBlockedFromAdmin=${supplierBlockedFromAdmin}, unauthRoleGating=${unauthRoleGating}, adminLedger=${authAdminLedger.res.status}`,
          { screenshots: [shot], notes: "" }
        );
      } else {
        addCheck("BUYER-08", checkTitle("BUYER-08"), "PASS");
      }
    } catch (err: any) {
      const shot = await captureScreenshot(page, "BUYER-08");
      addCheck("BUYER-08", checkTitle("BUYER-08"), "FAIL", err?.message || String(err), {
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
        auditId: "buyer-onboarding",
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
      await pdfPage.goto(`${BASE_URL}/__audit/buyer-onboarding/summary?runId=${encodeURIComponent(RUN_ID)}`, {
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
