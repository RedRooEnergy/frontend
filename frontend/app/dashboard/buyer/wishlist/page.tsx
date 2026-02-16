"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { addToCart, getSession, getWishlist, removeFromWishlist, WishlistItem } from "../../../../lib/store";

export default function BuyerWishlistPage() {
  const router = useRouter();
  const session = getSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  useEffect(() => {
    setItems(getWishlist());
  }, []);

  const handleRemove = (slug: string) => {
    const next = removeFromWishlist(slug);
    setItems(next);
  };

  const handleAddToCart = (item: WishlistItem) => {
    addToCart({ productSlug: item.productSlug, name: item.name, qty: 1, price: item.price });
    setMessage(`${item.name} added to cart.`);
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <BuyerDashboardLayout title="Wish List & Saved Products">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Saved products</div>
          <div className="text-xs text-muted">Planning only · no price lock</div>
        </div>
        {message && <p className="text-sm text-strong">{message}</p>}
        {items.length === 0 ? (
          <p className="text-sm text-muted">No saved products yet.</p>
        ) : (
          <div className="buyer-form-grid">
            {items.map((item) => (
              <div key={item.productSlug} className="buyer-card">
                <div className="text-sm font-semibold">{item.name}</div>
                <div className="text-xs text-muted">{item.supplierName ?? "Approved supplier"}</div>
                <div className="text-sm font-semibold mt-2">AUD {item.price.toFixed(2)}</div>
                {item.originalPrice && (
                  <div className="text-xs text-muted line-through">AUD {item.originalPrice.toFixed(2)}</div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    className="px-3 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold hover:opacity-90 transition"
                    onClick={() => handleAddToCart(item)}
                  >
                    Add to cart
                  </button>
                  <button
                    className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                    onClick={() => handleRemove(item.productSlug)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Project planning</div>
          <div className="text-xs text-muted">Group saved items by project</div>
        </div>
        <p className="text-sm text-muted">
          Saved items can be grouped into projects once project workspaces are enabled. This view remains read-only until
          project planning is activated.
        </p>
      </div>
    </BuyerDashboardLayout>
  );
}
