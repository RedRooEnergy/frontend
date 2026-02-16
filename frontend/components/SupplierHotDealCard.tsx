"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { HotDealItem } from "../lib/homepageSelection";

interface SupplierHotDealCardProps {
  deal: HotDealItem;
}

export default function SupplierHotDealCard({ deal }: SupplierHotDealCardProps) {
  const { product, dealStart, dealEnd } = deal;
  const original = product.hotDeal?.originalPrice ?? product.originalPrice;
  const price = product.hotDeal?.price ?? product.price;
  const remaining = product.hotDeal?.remainingQuantity;
  const quantityLimit = product.hotDeal?.quantityLimit;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    const end = new Date(dealEnd);
    const diffMs = end.getTime() - now.getTime();
    if (Number.isNaN(diffMs)) return "Ends soon";
    if (diffMs <= 0) return "Expired";
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }, [dealEnd, now]);

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
      <div className="text-[11px] uppercase tracking-wide text-brand-700">Time-limited supplier offer</div>
      <div className="text-sm font-semibold text-strong line-clamp-2">{product.name}</div>
      <div className="text-xs text-muted">{product.supplierName}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-brand-800">${price.toFixed(0)}</span>
        <span className="text-sm line-through text-muted">${original.toFixed(0)}</span>
      </div>
      <div className="text-xs text-muted">Deal period: {dealStart} – {dealEnd}</div>
      {typeof remaining === "number" ? (
        <div className="text-xs text-muted">
          Remaining: {remaining}
          {typeof quantityLimit === "number" ? ` / ${quantityLimit}` : null}
        </div>
      ) : null}
      <div className="text-xs font-semibold text-brand-800">{countdown}</div>
      <div className="text-xs font-semibold text-brand-800">View deal</div>
    </Link>
  );
}
