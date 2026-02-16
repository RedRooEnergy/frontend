import Link from "next/link";
import type { Product } from "../data/categories";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-surface rounded-2xl shadow-card border p-4 flex flex-col gap-2 hover:shadow-soft transition"
    >
      <div className="h-32 bg-brand-100 rounded-xl flex items-center justify-center text-sm text-brand-800">
        Image placeholder
      </div>
      <div className="text-lg font-semibold text-strong">{product.name}</div>
      <p className="text-sm text-muted">{product.shortDescription}</p>
      <div className="flex flex-wrap gap-2 text-xs text-brand-800">
        {product.complianceTags.map((tag) => (
          <span key={tag} className="px-2 py-1 bg-brand-200 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
