"use client";
import { useEffect, useMemo, useState } from "react";
import WeeklyDealCard from "./WeeklyDealCard";
import { selectWeeklyDeals } from "../lib/governanceDeals";

const ITEMS_PER_VIEW = 5;

export default function WeeklyDealsCarousel() {
  const deals = useMemo(() => selectWeeklyDeals(), []);

  const [index, setIndex] = useState(0);
  const totalPages = Math.max(1, Math.ceil(deals.length / ITEMS_PER_VIEW));
  const start = index * ITEMS_PER_VIEW;
  const visible = deals.slice(start, start + ITEMS_PER_VIEW);

  useEffect(() => {
    if (index >= totalPages) setIndex(0);
  }, [index, totalPages]);

  if (deals.length === 0) return null;

  const handleNext = () => setIndex((prev) => (prev + 1) % totalPages);
  const handlePrev = () => setIndex((prev) => (prev - 1 + totalPages) % totalPages);

  return (
    <section className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">This Week’s Best Deals</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous weekly deals"
            className="px-3 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold hover:shadow-card"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next weekly deals"
            className="px-3 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold hover:shadow-card"
          >
            Next
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {visible.map((product) => (
          <WeeklyDealCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
