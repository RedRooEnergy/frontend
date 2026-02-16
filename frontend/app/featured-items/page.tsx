import type { Metadata } from "next";
import FeaturedItemCard from "../../components/FeaturedItemCard";
import { getFeaturedItemsTop } from "../../lib/homepageSelection";

export const metadata: Metadata = {
  title: "Featured Items | RedRooEnergy",
  description: "Supplier-featured approved products showcased on the RedRooEnergy marketplace.",
  alternates: {
    canonical: "/featured-items",
  },
};

export default function FeaturedItemsPage() {
  const items = getFeaturedItemsTop(25);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Featured Items</h1>
        <p className="text-sm text-muted">Supplier-featured approved products.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <FeaturedItemCard key={item.product.slug} item={item} />
        ))}
      </div>
    </div>
  );
}
