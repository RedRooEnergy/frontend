import Link from "next/link";
import { adminPhaseEnabled } from "../../../lib/featureFlags";
import { recordAudit } from "../../../lib/audit";

export default function AdminLanding() {
  const enabled = adminPhaseEnabled();
  if (enabled) recordAudit("ADMIN_VIEW_OVERSIGHT", {});
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Grand-Master Dashboard</h1>
        {!enabled && (
          <div className="bg-amber-100 border border-amber-200 text-amber-900 text-sm rounded-2xl p-4">
            Grand-Master phase is disabled. Set NEXT_PUBLIC_ADMIN_PHASE=on in non-production to enable.
          </div>
        )}
        {enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Governance status" href="/dashboard/admin/governance" />
            <Card title="Deals oversight" href="/dashboard/admin/deals" />
            <Card title="Payments & escrow" href="/dashboard/admin/payments" />
            <Card title="Settlements" href="/dashboard/admin/settlements" />
            <Card title="Disputes" href="/dashboard/admin/disputes" />
            <Card title="Compliance approvals" href="/dashboard/admin/compliance" />
            <Card title="Audit exports" href="/dashboard/admin/audit-exports" />
            <Card title="Careers" href="/dashboard/admin/careers" />
            <Card title="Sign-in / Sign-up Attempts" href="/dashboard/admin/auth-attempts" />
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="bg-surface rounded-2xl shadow-card border p-4">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-sm text-muted">Open</div>
    </Link>
  );
}
