import Link from "next/link";
import type { Category, SubCategory } from "../data/categories";

interface CategoryPageLayoutProps {
  title: string;
  subtitle: string;
  subcategories: SubCategory[];
  complianceNote?: string;
}

export default function CategoryPageLayout({ title, subtitle, subcategories, complianceNote }: CategoryPageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="bg-brand-100">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-base text-muted">{subtitle}</p>
        </div>
      </section>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subcategories.map((sub) => (
            <Link
              key={sub.slug}
              href={`/categories/${sub.products[0].categorySlug}/${sub.slug}`}
              className="bg-surface rounded-2xl shadow-card border p-4 hover:shadow-soft transition block"
            >
              <div className="text-lg font-semibold mb-2">{sub.name}</div>
              <p className="text-sm text-muted">Static overview of {sub.name.toLowerCase()} options available within this category.</p>
            </Link>
          ))}
        </div>
        {complianceNote && (
          <div className="bg-brand-800 text-brand-100 rounded-2xl p-4 shadow-card">
            <p className="text-sm">{complianceNote}</p>
          </div>
        )}
      </main>
    </div>
  );
}
