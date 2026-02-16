import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

import { analyzeTrend, loadRecentScorecards, type TrendStatus } from "./trendAnalyzer";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const AUDIT_TOKEN_ADMIN = process.env.AUDIT_TOKEN_ADMIN || "";
const AUDIT_TOKEN_REGULATOR = process.env.AUDIT_TOKEN_REGULATOR || "";
const RUN_ID = `${new Date().toISOString().replace(/\W/g, "")}--${crypto.randomBytes(4).toString("hex")}`;

const CHECK_ORDER = [
  "PPS-01",
  "PPS-02",
  "PPS-03",
  "PPS-04",
  "PPS-05",
  "PPS-06",
  "PPS-07",
  "PPS-08",
  "PPS-09",
  "PPS-10",
  "PPS-11",
  "PPS-12",
] as const;

type CheckId = (typeof CHECK_ORDER)[number];
type CheckStatus = "PASS" | "FAIL" | "NOT_BUILT" | "NOT_APPLICABLE";

type CheckResult = {
  id: CheckId;
  title: string;
  status: CheckStatus;
  details: string;
};

const CHECK_TITLES: Record<CheckId, string> = {
  "PPS-01": "Public directory routes return 200",
  "PPS-02": "Public read list endpoint returns array",
  "PPS-03": "Admin endpoints reject unauthorized access",
  "PPS-04": "Admin endpoints accept audit admin token",
  "PPS-05": "Draft to publish stores valid renderedHash",
  "PPS-06": "Slug is immutable after first publish",
  "PPS-07": "Regulator verify returns VALID with regulator token",
  "PPS-08": "Public contact bridge avoids recipient leakage",
  "PPS-09": "Placement contract and lock-week yield valid lockHash",
  "PPS-10": "Public placement projection includes Paid Placement and microsite href",
  "PPS-11": "Suspension returns HTTP 410 for suspended profile",
  "PPS-12": "Admin public-sites UI blocked for non-admin and allowed for admin token",
};

const checks: CheckResult[] = [];

function resolveRepoRoot() {
  const cwd = process.cwd();
  const hasFrontendPackage = fs.existsSync(path.join(cwd, "package.json")) && fs.existsSync(path.join(cwd, "app"));
  return hasFrontendPackage ? path.resolve(cwd, "..") : cwd;
}

const ROOT_DIR = resolveRepoRoot();
const OUT_DIR = path.join(ROOT_DIR, "artefacts", "public-participant-sites");
const HISTORY_DIR = path.join(OUT_DIR, "history");
const SCORECARD_PATH = path.join(OUT_DIR, `scorecard.${RUN_ID}.json`);

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function addCheck(id: CheckId, status: CheckStatus, details = "") {
  checks.push({
    id,
    title: CHECK_TITLES[id],
    status,
    details,
  });
  // eslint-disable-next-line no-console
  console.log(`${status} - ${id}: ${CHECK_TITLES[id]}${details ? ` (${details})` : ""}`);
}

function isAuthRejected(status: number) {
  return status === 401 || status === 403;
}

