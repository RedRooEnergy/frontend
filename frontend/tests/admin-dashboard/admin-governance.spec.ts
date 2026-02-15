import { expect, test } from "@playwright/test";

async function loginAs(page: any, role: "admin" | "buyer", email: string) {
  const response = await page.request.post("/api/auth/dev-login", {
    data: { role, email },
  });
  expect(response.ok()).toBeTruthy();
}

test("admin can load /admin/governance", async ({ page }) => {
  await loginAs(page, "admin", "admin-governance@rre.test");
  await page.goto("/admin/governance");
  await expect(page.getByRole("heading", { name: "Governance Controls" })).toBeVisible();
});

test("non-admin is blocked from /admin/governance/authority", async ({ page }) => {
  await loginAs(page, "buyer", "buyer-governance-authority@rre.test");
  await page.goto("/admin/governance/authority");
  await expect(page).toHaveURL(/\/signin\?role=admin/);
});

test("admin can load /admin/governance/authority with locked manifest hash", async ({ page }) => {
  await loginAs(page, "admin", "admin-governance-authority@rre.test");
  await page.goto("/admin/governance/authority");
  await expect(page.getByRole("heading", { name: "Design Authority Tree" })).toBeVisible();
  await expect(
    page
      .locator("article")
      .filter({ hasText: "Extension" })
      .getByText("EXT-GOV-AUTH-01", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("45edfccb03ae6642c95871e553f96c8d9990f754c42b53fa758c298809026e25"),
  ).toBeVisible();
});

test("change-control create requires reason and rationale", async ({ page }) => {
  await loginAs(page, "admin", "admin-cc@rre.test");
  await page.goto("/admin/governance");

  await page.getByRole("button", { name: "Submit change control" }).click();
  await expect(page.getByText("Reason is required")).toBeVisible();

  await page.locator("#change-control-reason").fill("Need policy adjustment");
  await page.getByRole("button", { name: "Submit change control" }).click();
  await expect(page.getByText("Rationale is required")).toBeVisible();
});

test("run-audit requires reason and shows NOT_IMPLEMENTED receipt", async ({ page }) => {
  await loginAs(page, "admin", "admin-run-audit@rre.test");
  await page.goto("/admin/governance");

  await page.getByRole("button", { name: "Trigger audit" }).click();
  await expect(page.getByText("Reason is required")).toBeVisible();

  await page.getByPlaceholder("Why this audit run is requested").fill("Manual governance verification");
  await page.getByRole("button", { name: "Trigger audit" }).click();

  await expect(page.getByText("Status: NOT_IMPLEMENTED")).toBeVisible();
  await expect(page.getByText(/Audit ID:/).first()).toBeVisible();
});
