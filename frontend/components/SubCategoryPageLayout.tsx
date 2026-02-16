import Link from "next/link";
import type { Category, SubCategory } from "../data/categories";
import ProductCard from "./ProductCard";

interface SubCategoryPageLayoutProps {
  category: Category;
  subcategory: SubCategory;
}

const sorts = ["Popular", "New", "Price"];

export default function SubCategoryPageLayout({ category, subcategory }: SubCategoryPageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="bg-brand-100">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-2">
          <div className="text-sm text-muted">
            {category.name} / {subcategory.name}
          </div>
          <h1 className="text-2xl font-bold">{subcategory.name}</h1>
          <p className="text-base text-muted">Static product grid for {subcategory.name.toLowerCase()} within {category.name}.</p>
        </div>
      </section>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>Sort:</span>
          {sorts.map((s) => (
            <span key={s} className="px-3 py-1 rounded-full bg-surface border text-strong">
              {s}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subcategory.products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </main>
    </div>
  );
}
