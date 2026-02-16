import Link from "next/link";
import BestDealCard from "./BestDealCard";
import { getBestDealsTop } from "../lib/homepageSelection";

export default function BestDealsSection() {
  const deals = getBestDealsTop(5);
  if (deals.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Weekly Best Deals</h2>
          <p className="text-sm text-muted">Platform-approved commercial opportunities</p>
        </div>
        <Link href="/best-deals" className="text-sm font-semibold text-brand-800">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {deals.map((deal) => (
          <BestDealCard key={deal.product.slug} deal={deal} />
        ))}
      </div>
    </section>
  );
}
