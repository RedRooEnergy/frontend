"use client";
import { useState } from "react";
import Link from "next/link";
import { getCart, setCart } from "../../lib/store";
import CheckoutEligibilityBanner from "../../components/buyer/CheckoutEligibilityBanner";

export default function CartPage() {
  const [items, setItems] = useState(getCart());
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleQuantity = (slug: string, delta: number) => {
    const updated = items
      .map((item) => (item.productSlug === slug ? { ...item, qty: Math.max(1, item.qty + delta) } : item))
      .filter((i) => i.qty > 0);
    setCart(updated);
    setItems(updated);
  };

  const handleRemove = (slug: string) => {
    const updated = items.filter((i) => i.productSlug !== slug);
    setCart(updated);
    setItems(updated);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Cart</h1>
        <CheckoutEligibilityBanner />
        {items.length === 0 ? (
          <p className="text-muted">Your cart is empty.</p>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.productSlug} className="bg-surface rounded-2xl shadow-card border p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-muted">Unit: ${item.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 bg-brand-700 text-brand-100 rounded-md" onClick={() => handleQuantity(item.productSlug, -1)}>
                      -
                    </button>
                    <span className="w-10 text-center">{item.qty}</span>
                    <button className="px-3 py-1 bg-brand-700 text-brand-100 rounded-md" onClick={() => handleQuantity(item.productSlug, 1)}>
                      +
                    </button>
                  </div>
                  <div className="font-semibold">${(item.price * item.qty).toFixed(2)}</div>
                  <button className="text-sm text-brand-700" onClick={() => handleRemove(item.productSlug)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between bg-surface rounded-2xl shadow-card border p-4">
              <div className="text-lg font-semibold">Total: ${total.toFixed(2)}</div>
              <Link href="/checkout" className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
