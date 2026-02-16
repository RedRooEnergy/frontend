import { test, expect } from "@playwright/test";

const STORAGE_PREFIX = "rre-v1:";

async function setLocalStorage(
  page: any,
  entries: Record<string, unknown>
) {
  await page.addInitScript(
    ([prefix, values]) => {
      Object.entries(values).forEach(([key, value]) => {
        localStorage.setItem(prefix + key, JSON.stringify(value));
      });
    },
    [STORAGE_PREFIX, entries]
  );
}

test("checkout banner shows for NON_BUYER on /cart and /checkout", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByTestId("checkout-eligibility-banner")).toBeVisible();
  await expect(page.getByTestId("checkout-eligibility-cta")).toHaveAttribute(
    "href",
    "/register"
  );

  await page.goto("/checkout");
  await expect(page.getByTestId("checkout-eligibility-banner")).toBeVisible();
  await expect(page.getByTestId("checkout-eligibility-cta")).toHaveAttribute(
    "href",
    "/register"
  );
});

test("checkout banner shows for BUYER_PENDING on /cart and /checkout", async ({ page }) => {
  const buyerId = "buyer-pending-1";
  await setLocalStorage(page, {
    session: { role: "buyer", userId: buyerId, email: "pending@buyer.test" },
    buyers: [
      {
        buyerId,
        email: "pending@buyer.test",
        name: "Pending Buyer",
        createdAt: new Date().toISOString(),
      },
    ],
  });

  await page.goto("/cart");
  await expect(page.getByTestId("checkout-eligibility-banner")).toBeVisible();
  await expect(page.getByTestId("checkout-eligibility-cta")).toHaveAttribute(
    "href",
    "/dashboard/buyer/profile"
  );

  await page.goto("/checkout");
  await expect(page.getByTestId("checkout-eligibility-banner")).toBeVisible();
  await expect(page.getByTestId("checkout-eligibility-cta")).toHaveAttribute(
    "href",
    "/dashboard/buyer/profile"
  );
});
