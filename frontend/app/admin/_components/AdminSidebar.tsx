import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/financial", label: "Financial" },
  { href: "/admin/governance", label: "Governance" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/risk", label: "Risk" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/evidence", label: "Evidence" },
];

export default function AdminSidebar() {
  return (
    <aside aria-label="Admin navigation" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Admin Control</h2>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
