"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

export default function CareersFAQAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-surface rounded-2xl shadow-card border p-4">
      <div className="space-y-4">
        {items.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={item.question} className="border rounded-xl">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full text-left px-4 py-3 flex items-center justify-between"
                aria-expanded={isOpen}
                aria-controls={`careers-faq-${idx}`}
              >
                <span className="text-base font-semibold text-strong">{item.question}</span>
                <span className="text-xl text-muted">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div id={`careers-faq-${idx}`} className="px-4 pb-4 text-sm text-muted">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
