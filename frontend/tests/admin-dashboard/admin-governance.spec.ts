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

test("change-control create requires reason and rationale", async ({ page }) => {
  await loginAs(page, "admin", "admin-cc@rre.test");
  await page.goto("/admin/governance");

  await page.getByRole("button", { name: "Submit change control" }).click();
  await expect(page.getByText("Reason is required")).toBeVisible();

  await page.getByLabel("Reason (required)").first().fill("Need policy adjustment");
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
  await expect(page.getByText("Audit ID:")).toBeVisible();
});
