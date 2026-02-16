"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { categories } from "../data/categories";

interface MegaMenuProps {
  open?: boolean;
  onClose?: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export default function MegaMenu({ open, onClose, triggerRef }: MegaMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    if (!open || !onClose) return;

    const handleClickAway = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [open, onClose, triggerRef]);

  useEffect(() => {
    if (open && menuRef.current) {
      menuRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 relative">
      <div
        id="mega-menu"
        ref={menuRef}
        tabIndex={-1}
        role="menu"
        className="absolute left-0 mt-2 z-40 w-[340px] max-h-[520px] overflow-y-auto rounded-lg border bg-surface text-text-700 shadow-card"
      >
        <div className="p-3 space-y-2 text-sm">
          {categories.map((category, idx) => (
            <div key={category.slug} className="space-y-2">
              <button
                role="menuitem"
                onMouseEnter={() => setActiveCategory(idx)}
                onFocus={() => setActiveCategory(idx)}
                className={`w-full text-left px-2 py-2 rounded-md border hover:bg-brand-100 ${
                  activeCategory === idx ? "bg-brand-100 font-semibold" : ""
                }`}
              >
                {category.name}
              </button>
              {activeCategory === idx && (
                <div className="pl-3 grid grid-cols-1 gap-2 text-sm">
                  {category.subcategories.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/categories/${category.slug}/${sub.slug}`}
                      className="hover:text-brand-800"
                      role="menuitem"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
