import { categories, Product } from "../data/categories";
import { getAdminFlags, getSupplierOverrides, SupplierProductOverride } from "./store";

export function getCurrentWeekWindow(now = new Date()) {
  const day = now.getDay(); // 0 Sunday
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 1, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

export function isInWindow(now: Date, start: Date, end: Date) {
  return now >= start && now <= end;
}

function mapProducts(): Record<string, Product> {
  const map: Record<string, Product> = {};
  categories.forEach((c) => c.subcategories.forEach((s) => s.products.forEach((p) => (map[p.slug] = p))));
  return map;
}

export function validateWeeklyDealEligibility(subCategorySlug: string, productSlug: string, supplierId: string): boolean {
  const overrides = getSupplierOverrides();
  const { weekStart, weekEnd } = getCurrentWeekWindow();
  // One per sub-category unless admin override
  const adminOverride = getAdminFlags().weeklyDealOverride === true;
  const conflicts = overrides.filter(
    (o) =>
      o.weeklyDeal?.nominated &&
      o.weeklyDeal.weekStart === weekStart.toISOString().slice(0, 10) &&
      o.weeklyDeal.weekEnd === weekEnd.toISOString().slice(0, 10) &&
      o.productSlug !== productSlug &&
      productBelongsToSubCategory(o.productSlug, subCategorySlug)
  );
  if (conflicts.length > 0 && !adminOverride) return false;
  return true;
}

function productBelongsToSubCategory(productSlug: string, subCategorySlug: string) {
  const product = mapProducts()[productSlug];
  return product?.subCategorySlug === subCategorySlug;
}

export function selectWeeklyDeals(): Product[] {
  const map = mapProducts();
  const overrides = getSupplierOverrides();
  const now = new Date();
  const { weekStart, weekEnd } = getCurrentWeekWindow(now);
  const startStr = weekStart.toISOString().slice(0, 10);
  const endStr = weekEnd.toISOString().slice(0, 10);
  const chosen: Record<string, Product> = {};

  // supplier nominations first
  overrides.forEach((o) => {
    if (!o.weeklyDeal?.nominated) return;
    if (o.weeklyDeal.weekStart !== startStr || o.weeklyDeal.weekEnd !== endStr) return;
    const product = map[o.productSlug];
    if (!product) return;
    const sub = product.subCategorySlug;
    if (!chosen[sub]) {
      chosen[sub] = { ...product, price: o.price ?? product.price, originalPrice: o.originalPrice ?? product.originalPrice };
    }
  });

  // fallback to static deals in catalogue if none selected
  categories.forEach((c) =>
    c.subcategories.forEach((s) => {
      if (chosen[s.slug]) return;
      const fallback = s.products.find((p) => p.deal?.isWeeklyDeal && isInWindow(now, new Date(p.deal.dealWeekStart), new Date(p.deal.dealWeekEnd)));
      if (fallback) chosen[s.slug] = fallback;
    })
  );

  return Object.values(chosen);
}
