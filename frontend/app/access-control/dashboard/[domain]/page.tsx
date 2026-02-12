import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardActionsPanel } from "../../../../components/access-control/DashboardActionsPanel";
import { LogoutButton } from "../../../../components/access-control/LogoutButton";
import { ClientRouteGuard } from "../../../../components/access-control/ClientRouteGuard";
import { getServerActor } from "../../../../lib/auth/serverActor";
import { listDashboardData } from "../../../../lib/api/dashboardService";
import { DOMAIN_SUBJECTS, listActorActions } from "../../../../lib/rbac/matrix";
import type { DashboardDomain } from "../../../../lib/rbac/types";
import { DASHBOARD_LABELS } from "../../../../lib/rbac/ui";

const DOMAINS: DashboardDomain[] = ["buyer", "supplier", "freight", "installer", "admin", "finance", "ceo", "marketing"];

function isDomain(value: string): value is DashboardDomain {
  return DOMAINS.includes(value as DashboardDomain);
}

export default function AccessControlDomainPage({ params }: { params: { domain: string } }) {
  const actor = getServerActor();
  if (!actor) {
    redirect("/access-control/login");
  }
  if (!isDomain(params.domain)) {
    notFound();
  }

  const domain = params.domain;
  const subjects = DOMAIN_SUBJECTS[domain];
  const canRead = subjects.some((subject) => listActorActions(actor, subject).includes("READ"));

  if (!canRead) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Forbidden</h2>
          <LogoutButton />
        </div>
        <p className="text-sm text-red-300">Role {actor.role} does not have read access to this dashboard domain.</p>
        <Link className="text-emerald-300 underline" href="/access-control/dashboard">
          Back to dashboard index
        </Link>
      </section>
    );
  }

  const allowedCapabilityKeys = subjects.flatMap((subject) =>
    listActorActions(actor, subject).map((action) => `${subject}:${action}`)
  );

  const payload = listDashboardData(actor, domain);

  return (
    <section className="space-y-6">
      <ClientRouteGuard />
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold">{DASHBOARD_LABELS[domain]} Dashboard</h2>
          <p className="text-sm text-slate-300">
            Signed in as {actor.email} ({actor.role})
          </p>
          <p className="text-xs text-slate-400">UI is projection-only. Mutations are server-authorized and audit-logged.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/access-control/dashboard" className="text-sm text-emerald-300 underline">
            All dashboards
          </Link>
          <LogoutButton />
        </div>
      </div>

      <DashboardActionsPanel domain={domain} allowedCapabilityKeys={allowedCapabilityKeys} />

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-100">Read model</h3>
        <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </section>
  );
}
