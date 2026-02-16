import type { Metadata } from "next";
import SupplierHotDealCard from "../../components/SupplierHotDealCard";
import { getHotDealsCurrentWeek } from "../../lib/homepageSelection";

export const metadata: Metadata = {
  title: "Supplier Hot Deals | RedRooEnergy",
  description: "Time-limited supplier hot deals available this week on RedRooEnergy.",
  alternates: {
    canonical: "/supplier-hot-deals",
  },
};

export default function SupplierHotDealsPage() {
  const deals = getHotDealsCurrentWeek();

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Supplier Hot Deals</h1>
        <p className="text-sm text-muted">
          Supplier Hot Deals is a supplier-initiated, time-limited clearance and promotion channel used to aggressively
          discount approved products for a defined period.
        </p>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
        <p className="text-sm text-muted">
          Only products that are already approved, compliant, and live in the catalogue are eligible. Products with
          pending compliance, conditional approvals, or active risk flags are automatically excluded.
        </p>
        <p className="text-sm text-muted">
          Suppliers opt in by explicitly marking a product as a Hot Deal and setting a discounted price, quantity
          limit, and time window. All Hot Deals must meet enforced minimum discount thresholds defined in marketplace
          governance. Prices are validated against price-history rules to prevent artificial mark-ups followed by fake
          discounts.
        </p>
        <p className="text-sm text-muted">
          Hot Deals are displayed in a dedicated section, clearly labelled as time-limited supplier offers. Cards show
          the discounted price, original price, remaining quantity (where applicable), and countdown timer. Layout and
          presentation are fixed and identical for all suppliers.
        </p>
        <p className="text-sm text-muted">
          Once a Hot Deal goes live, its price and terms are locked for the duration of the promotion. Suppliers cannot
          change pricing, quantities, or conditions mid-cycle. If stock is exhausted or the time window ends, the deal
          automatically expires and is removed.
        </p>
        <p className="text-sm text-muted">
          Supplier Hot Deals does not bypass any marketplace protections. Compliance enforcement, payment escrow,
          delivery obligations, returns, warranties, and reviews all apply exactly as they do for standard listings.
        </p>
        <p className="text-sm text-muted">
          All Hot Deal activations, pricing inputs, eligibility checks, and expiries are fully logged and auditable.
          Admin oversight is supervisory only; admins cannot create or edit Hot Deals on behalf of suppliers.
        </p>
        <p className="text-sm text-muted">
          In summary: Supplier Hot Deals is a governed, transparent, supplier-controlled discount channel—time-boxed,
          compliance-locked, audit-ready, and clearly separated from paid placement and algorithmic deal surfaces.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Time-limited supplier offers</h2>
        <p className="text-sm text-muted">All active hot deals are listed below.</p>
      </div>

      {deals.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          No hot deals are active right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {deals.map((deal) => (
            <SupplierHotDealCard key={deal.product.slug} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
