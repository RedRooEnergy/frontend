import Link from "next/link";
import type { BestDealItem } from "../lib/homepageSelection";

interface BestDealCardProps {
  deal: BestDealItem;
}

export default function BestDealCard({ deal }: BestDealCardProps) {
  const { product, qualifier, subCategoryName } = deal;
  const complianceTags = product.complianceTags.filter((tag) => tag !== "None");
  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-surface rounded-2xl shadow-card border p-4 flex flex-col gap-2 hover:shadow-soft transition"
    >
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>{"★".repeat(Math.floor(product.rating))}{product.rating % 1 ? "½" : ""}</span>
        <span>{product.rating.toFixed(1)}</span>
      </div>
      <div className="text-sm font-semibold text-strong line-clamp-2">{product.name}</div>
      <div className="text-xs text-muted">{product.supplierName}</div>
      <div className="text-xs text-muted">{subCategoryName}</div>
      <div className="text-lg font-bold text-strong">AUD ${product.price.toFixed(0)}</div>
      <div className="text-xs text-muted">{product.shippingNote}</div>
      <div className="text-xs font-medium text-brand-800">{qualifier}</div>
      <div className="flex flex-wrap gap-1 text-[11px] text-brand-800">
        {complianceTags.length === 0 ? (
          <span className="px-2 py-1 bg-brand-200 rounded-full">Compliance pending</span>
        ) : (
          complianceTags.map((tag) => (
            <span key={tag} className="px-2 py-1 bg-brand-200 rounded-full">
              {tag}
            </span>
          ))
        )}
      </div>
      <div className="text-xs font-semibold text-brand-800">View deal</div>
    </Link>
  );
}
