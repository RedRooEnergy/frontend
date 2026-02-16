"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { categories } from "../../data/categories";
import { addToCart, getWishlist, removeFromWishlist, setWishlist } from "../../lib/store";

function getProductBySlug(slug: string) {
  for (const category of categories) {
    for (const sub of category.subcategories) {
      const match = sub.products.find((product) => product.slug === slug);
      if (match) return match;
    }
  }
  return null;
}

export default function WishListPage() {
  const [items, setItems] = useState(getWishlist());

  const enriched = useMemo(() => {
    return items.map((item) => {
      const product = getProductBySlug(item.productSlug);
      return {
        ...item,
        image: item.image || product?.image,
        supplierName: item.supplierName || product?.supplierName,
        currentPrice: product?.price ?? item.price,
      };
    });
  }, [items]);

  const handleRemove = (slug: string) => {
    const updated = removeFromWishlist(slug);
    setItems(updated);
  };

  const handleClear = () => {
    setWishlist([]);
    setItems([]);
  };

  const handleMoveToCart = (slug: string) => {
    const product = getProductBySlug(slug);
    const item = items.find((entry) => entry.productSlug === slug);
    if (!item) return;
    addToCart({
      productSlug: slug,
      name: item.name,
      qty: 1,
      price: product?.price ?? item.price,
    });
    const updated = removeFromWishlist(slug);
    setItems(updated);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Wish List</h1>
            <p className="text-sm text-muted">Save products to review or purchase later.</p>
          </div>
          {items.length > 0 && (
            <button className="text-sm text-brand-700" onClick={handleClear}>
              Clear all
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
            Your wish list is empty. Browse the catalogue and save items for later.
            <div className="mt-4">
              <Link href="/" className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold inline-block">
                Browse products
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {enriched.map((item) => (
              <div
                key={item.productSlug}
                className="bg-surface rounded-2xl shadow-card border p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex items-center gap-4">
                  <div className="h-20 w-24 bg-brand-100 rounded-xl overflow-hidden flex items-center justify-center">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} width={96} height={80} className="object-contain" />
                    ) : (
                      <div className="text-xs text-brand-800">No image</div>
                    )}
                  </div>
                  <div>
                    <Link href={`/products/${item.productSlug}`} className="font-semibold text-strong">
                      {item.name}
                    </Link>
                    {item.supplierName && <div className="text-xs text-muted">{item.supplierName}</div>}
                    <div className="text-sm text-muted">Saved price: ${item.price.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold text-brand-800">${item.currentPrice.toFixed(2)}</div>
                  <button
                    className="px-3 py-2 bg-brand-700 text-brand-100 rounded-md text-sm"
                    onClick={() => handleMoveToCart(item.productSlug)}
                  >
                    Add to Cart
                  </button>
                  <button className="text-sm text-brand-700" onClick={() => handleRemove(item.productSlug)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
