import Link from "next/link";
import Image from "next/image";
import type { Product } from "../data/categories";

interface WeeklyDealCardProps {
  product: Product;
}

export default function WeeklyDealCard({ product }: WeeklyDealCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-surface rounded-2xl shadow-card border p-4 flex flex-col gap-2 hover:shadow-soft transition"
    >
      <div className="h-32 bg-brand-100 rounded-xl overflow-hidden flex items-center justify-center">
        <Image
          src={product.image}
          alt={product.name}
          width={240}
          height={160}
          sizes="(min-width: 768px) 200px, 100vw"
          className="object-contain h-full w-full"
        />
      </div>
      <div className="text-sm font-semibold text-strong line-clamp-2">{product.name}</div>
      <p className="text-xs text-muted line-clamp-2">{product.shortDescription}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-brand-800">${product.price}</span>
        <span className="text-sm line-through text-muted">${product.originalPrice}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted" aria-label={`Rating ${product.rating} out of 5`}>
        <span>{"★".repeat(Math.floor(product.rating))}{product.rating % 1 ? "½" : ""}</span>
        <span>{product.rating.toFixed(1)}</span>
        <span className="px-2 py-1 bg-brand-200 text-brand-800 rounded-full">Weekly Deal</span>
      </div>
      <div className="flex flex-wrap gap-1 text-[11px] text-brand-800">
        {product.complianceTags.map((tag) => (
          <span key={tag} className="px-2 py-1 bg-brand-200 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
