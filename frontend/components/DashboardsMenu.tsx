"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

interface DashboardsMenuProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const roles = [
  { label: "Buyer Dashboard", href: "/signin?role=buyer" },
  { label: "Supplier Dashboard", href: "/signin?role=supplier" },
  { label: "Supplier Products", href: "/dashboard/supplier/products" },
  { label: "Service Partner Dashboard", href: "/signin?role=service-partner" },
  { label: "Freight & Logistics Dashboard", href: "/signin?role=freight" },
  { label: "Regulator / Auditor Dashboard", href: "/signin?role=regulator" },
  { label: "RRE Grand-Master Dashboard", href: "/signin?role=admin" },
  { label: "Grand-Master Deals", href: "/dashboard/admin/deals" },
];

export default function DashboardsMenu({ open, onClose, triggerRef }: DashboardsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickAway = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div className="max-w-6xl mx-auto px-6" id="dashboards-menu">
      <div
        ref={menuRef}
        role="menu"
        className="relative mt-2 w-72 bg-brand-800 text-brand-100 rounded-xl shadow-card border border-brand-700"
      >
        <ul className="flex flex-col py-2">
          {roles.map((role) => (
            <li key={role.label}>
              <Link
                href={role.href}
                role="menuitem"
                className="block px-4 py-2 text-sm text-brand-100 hover:bg-brand-700 transition"
              >
                {role.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
