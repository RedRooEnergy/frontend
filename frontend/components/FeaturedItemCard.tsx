import Link from "next/link";
import Image from "next/image";
import type { FeaturedItem } from "../lib/homepageSelection";

interface FeaturedItemCardProps {
  item: FeaturedItem;
}

export default function FeaturedItemCard({ item }: FeaturedItemCardProps) {
  const { product, categoryName } = item;
  const complianceTags = product.complianceTags.filter((tag) => tag !== "None");

  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-surface rounded-2xl shadow-card border p-4 flex flex-col gap-2 hover:shadow-soft transition"
    >
      <div className="h-28 bg-brand-100 rounded-xl overflow-hidden flex items-center justify-center">
        <Image
          src={product.image}
          alt={product.name}
          width={220}
          height={140}
          sizes="(min-width: 768px) 200px, 100vw"
          className="object-contain h-full w-full"
        />
      </div>
      <div className="text-[11px] uppercase tracking-wide text-brand-700">Featured</div>
      <div className="text-sm font-semibold text-strong line-clamp-2">{product.name}</div>
      <div className="text-xs text-muted">{product.supplierName}</div>
      <div className="text-xs text-muted">{categoryName}</div>
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
      <div className="text-xs font-semibold text-brand-800">View product</div>
    </Link>
  );
}
