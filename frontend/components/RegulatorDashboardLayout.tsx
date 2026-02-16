import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Audit View", href: "/dashboard/regulator" },
  { label: "Audit Export & Evidence Pack", href: "/dashboard/regulator/exports" },
  { label: "Email Evidence Exports", href: "/dashboard/regulator/email-audit" },
  { label: "WeChat Governance", href: "/dashboard/regulator/wechat" },
];

export default function RegulatorDashboardLayout({
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
        <aside aria-label="Regulator navigation" className="buyer-nav space-y-3">
          <h2 className="text-lg font-semibold">Regulator / Auditor</h2>
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
