import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerActor } from "../../../lib/auth/serverActor";
import { DASHBOARD_LABELS } from "../../../lib/rbac/ui";
import { DOMAIN_SUBJECTS } from "../../../lib/rbac/matrix";
import { listRoleActions } from "../../../lib/rbac/matrix";
import { LogoutButton } from "../../../components/access-control/LogoutButton";
import { ClientRouteGuard } from "../../../components/access-control/ClientRouteGuard";

export default function AccessControlDashboardIndexPage() {
  const actor = getServerActor();
  if (!actor) {
    redirect("/access-control/login");
  }

  const availableDomains = (Object.keys(DASHBOARD_LABELS) as Array<keyof typeof DASHBOARD_LABELS>).filter((domain) =>
    DOMAIN_SUBJECTS[domain].some((subject) => listRoleActions(actor.role, subject).includes("READ"))
  );

  return (
    <section className="space-y-6">
      <ClientRouteGuard />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard Access</h2>
          <p className="text-sm text-slate-300">
            Signed in as {actor.email} ({actor.role})
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {availableDomains.map((domain) => (
          <Link
            key={domain}
            href={`/access-control/dashboard/${domain}`}
            className="rounded border border-slate-800 bg-slate-900 p-4 text-sm hover:border-emerald-500"
          >
            <p className="font-semibold text-slate-100">{DASHBOARD_LABELS[domain]}</p>
            <p className="text-slate-400">Read scope enforced by RBAC middleware and server checks.</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
