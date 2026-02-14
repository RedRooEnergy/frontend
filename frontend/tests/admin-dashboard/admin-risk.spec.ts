import { expect, test } from "@playwright/test";

async function loginAs(page: any, role: "admin" | "buyer", email: string) {
  const response = await page.request.post("/api/auth/dev-login", {
    data: { role, email },
  });
  expect(response.ok()).toBeTruthy();
}

test("admin can load /admin/risk and see holds panel", async ({ page }) => {
  await loginAs(page, "admin", "admin-risk@rre.test");

  const createResponse = await page.request.post("/api/admin/dashboard/financial/holds", {
    headers: { origin: "http://localhost:3000" },
    data: {
      subsystem: "RISK",
      scope: { orderId: "ORD-RISK-1" },
      reason: "seed risk hold",
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.goto("/admin/risk");
  await expect(page.getByRole("heading", { name: "Risk & Incidents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operational Holds (Live)" })).toBeVisible();
});

test("non-admin is blocked from /admin/risk", async ({ page }) => {
  await loginAs(page, "buyer", "buyer-risk@rre.test");
  await page.goto("/admin/risk");
  await expect(page).toHaveURL(/\/signin\?role=admin/);
});
