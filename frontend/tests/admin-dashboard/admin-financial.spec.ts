import { expect, test } from "@playwright/test";

async function loginAs(page: any, role: "admin" | "buyer", email: string) {
  const response = await page.request.post("/api/auth/dev-login", {
    data: { role, email },
  });
  expect(response.ok()).toBeTruthy();
}

test("non-admin is blocked from /admin/financial", async ({ page }) => {
  await loginAs(page, "buyer", "buyer-financial@rre.test");
  await page.goto("/admin/financial");
  await expect(page).toHaveURL(/\/signin\?role=admin/);
});

test("admin can load /admin/financial", async ({ page }) => {
  await loginAs(page, "admin", "admin-financial@rre.test");
  await page.goto("/admin/financial");
  await expect(page.getByRole("heading", { name: "Financial Controls" })).toBeVisible();
  await expect(page.getByText("Platform Fee Configuration")).toBeVisible();
});

test("financial config submit requires reason", async ({ page }) => {
  await loginAs(page, "admin", "admin-config@rre.test");
  await page.goto("/admin/financial");

  await page.getByRole("button", { name: "Review fee config change" }).click();
  await page.getByRole("button", { name: "Submit change (reason required)" }).click();

  const confirmButton = page.getByRole("button", { name: "Confirm mutation" });
  await expect(confirmButton).toBeDisabled();
});

test("create hold requires reason", async ({ page }) => {
  await loginAs(page, "admin", "admin-hold@rre.test");
  await page.goto("/admin/financial");

  await page.getByRole("button", { name: "Create hold" }).first().click();
  await page.getByPlaceholder("Enter identifier").fill("ORD-PLAYWRIGHT-1");
  await page.getByRole("button", { name: "Create hold" }).last().click();

  await expect(page.getByText("Reason is required")).toBeVisible();
});

test("override hold requires reason and shows receipt", async ({ page }) => {
  await loginAs(page, "admin", "admin-override@rre.test");

  const createResponse = await page.request.post("/api/admin/dashboard/financial/holds", {
    headers: { origin: "http://localhost:3000" },
    data: {
      subsystem: "PAYMENTS",
      scope: { orderId: "ORD-PLAYWRIGHT-2" },
      reason: "seed hold for override",
      reasonCode: "PW_SEED",
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.goto("/admin/financial");
  await page.getByRole("button", { name: "Override" }).first().click();

  await page.getByRole("button", { name: "Override hold" }).click();
  await expect(page.getByText("Reason is required")).toBeVisible();

  await page.getByPlaceholder("Override rationale").fill("Operational review complete");
  await page.getByPlaceholder("Detailed justification").fill("No unresolved compliance or payment risk.");
  await page.getByRole("button", { name: "Override hold" }).click();

  await expect(page.getByText("Mutation recorded")).toBeVisible();
  await expect(page.getByText("Audit ID:")).toBeVisible();
});
