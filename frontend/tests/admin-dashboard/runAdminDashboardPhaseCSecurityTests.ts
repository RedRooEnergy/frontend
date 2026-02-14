import assert from "node:assert/strict";
import { POST as postFinancialConfig } from "../../app/api/admin/dashboard/financial/config/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "../../lib/auth/sessionCookie";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return { id, pass: false, details: String(error?.message || error) };
  }
}

async function withEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void>) {
  const snapshot = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(snapshot)) {
      process.env[key] = value;
    }
  }
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

function makeAdminCookie() {
  const token = createSessionToken({
    role: "admin",
    email: "security-admin@rre.test",
    userId: "security-admin-1",
    ttlHours: 1,
  });
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

async function main() {
  const results: TestResult[] = [];

  results.push(
    await runCheck("ADMIN-SECURITY-DEV-HEADER-ALLOWED-IN-DEV", async () => {
      await withEnv({ NODE_ENV: "development" }, async () => {
        const response = await postFinancialConfig(
          makeRequest("http://localhost/api/admin/dashboard/financial/config", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000",
              "x-dev-admin": "1",
              "x-dev-admin-user": "dev-admin-1",
            },
            body: JSON.stringify({
              reason: "dev security baseline",
              feeConfig: { buyerServiceFee: { mode: "percent", percent: 2 } },
            }),
          })
        );
        assert.equal(response.status, 200);
      });
    })
  );

  results.push(
    await runCheck("ADMIN-SECURITY-PROD-BLOCKS-DEV-HEADERS", async () => {
      await withEnv(
        {
          NODE_ENV: "production",
          RRE_ALLOWED_ORIGINS: "https://admin.redrooenergy.test",
          RRE_SESSION_SECRET: "phase-c-security-secret",
        },
        async () => {
          const response = await postFinancialConfig(
            makeRequest("https://admin.redrooenergy.test/api/admin/dashboard/financial/config", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                origin: "https://admin.redrooenergy.test",
                "x-forwarded-proto": "https",
                "x-dev-admin": "1",
                "x-dev-admin-user": "dev-admin-prod",
              },
              body: JSON.stringify({
                reason: "prod should block test headers",
                feeConfig: { buyerServiceFee: { mode: "percent", percent: 3 } },
              }),
            })
          );
          assert.equal(response.status, 403);
        }
      );
    })
  );

  results.push(
    await runCheck("ADMIN-SECURITY-PROD-REQUIRES-EXACT-ORIGIN", async () => {
      await withEnv(
        {
          NODE_ENV: "production",
          RRE_ALLOWED_ORIGINS: "https://admin.redrooenergy.test",
          RRE_SESSION_SECRET: "phase-c-security-secret",
        },
        async () => {
          const cookie = makeAdminCookie();

          const missingOrigin = await postFinancialConfig(
            makeRequest("https://admin.redrooenergy.test/api/admin/dashboard/financial/config", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                cookie,
                "x-forwarded-proto": "https",
              },
              body: JSON.stringify({
                reason: "missing origin should fail",
                feeConfig: { buyerServiceFee: { mode: "percent", percent: 4 } },
              }),
            })
          );
          assert.equal(missingOrigin.status, 403);

          const disallowedOrigin = await postFinancialConfig(
            makeRequest("https://admin.redrooenergy.test/api/admin/dashboard/financial/config", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                cookie,
                origin: "https://evil.example.com",
                "x-forwarded-proto": "https",
              },
              body: JSON.stringify({
                reason: "disallowed origin should fail",
                feeConfig: { buyerServiceFee: { mode: "percent", percent: 5 } },
              }),
            })
          );
          assert.equal(disallowedOrigin.status, 403);

          const allowedOrigin = await postFinancialConfig(
            makeRequest("https://admin.redrooenergy.test/api/admin/dashboard/financial/config", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                cookie,
                origin: "https://admin.redrooenergy.test",
                "x-forwarded-proto": "https",
              },
              body: JSON.stringify({
                reason: "allowed origin accepted",
                feeConfig: { buyerServiceFee: { mode: "percent", percent: 6 } },
              }),
            })
          );
          assert.notEqual(allowedOrigin.status, 403);
        }
      );
    })
  );

  results.push(
    await runCheck("ADMIN-SECURITY-PROD-REQUIRES-REASON", async () => {
      await withEnv(
        {
          NODE_ENV: "production",
          RRE_ALLOWED_ORIGINS: "https://admin.redrooenergy.test",
          RRE_SESSION_SECRET: "phase-c-security-secret",
        },
        async () => {
          const response = await postFinancialConfig(
            makeRequest("https://admin.redrooenergy.test/api/admin/dashboard/financial/config", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                cookie: makeAdminCookie(),
                origin: "https://admin.redrooenergy.test",
                "x-forwarded-proto": "https",
              },
              body: JSON.stringify({
                feeConfig: { buyerServiceFee: { mode: "percent", percent: 7 } },
              }),
            })
          );
          assert.equal(response.status, 400);
        }
      );
    })
  );

  const passCount = results.filter((result) => result.pass).length;
  const failCount = results.length - passCount;

  for (const result of results) {
    const status = result.pass ? "PASS" : "FAIL";
    // eslint-disable-next-line no-console
    console.log(`${status} ${result.id} ${result.details}`);
  }
  // eslint-disable-next-line no-console
  console.log(`SUMMARY total=${results.length} pass=${passCount} fail=${failCount}`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main();
