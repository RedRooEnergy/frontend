import Link from "next/link";
import SupplierHotDealCard from "./SupplierHotDealCard";
import { getHotDealsCurrentWeek } from "../lib/homepageSelection";

export default function SupplierHotDealsSection() {
  const deals = getHotDealsCurrentWeek(5);
  if (deals.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Supplier Hot Deals</h2>
          <p className="text-sm text-muted">Time-limited supplier offers with locked pricing</p>
        </div>
        <Link href="/supplier-hot-deals" className="text-sm font-semibold text-brand-800">
          View all
        </Link>
      </div>
      <div className="hot-deals-grid-five">
        {deals.map((deal) => (
          <SupplierHotDealCard key={deal.product.slug} deal={deal} />
        ))}
      </div>
    </section>
  );
}
