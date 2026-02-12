import Link from "next/link";
import { getServerActor } from "../../lib/auth/serverActor";
import { hasPortalAccess } from "../../lib/portal/config";
import { PortalLogoutButton } from "../../components/portal/PortalLogoutButton";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = getServerActor();
  const showActor = actor && hasPortalAccess(actor.roles);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 px-4 py-3">
        <div>
          <Link href="/portal/dashboard" className="text-lg font-semibold text-emerald-300">
            RedRoo Governance Portal
          </Link>
          <p className="text-xs text-slate-400">Direct privileged dashboard access (isolated from public homepage).</p>
        </div>
        <div className="flex items-center gap-3">
          {showActor ? <span className="rounded border border-slate-700 px-2 py-1 text-xs">{actor.role}</span> : null}
          {showActor ? <PortalLogoutButton /> : null}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

