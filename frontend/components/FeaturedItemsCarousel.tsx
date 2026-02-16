"use client";
import { useEffect, useMemo, useState } from "react";
import FeaturedProductCard from "./FeaturedProductCard";
import { categories, Product } from "../data/categories";

const TOTAL = 25;
const PAGE_SIZE = 5;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function FeaturedItemsCarousel() {
  const allProducts: Product[] = useMemo(() => {
    const list: Product[] = [];
    categories.forEach((c) => c.subcategories.forEach((s) => s.products.forEach((p) => list.push(p))));
    return list;
  }, []);

  const [featured, setFeatured] = useState<Product[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const shuffled = shuffle(allProducts).slice(0, TOTAL);
    setFeatured(shuffled);
    setIndex(0);
  }, [allProducts]);

  const pages = Math.max(1, Math.ceil(featured.length / PAGE_SIZE));
  const start = index * PAGE_SIZE;
  const visible = featured.slice(start, start + PAGE_SIZE);

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % pages);
  };

  if (featured.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Featured Items</h2>
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next featured items"
          className="px-3 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold hover:shadow-card"
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {visible.map((product) => (
          <FeaturedProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
