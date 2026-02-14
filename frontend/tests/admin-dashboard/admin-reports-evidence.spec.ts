import { expect, test } from "@playwright/test";

async function loginAs(page: any, role: "admin" | "buyer", email: string) {
  const response = await page.request.post("/api/auth/dev-login", {
    data: { role, email },
  });
  expect(response.ok()).toBeTruthy();
}

test("admin can load /admin/reports and /admin/evidence", async ({ page }) => {
  await loginAs(page, "admin", "admin-reports@rre.test");

  await page.goto("/admin/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();

  await page.goto("/admin/evidence");
  await expect(page.getByRole("heading", { name: "Evidence" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hash verification helper (UI-only)" })).toBeVisible();
});

test("non-admin is blocked from reports/evidence pages", async ({ page }) => {
  await loginAs(page, "buyer", "buyer-reports@rre.test");

  await page.goto("/admin/reports");
  await expect(page).toHaveURL(/\/signin\?role=admin/);

  await page.goto("/admin/evidence");
  await expect(page).toHaveURL(/\/signin\?role=admin/);
});
