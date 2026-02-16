import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Freight Operations", href: "/dashboard/freight" },
  { label: "Customs & Duty", href: "/dashboard/freight/customs" },
  { label: "Freight Documents", href: "/dashboard/freight/documents" },
  { label: "Exceptions & Claims", href: "/dashboard/freight/exceptions" },
];

export default function FreightDashboardLayout({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="buyer-dashboard-main buyer-dashboard-grid">
        <aside aria-label="Freight navigation" className="buyer-nav space-y-3">
          <h2 className="text-lg font-semibold">Freight & Logistics</h2>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
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
