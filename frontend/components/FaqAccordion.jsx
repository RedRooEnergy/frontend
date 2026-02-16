"use client";

import { useMemo, useRef, useState } from "react";
import { faqData } from "../data/faqData";

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(null);
  const contentRefs = useRef([]);

  const items = useMemo(() => faqData.map((item, index) => ({ ...item, index })), []);
  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (!map.has(item.category)) {
        map.set(item.category, { category: item.category, items: [] });
      }
      map.get(item.category).items.push(item);
    });
    return Array.from(map.values());
  }, [items]);

  const toggleItem = (index) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section className="bg-surface rounded-2xl shadow-card p-6 space-y-6">
      {grouped.map((group) => (
        <div key={group.category} className="space-y-3">
          <h2 className="text-lg font-semibold text-strong">{group.category}</h2>
          <div className="faq-accordion">
            {group.items.map((item) => {
              const isOpen = openIndex === item.index;
              const contentEl = contentRefs.current[item.index];
              const maxHeight = isOpen && contentEl ? `${contentEl.scrollHeight}px` : "0px";
              return (
                <div key={item.index} className="faq-item">
                  <button
                    type="button"
                    className="faq-question"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${item.index}`}
                    id={`faq-button-${item.index}`}
                    onClick={() => toggleItem(item.index)}
                  >
                    <span>{item.question}</span>
                    <span className={`faq-chevron ${isOpen ? "faq-chevron-open" : ""}`} aria-hidden="true">
                      ▼
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${item.index}`}
                    role="region"
                    aria-labelledby={`faq-button-${item.index}`}
                    className="faq-panel"
                    style={{ maxHeight, opacity: isOpen ? 1 : 0 }}
                  >
                    <div ref={(el) => (contentRefs.current[item.index] = el)} className="faq-answer">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