function makeAuditHeaders(token: string, role: "admin" | "regulator") {
  if (role === "admin") {
    return {
      "Content-Type": "application/json",
      "x-audit-admin-token": token,
    };
  }
  return {
    "Content-Type": "application/json",
    "x-audit-regulator-token": token,
  };
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 8000) {
  const res = await fetchWithTimeout(input, init, timeoutMs);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

function extractId(input: any): string {
  if (!input || typeof input !== "object") return "";
  if (typeof input.id === "string" && input.id) return input.id;
  if (typeof input._id === "string" && input._id) return input._id;
  return "";
}

function buildInstallerDraftContent() {
  return {
    homepage: {
      title: "Public Participant Installer Audit Fixture",
      subtitle: "Deterministic audit fixture",
      overview: "Installer profile used for public participant E2E governance verification.",
    },
    contact: {
      supportHours: "Business hours",
      regions: ["AU"],
    },
    terms: {
      summary: "Public installer terms summary for deterministic audit validation.",
    },
    services: {
      summary: "Grid-connected installer services with governed commissioning process.",
    },
    warranty: {
      summary: "Workmanship warranty and governance-aligned service commitments.",
    },
  };
}

function isoWeekId(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function writeHistoryCopy(scorecardPath: string) {
  ensureDir(HISTORY_DIR);
  const historyCopyPath = path.join(HISTORY_DIR, path.basename(scorecardPath));
  fs.copyFileSync(scorecardPath, historyCopyPath);
}

async function run() {
  ensureDir(OUT_DIR);

  const state = {
    entityType: "INSTALLER",
    entityId: crypto.randomBytes(12).toString("hex"),
    slug: `pps-${RUN_ID.slice(-8)}`,
    profileId: "",
    renderedHash: "",
    weekId: isoWeekId(new Date()),
  };

  const browser = await chromium.launch();

  let trendStatus: TrendStatus = "STABLE";
  let trendReasons: string[] = [];

  try {
    // Gate: BASE_URL must be reachable for deterministic E2E behavior.
    try {
      await fetchWithTimeout(`${BASE_URL}/`, { method: "GET" }, 8000);
    } catch (err: any) {
      const message = `BASE_URL unreachable: ${err?.message || String(err)}`;
      for (const id of CHECK_ORDER) addCheck(id, "FAIL", message);
      return;
    }

    // PPS-01 Governance requirement:
    // Public participant directories are mandatory surfaces.
    // PASS only when all four return 200.
    // NOT_BUILT only when all four are 404.
    // FAIL when partial availability exists (any route missing) or non-200/non-404 statuses appear.
    try {
      const directoryRoutes = ["/suppliers", "/installers", "/certifiers", "/insurance"];
      const statuses: Array<{ route: string; status: number }> = [];

      for (const route of directoryRoutes) {
        const res = await fetchWithTimeout(`${BASE_URL}${route}`, { method: "GET" }, 8000);
        statuses.push({ route, status: res.status });
      }

      const all404 = statuses.every((entry) => entry.status === 404);
      const all200 = statuses.every((entry) => entry.status === 200);

      if (all404) {
        addCheck("PPS-01", "NOT_BUILT", "All required public directory routes returned 404");
      } else if (!all200) {
        addCheck(
          "PPS-01",
          "FAIL",
          `Directories must all be 200. Got: ${statuses.map((s) => `${s.route}:${s.status}`).join(", ")}`
        );
      } else {
        addCheck("PPS-01", "PASS");
      }
    } catch (err: any) {
      addCheck("PPS-01", "FAIL", err?.message || String(err));
    }

    // PPS-02 Governance: public read list endpoint must return an array projection.
    try {
      const listPath = `/api/public-sites/read/list/${state.entityType}`;
      const { res, json } = await fetchJsonWithTimeout(`${BASE_URL}${listPath}`, { method: "GET" }, 8000);

      if (res.status === 404) {
        addCheck("PPS-02", "NOT_BUILT", `Public list endpoint missing (${listPath})`);
      } else if (!res.ok) {
        addCheck("PPS-02", "FAIL", `Public list endpoint returned ${res.status}`);
      } else {
        const rows = Array.isArray((json as any)?.rows)
          ? (json as any).rows
          : Array.isArray((json as any)?.items)
            ? (json as any).items
            : Array.isArray(json)
              ? json
              : null;
        if (!rows) addCheck("PPS-02", "FAIL", "List response does not contain an array payload");
        else addCheck("PPS-02", "PASS", `rows=${rows.length}`);
      }
    } catch (err: any) {
      addCheck("PPS-02", "FAIL", err?.message || String(err));
    }

    // PPS-03 Governance: admin mutation endpoints must reject unauthenticated requests.
    try {
      const unauth = await fetchJsonWithTimeout(
        `${BASE_URL}/api/admin/public-sites/profiles/upsert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityId: state.entityId,
            entityType: state.entityType,
            desiredSlug: state.slug,
          }),
        },
        8000
      );

      if (unauth.res.status === 404) {
        addCheck("PPS-03", "NOT_BUILT", "Admin profile mutation endpoint not implemented");
      } else if (isAuthRejected(unauth.res.status)) {
        addCheck("PPS-03", "PASS");
      } else {
        addCheck("PPS-03", "FAIL", `Expected 401/403 for unauth, got ${unauth.res.status}`);
      }
    } catch (err: any) {
      addCheck("PPS-03", "FAIL", err?.message || String(err));
    }

    // PPS-04 Governance: admin mutation endpoints must accept authenticated audit-admin headers.
    try {
      if (!AUDIT_TOKEN_ADMIN) {
        addCheck("PPS-04", "NOT_BUILT", "AUDIT_TOKEN_ADMIN is not set");
      } else {
        const upsert = await fetchJsonWithTimeout(
          `${BASE_URL}/api/admin/public-sites/profiles/upsert`,
          {
            method: "POST",
            headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
            body: JSON.stringify({
              entityId: state.entityId,
              entityType: state.entityType,
              desiredSlug: state.slug,
            }),
          },
          8000
        );

        if (upsert.res.status === 404) {
          addCheck("PPS-04", "NOT_BUILT", "Admin profile mutation endpoint not implemented");
        } else if (!upsert.res.ok) {
          addCheck("PPS-04", "FAIL", `Admin upsert rejected (${upsert.res.status})`);
        } else {
          state.profileId = extractId((upsert.json as any)?.profile);
          if (!state.profileId) {
            const list = await fetchJsonWithTimeout(
              `${BASE_URL}/api/admin/public-sites/profiles?entityType=${encodeURIComponent(state.entityType)}`,
              {
                method: "GET",
                headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
              },
              8000
            );
            if (list.res.ok) {
              const rows = Array.isArray((list.json as any)?.rows) ? (list.json as any).rows : [];
              const found = rows.find((row: any) => String(row.slug || "").toLowerCase() === state.slug.toLowerCase());
              state.profileId = extractId(found);
            }
          }

          if (!state.profileId) addCheck("PPS-04", "FAIL", "Admin request succeeded but profile id could not be resolved");
          else addCheck("PPS-04", "PASS");
        }
      }
    } catch (err: any) {
      addCheck("PPS-04", "FAIL", err?.message || String(err));
    }

    // PPS-05 Governance: publish flow must generate a deterministic SHA-256 renderedHash.
    try {
      if (!AUDIT_TOKEN_ADMIN || !state.profileId) {
        addCheck("PPS-05", "NOT_BUILT", "Missing admin token or profile id prerequisite");
      } else {
        const statusUpdate = await fetchJsonWithTimeout(
          `${BASE_URL}/api/admin/public-sites/profiles/${encodeURIComponent(state.profileId)}/status`,
          {
            method: "POST",
            headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
            body: JSON.stringify({
              approvalStatus: "APPROVED",
              certificationStatus: "VERIFIED",
              insuranceStatus: "VERIFIED",
              verificationBadges: {
                rreVerified: true,
                complianceVerified: true,
                insuranceVerified: true,
              },
            }),
          },
          8000
        );

        if (statusUpdate.res.status === 404) {
          addCheck("PPS-05", "NOT_BUILT", "Profile status endpoint not implemented");
        } else if (!statusUpdate.res.ok) {
          addCheck("PPS-05", "FAIL", `Status update failed (${statusUpdate.res.status})`);
        } else {
          const draft = await fetchJsonWithTimeout(
            `${BASE_URL}/api/admin/public-sites/draft/upsert`,
            {
              method: "POST",
              headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
              body: JSON.stringify({
                entityId: state.entityId,
                entityType: state.entityType,
                contentJSON: buildInstallerDraftContent(),
                seoMeta: {
                  title: "Installer Public Participant Audit Fixture",
                  description: "Deterministic audit fixture profile",
                  canonicalPath: `/installers/${state.slug}`,
                },
                heroImage: "",
                logo: "",
                desiredSlug: state.slug,
              }),
            },
            8000
          );

          if (draft.res.status === 404) {
            addCheck("PPS-05", "NOT_BUILT", "Draft upsert endpoint not implemented");
          } else if (!draft.res.ok) {
            addCheck("PPS-05", "FAIL", `Draft upsert failed (${draft.res.status})`);
          } else {
            const publish = await fetchJsonWithTimeout(
              `${BASE_URL}/api/admin/public-sites/publish`,
              {
                method: "POST",
                headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
                body: JSON.stringify({
                  entityId: state.entityId,
                  entityType: state.entityType,
                }),
              },
              8000
            );

            if (publish.res.status === 404) {
              addCheck("PPS-05", "NOT_BUILT", "Publish endpoint not implemented");
            } else if (!publish.res.ok) {
              addCheck("PPS-05", "FAIL", `Publish failed (${publish.res.status})`);
            } else {
              const renderedHash = String((publish.json as any)?.renderedHash || "");
              if (!/^[a-f0-9]{64}$/i.test(renderedHash)) {
                addCheck("PPS-05", "FAIL", "Publish response missing valid SHA-256 renderedHash");
              } else {
                state.renderedHash = renderedHash;
                addCheck("PPS-05", "PASS");
              }
            }
          }
        }
      }
    } catch (err: any) {
      addCheck("PPS-05", "FAIL", err?.message || String(err));
    }

    // PPS-06 Governance: slug must be immutable after first publish.
    try {
      if (!AUDIT_TOKEN_ADMIN || !state.renderedHash) {
        addCheck("PPS-06", "NOT_BUILT", "Missing publish prerequisite for slug immutability check");
      } else {
        const mutate = await fetchJsonWithTimeout(
          `${BASE_URL}/api/admin/public-sites/draft/upsert`,
          {
            method: "POST",
            headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
            body: JSON.stringify({
              entityId: state.entityId,
              entityType: state.entityType,
              contentJSON: buildInstallerDraftContent(),
              desiredSlug: `${state.slug}-changed`,
            }),
          },
          8000
        );

        if (mutate.res.status === 404) {
          addCheck("PPS-06", "NOT_BUILT", "Draft upsert endpoint not implemented");
        } else if (mutate.res.status >= 400) {
          addCheck("PPS-06", "PASS", `Slug mutation rejected (${mutate.res.status})`);
        } else {
          addCheck("PPS-06", "FAIL", "Slug mutation was accepted after publish");
        }
      }
    } catch (err: any) {
      addCheck("PPS-06", "FAIL", err?.message || String(err));
    }

    // PPS-07 Governance: regulator hash verification must return VALID with regulator token.
    try {
      if (!state.renderedHash) {
        addCheck("PPS-07", "NOT_BUILT", "Missing renderedHash prerequisite");
      } else if (!AUDIT_TOKEN_REGULATOR) {
        addCheck("PPS-07", "NOT_BUILT", "AUDIT_TOKEN_REGULATOR is not set");
      } else {
        const verify = await fetchJsonWithTimeout(
          `${BASE_URL}/api/regulator/public-site/verify?hash=${encodeURIComponent(state.renderedHash)}`,
          {
            method: "GET",
            headers: makeAuditHeaders(AUDIT_TOKEN_REGULATOR, "regulator"),
          },
          8000
        );

        if (verify.res.status === 404) {
          addCheck("PPS-07", "NOT_BUILT", "Regulator verify endpoint not implemented");
        } else if (!verify.res.ok) {
          addCheck("PPS-07", "FAIL", `Regulator verify failed (${verify.res.status})`);
        } else if (String((verify.json as any)?.status || "") !== "VALID") {
          addCheck("PPS-07", "FAIL", `Regulator verify status=${String((verify.json as any)?.status || "UNKNOWN")}`);
        } else {
          addCheck("PPS-07", "PASS");
        }
      }
    } catch (err: any) {
      addCheck("PPS-07", "FAIL", err?.message || String(err));
    }

    // PPS-08 Governance: contact bridge must not leak recipient addresses/identifiers.
    try {
      const contact = await fetchJsonWithTimeout(
        `${BASE_URL}/api/public/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: state.entityType,
            slug: state.slug,
            name: "Audit Requestor",
            email: `audit-${RUN_ID}@example.test`,
            message: "Please share installer capability details.",
            channel: "EMAIL",
          }),
        },
        8000
      );

      if (contact.res.status === 404) {
        addCheck("PPS-08", "NOT_BUILT", "Public contact endpoint not implemented");
      } else if (!contact.res.ok) {
        addCheck("PPS-08", "FAIL", `Public contact endpoint failed (${contact.res.status})`);
      } else {
        const payload = contact.json as Record<string, unknown>;
        const serial = JSON.stringify(payload).toLowerCase();
        const leaked =
          serial.includes("recipient") ||
          serial.includes("\"to\"") ||
          serial.includes("wechat_id") ||
          serial.includes("direct_email") ||
          serial.includes("contact_email");
        if (leaked) addCheck("PPS-08", "FAIL", "Contact response leaked recipient or direct channel detail");
        else addCheck("PPS-08", "PASS");
      }
    } catch (err: any) {
      addCheck("PPS-08", "FAIL", err?.message || String(err));
    }

    // PPS-09 Governance: weekly placement lock must bind snapshotVersion and lockHash deterministically.
    try {
      if (!AUDIT_TOKEN_ADMIN) {
        addCheck("PPS-09", "NOT_BUILT", "AUDIT_TOKEN_ADMIN is not set");
      } else {
        const contract = await fetchJsonWithTimeout(
          `${BASE_URL}/api/admin/public-sites/placements/contracts`,
          {
            method: "POST",
            headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
            body: JSON.stringify({
              entityId: state.entityId,
              entityType: state.entityType,
              tier: "FEATURED",
              weeklyFeeAUD: 60,
              autoRenew: false,
              status: "ACTIVE",
            }),
          },
          8000
        );

        if (contract.res.status === 404) {
          addCheck("PPS-09", "NOT_BUILT", "Placement contracts endpoint not implemented");
        } else if (!contract.res.ok) {
          addCheck("PPS-09", "FAIL", `Placement contract create failed (${contract.res.status})`);
        } else {
          const lock = await fetchJsonWithTimeout(
            `${BASE_URL}/api/admin/public-sites/placements/lock-week`,
            {
              method: "POST",
              headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
              body: JSON.stringify({
                weekId: state.weekId,
                capsByTier: { BASIC: 10, FEATURED: 5, SPOTLIGHT: 2 },
              }),
            },
            8000
          );

          if (lock.res.status === 404) {
            addCheck("PPS-09", "NOT_BUILT", "Placement lock-week endpoint not implemented");
          } else if (!lock.res.ok) {
            addCheck("PPS-09", "FAIL", `Placement lock-week failed (${lock.res.status})`);
          } else {
            const locks = await fetchJsonWithTimeout(
              `${BASE_URL}/api/admin/public-sites/placements/locks?weekId=${encodeURIComponent(state.weekId)}`,
              {
                method: "GET",
                headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
              },
              8000
            );

            if (!locks.res.ok) {
              addCheck("PPS-09", "FAIL", `Placement locks fetch failed (${locks.res.status})`);
            } else {
              const rows = Array.isArray((locks.json as any)?.rows) ? (locks.json as any).rows : [];
              const entry = rows.find((row: any) => String(row.entityId || row.entity_id || "") === state.entityId);
              const lockHash = String(entry?.lockHash || entry?.lock_hash || "");
              const snapshotVersion = Number(entry?.snapshotVersion || entry?.snapshot_version || 0);
              if (!entry || !/^[a-f0-9]{64}$/i.test(lockHash) || !Number.isFinite(snapshotVersion) || snapshotVersion <= 0) {
                addCheck("PPS-09", "FAIL", `Invalid or missing lock entry for seeded entity (rows=${rows.length})`);
              } else {
                addCheck("PPS-09", "PASS");
              }
            }
          }
        }
      }
    } catch (err: any) {
      addCheck("PPS-09", "FAIL", err?.message || String(err));
    }

    // PPS-10 Governance: public placement projection must display paid label and deterministic microsite href.
    try {
      const placements = await fetchJsonWithTimeout(
        `${BASE_URL}/api/public-sites/catalogue/placements/${encodeURIComponent(state.weekId)}`,
        { method: "GET" },
        8000
      );

      if (placements.res.status === 404) {
        addCheck("PPS-10", "NOT_BUILT", "Public placement projection endpoint not implemented");
      } else if (!placements.res.ok) {
        addCheck("PPS-10", "FAIL", `Public placement projection failed (${placements.res.status})`);
      } else {
        const serial = JSON.stringify(placements.json).toLowerCase();
        const hasPaidPlacementLabel = serial.includes("paid placement");
        const expectedHref = `/installers/${state.slug}`.toLowerCase();
        const hasMicrositeHref = serial.includes(expectedHref);
        if (!hasPaidPlacementLabel || !hasMicrositeHref) {
          addCheck(
            "PPS-10",
            "FAIL",
            `Projection missing paid label or microsite href (paid=${hasPaidPlacementLabel}, href=${hasMicrositeHref})`
          );
        } else {
          addCheck("PPS-10", "PASS");
        }
      }
    } catch (err: any) {
      addCheck("PPS-10", "FAIL", err?.message || String(err));
    }

    // PPS-11 Governance: suspended participant must return 410 controlled unavailability.
    try {
      if (!AUDIT_TOKEN_ADMIN || !state.profileId) {
        addCheck("PPS-11", "NOT_BUILT", "Missing admin token or profile id prerequisite");
      } else {
        const suspend = await fetchJsonWithTimeout(
          `${BASE_URL}/api/admin/public-sites/profiles/${encodeURIComponent(state.profileId)}/status`,
          {
            method: "POST",
            headers: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
            body: JSON.stringify({ approvalStatus: "SUSPENDED" }),
          },
          8000
        );

        if (suspend.res.status === 404) {
          addCheck("PPS-11", "NOT_BUILT", "Suspension endpoint not implemented");
        } else if (!suspend.res.ok) {
          addCheck("PPS-11", "FAIL", `Suspension update failed (${suspend.res.status})`);
        } else {
          const readRes = await fetchWithTimeout(
            `${BASE_URL}/api/public-sites/read/${encodeURIComponent(state.entityType)}/${encodeURIComponent(state.slug)}`,
            { method: "GET" },
            8000
          );
          if (readRes.status === 410) addCheck("PPS-11", "PASS");
          else addCheck("PPS-11", "FAIL", `Expected 410 after suspension, got ${readRes.status}`);
        }
      }
    } catch (err: any) {
      addCheck("PPS-11", "FAIL", err?.message || String(err));
    }

    // PPS-12 Governance: admin public-sites UI routes must block non-admin and allow admin.
    try {
      const targetRoutes = ["/admin/public-sites", "/admin/public-sites/placements"];
      const unauthContext = await browser.newContext();
      const unauthPage = await unauthContext.newPage();
      const unauthResults: Array<{ route: string; status: number; blocked: boolean }> = [];

      for (const route of targetRoutes) {
        const res = await unauthPage.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        const status = res?.status() ?? 0;
        const blocked =
          status === 401 ||
          status === 403 ||
          unauthPage.url().includes("/signin") ||
          (await unauthPage.getByText("Unauthorized", { exact: false }).count()) > 0 ||
          (await unauthPage.getByText("Access denied", { exact: false }).count()) > 0;
        unauthResults.push({ route, status, blocked });
      }
      await unauthContext.close();

      const allMissing = unauthResults.every((entry) => entry.status === 404);
      if (allMissing) {
        addCheck("PPS-12", "NOT_BUILT", "Admin public-sites UI routes are not implemented");
      } else if (!AUDIT_TOKEN_ADMIN) {
        addCheck("PPS-12", "NOT_BUILT", "AUDIT_TOKEN_ADMIN is not set");
      } else {
        const nonAdminLeak = unauthResults.some((entry) => entry.status !== 404 && !entry.blocked);
        const adminContext = await browser.newContext({
          extraHTTPHeaders: makeAuditHeaders(AUDIT_TOKEN_ADMIN, "admin"),
        });
        const adminPage = await adminContext.newPage();
        const adminResults: Array<{ route: string; status: number; allowed: boolean }> = [];

        for (const route of targetRoutes) {
          const res = await adminPage.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
          const status = res?.status() ?? 0;
          const allowed = !adminPage.url().includes("/signin") && status > 0 && status < 400;
          adminResults.push({ route, status, allowed });
        }
        await adminContext.close();

        const adminBlocked = adminResults.some((entry) => entry.status !== 404 && !entry.allowed);
        if (nonAdminLeak || adminBlocked) {
          addCheck(
            "PPS-12",
            "FAIL",
            `nonAdminLeak=${nonAdminLeak}, adminBlocked=${adminBlocked}, unauth=${unauthResults.map((r) => `${r.route}:${r.status}`).join("|")}, admin=${adminResults.map((r) => `${r.route}:${r.status}`).join("|")}`
          );
        } else {
          addCheck("PPS-12", "PASS");
        }
      }
    } catch (err: any) {
      addCheck("PPS-12", "FAIL", err?.message || String(err));
    }
  } finally {
    await browser.close();

    const checkById = new Map<CheckId, CheckResult>();
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
        };
      }
      return check;
    });

    const counts = orderedChecks.reduce(
      (acc, check) => {
        acc.totalChecks += 1;
        if (check.status === "PASS") acc.passCount += 1;
        if (check.status === "FAIL") acc.failCount += 1;
        if (check.status === "NOT_BUILT") acc.notBuiltCount += 1;
        if (check.status === "NOT_APPLICABLE") acc.notApplicableCount += 1;
        return acc;
      },
      { totalChecks: 0, passCount: 0, failCount: 0, notBuiltCount: 0, notApplicableCount: 0 }
    );

    const overall: "PASS" | "FAIL" = counts.failCount > 0 || counts.notBuiltCount > 0 ? "FAIL" : "PASS";

    // PASS-2: load last N-1 previous scorecards from history and compute trend
    ensureDir(HISTORY_DIR);
    const previous = loadRecentScorecards(HISTORY_DIR, 5); // newest-first, excludes current (not yet written)
    const { trendStatus: computedTrend, reasons } = analyzeTrend({
      current: {
        meta: { runId: RUN_ID, timestampUtc: new Date().toISOString(), baseUrl: BASE_URL, environment: process.env.AUDIT_ENV || "local" },
        summary: {
          overall,
          totalChecks: counts.totalChecks,
          passCount: counts.passCount,
          failCount: counts.failCount,
          notBuiltCount: counts.notBuiltCount,
          notApplicableCount: counts.notApplicableCount,
        },
      },
      previous,
      windowSize: 5,
    });

    trendStatus = computedTrend;
    trendReasons = reasons;

    const scorecard = {
      meta: {
        auditId: "public-participant-sites-e2e",
        runId: RUN_ID,
        timestampUtc: new Date().toISOString(),
        baseUrl: BASE_URL,
        environment: process.env.AUDIT_ENV || "local",
      },
      summary: {
        overall,
        trendStatus,
        totalChecks: counts.totalChecks,
        passCount: counts.passCount,
        failCount: counts.failCount,
        notBuiltCount: counts.notBuiltCount,
        notApplicableCount: counts.notApplicableCount,
      },
      checks: orderedChecks,
    };

    ensureDir(OUT_DIR);
    fs.writeFileSync(SCORECARD_PATH, JSON.stringify(scorecard, null, 2));
    // eslint-disable-next-line no-console
    console.log(`Scorecard written: ${SCORECARD_PATH}`);

    // PASS-2: copy into history
    writeHistoryCopy(SCORECARD_PATH);

    if (trendStatus === "REGRESSION") {
      // eslint-disable-next-line no-console
      console.error(`REGRESSION DETECTED: ${trendReasons.join(" | ")}`);
      process.exitCode = 1;
      return;
    }

    if (overall === "FAIL") process.exitCode = 1;
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
