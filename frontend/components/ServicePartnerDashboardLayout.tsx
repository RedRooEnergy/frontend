"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home / Work Allocation", href: "/dashboard/service-partner" },
  { label: "Task Management", href: "/dashboard/service-partner/tasks" },
  { label: "Product Review Queue", href: "/dashboard/service-partner/reviews" },
  { label: "Compliance & Accreditation", href: "/dashboard/service-partner/compliance" },
  { label: "Certification Interest Board", href: "/dashboard/service-partner/interest-board" },
  { label: "Documents & Evidence", href: "/dashboard/service-partner/documents" },
  { label: "Messages & Notifications", href: "/dashboard/service-partner/messages" },
];

export default function ServicePartnerDashboardLayout({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="buyer-dashboard-main buyer-dashboard-grid">
        <aside aria-label="Service partner navigation" className="buyer-nav space-y-3">
          <h2 className="text-lg font-semibold">Service Partner</h2>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-semibold ${
                    active ? "bg-brand-700 text-brand-100" : "hover:bg-brand-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="buyer-content space-y-4">
          {title && <h1 className="text-2xl font-bold">{title}</h1>}
          {children}
        </section>
      </main>
    </div>
  );
}
