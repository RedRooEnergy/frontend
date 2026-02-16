"use client";

import { useEffect, useMemo, useState } from "react";
import FeaturedItemCard from "./FeaturedItemCard";
import { getFeaturedItemsTop } from "../lib/homepageSelection";

const PAGE_SIZE = 5;
const ROTATION_MS = 9000;

export default function FeaturedItemsSection() {
  const featured = useMemo(() => getFeaturedItemsTop(25), []);
  const [index, setIndex] = useState(0);

  const totalPages = Math.max(1, Math.ceil(featured.length / PAGE_SIZE));
  const start = index * PAGE_SIZE;
  const visible = featured.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    if (featured.length <= PAGE_SIZE) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % totalPages);
    }, ROTATION_MS);
    return () => clearInterval(timer);
  }, [featured.length, totalPages]);

  if (featured.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Featured Items</h2>
        <p className="text-sm text-muted">Supplier-featured approved products</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {visible.map((item) => (
          <FeaturedItemCard key={item.product.slug} item={item} />
        ))}
      </div>
    </section>
  );
}
