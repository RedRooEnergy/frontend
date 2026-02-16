"use client";
import { getAdminFlags, getSupplierOverrides, setAdminFlags } from "../../../../lib/store";
import { categories } from "../../../../data/categories";
import { getCurrentWeekWindow } from "../../../../lib/governanceDeals";

export default function AdminDealsPage() {
  const overrides = getSupplierOverrides().filter((o) => o.weeklyDeal?.nominated);
  const flags = getAdminFlags();
  const { weekStart, weekEnd } = getCurrentWeekWindow();
  const startStr = weekStart.toISOString().slice(0, 10);
  const endStr = weekEnd.toISOString().slice(0, 10);

  const list = overrides
    .filter((o) => o.weeklyDeal?.weekStart === startStr && o.weeklyDeal?.weekEnd === endStr)
    .map((o) => {
      const cat = categories
        .flatMap((c) => c.subcategories)
        .find((s) => s.products.some((p) => p.slug === o.productSlug));
      return {
        productSlug: o.productSlug,
        subCategory: cat?.slug ?? "",
        supplierId: o.supplierId,
        price: o.price,
      };
    });

  const conflicts = list.reduce<Record<string, number>>((acc, item) => {
    acc[item.subCategory] = (acc[item.subCategory] || 0) + 1;
    return acc;
  }, {});

  const toggleOverride = () => {
    setAdminFlags({ ...flags, weeklyDealOverride: !flags.weeklyDealOverride });
    location.reload();
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Grand-Master Deals Oversight</h1>
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">
              Week window: {startStr} to {endStr}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={flags.weeklyDealOverride === true} onChange={toggleOverride} />
              <span>Enable Grand-Master Override</span>
            </label>
          </div>
          <div className="grid grid-cols-4 text-sm font-semibold border-b pb-2">
            <span>Product</span>
            <span>Sub-category</span>
            <span>Supplier</span>
            <span>Price</span>
          </div>
          {list.length === 0 && <p className="text-sm text-muted">No nominated deals for this week.</p>}
          {list.map((item) => (
            <div key={item.productSlug} className="grid grid-cols-4 text-sm py-2 border-b last:border-b-0">
              <span>{item.productSlug}</span>
              <span>{item.subCategory}</span>
              <span>{item.supplierId}</span>
              <span>{item.price ? `$${item.price.toFixed(2)}` : "-"}</span>
            </div>
          ))}
          {Object.entries(conflicts)
            .filter(([, count]) => count > 1 && !flags.weeklyDealOverride)
            .map(([sub, count]) => (
              <div key={sub} className="text-sm text-red-600">
                Conflict: {count} nominations for {sub}. Override is OFF, only the first will be used.
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}
