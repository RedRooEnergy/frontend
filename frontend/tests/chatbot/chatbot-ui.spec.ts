import { expect, test } from "@playwright/test";

async function loginAs(page: any, role: "buyer" | "supplier" | "admin", email: string) {
  const response = await page.request.post("/api/auth/dev-login", {
    data: {
      role,
      email,
    },
  });
  expect(response.ok()).toBeTruthy();
}

test("buyer can open /dashboard/buyer/messages", async ({ page }) => {
  await loginAs(page, "buyer", "buyer-smoke@rre.test");
  await page.goto("/dashboard/buyer/messages");
  await expect(page.getByRole("heading", { name: "Buyer Operational Chat" })).toBeVisible();
});

test("supplier can open /dashboard/supplier/messages", async ({ page }) => {
  await loginAs(page, "supplier", "supplier-smoke@rre.test");
  await page.goto("/dashboard/supplier/messages");
  await expect(page.getByRole("heading", { name: "Supplier Operational Chat" })).toBeVisible();
});

test("admin can open /dashboard/admin/conversations", async ({ page }) => {
  await loginAs(page, "admin", "admin-smoke@rre.test");

  const createThread = await page.request.post("/api/chat/threads", {
    data: {
      type: "ADMIN",
      relatedEntityType: "NONE",
      relatedEntityId: null,
    },
    headers: {
      origin: "http://localhost:3000",
    },
  });
  expect(createThread.ok()).toBeTruthy();

  await page.goto("/dashboard/admin/conversations");
  await expect(page.getByRole("heading", { name: "Admin Conversation Monitor" })).toBeVisible();
});
