import { expect, test } from "@playwright/test";

async function loginAs(page: any, role: "admin" | "buyer", email: string) {
  const response = await page.request.post("/api/auth/dev-login", {
    data: { role, email },
  });
  expect(response.ok()).toBeTruthy();
}

test("admin can load suppliers/products scaffold pages", async ({ page }) => {
  await loginAs(page, "admin", "admin-supply@rre.test");

  await page.goto("/admin/suppliers");
  await expect(page.getByRole("heading", { name: "Suppliers" })).toBeVisible();

  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
});

test("non-admin is blocked from supply pages", async ({ page }) => {
  await loginAs(page, "buyer", "buyer-supply@rre.test");
  await page.goto("/admin/suppliers");
  await expect(page).toHaveURL(/\/signin\?role=admin/);
});

test("no moderation mutation controls render when backend is not wired", async ({ page }) => {
  await loginAs(page, "admin", "admin-supply-controls@rre.test");
  await page.goto("/admin/suppliers");

  await expect(page.getByText("NOT AVAILABLE (backend not wired)")).toBeVisible();
  await expect(page.getByRole("button", { name: /approve|suspend|reject|force/i })).toHaveCount(0);
});
