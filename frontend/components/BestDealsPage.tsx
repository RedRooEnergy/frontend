"use client";

import { useMemo, useState } from "react";
import { categories } from "../data/categories";
import BestDealCard from "./BestDealCard";
import { getBestDealsBySubCategory } from "../lib/homepageSelection";

export default function BestDealsPage() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const deals = useMemo(() => getBestDealsBySubCategory(), []);
  const filtered = categoryFilter === "all" ? deals : deals.filter((deal) => deal.categorySlug === categoryFilter);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Weekly Best Deals</h1>
        <p className="text-sm text-muted">Platform-approved deals across all categories.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label htmlFor="best-deals-category" className="text-sm font-medium text-strong">
            Category
          </label>
          <select
            id="best-deals-category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="px-3 py-2 rounded-md border bg-surface text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`px-3 py-2 rounded-md border ${
              view === "grid" ? "bg-brand-100 font-semibold" : "bg-surface"
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-3 py-2 rounded-md border ${
              view === "list" ? "bg-brand-100 font-semibold" : "bg-surface"
            }`}
          >
            List
          </button>
        </div>
      </div>

      <div className="text-xs text-muted">
        Showing {filtered.length} deal{filtered.length === 1 ? "" : "s"} (1 per subcategory)
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted">No qualifying deals available for the selected category.</div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "flex flex-col gap-4"}>
          {filtered.map((deal) => (
            <BestDealCard key={deal.product.slug} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
