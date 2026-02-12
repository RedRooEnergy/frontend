import Link from "next/link";
import { getServerActor } from "../../../../lib/auth/serverActor";
import { listDashboardData } from "../../../../lib/api/dashboardService";
import { DOMAIN_SUBJECTS, listActorActions } from "../../../../lib/rbac/matrix";
import type { DashboardDomain } from "../../../../lib/rbac/types";
import { DASHBOARD_LABELS } from "../../../../lib/rbac/ui";
import { hasPortalAccess } from "../../../../lib/portal/config";
import { DashboardActionsPanel } from "../../../../components/access-control/DashboardActionsPanel";
import { canActorReadDomain } from "../../../../lib/portal/domainAccess";

const DOMAINS: DashboardDomain[] = ["buyer", "supplier", "freight", "installer", "admin", "finance", "ceo", "marketing"];

function isDomain(value: string): value is DashboardDomain {
  return DOMAINS.includes(value as DashboardDomain);
}

export default function PortalDomainPage({ params }: { params: { domain: string } }) {
  const actor = getServerActor();
  if (!actor || !hasPortalAccess(actor.roles)) {
    return (
      <section className="rounded border border-red-800 bg-red-950/30 p-4">
        <h2 className="text-lg font-semibold">401 Unauthorized</h2>
        <p className="text-sm text-red-200">Authentication is required to access this portal route.</p>
      </section>
    );
  }
  if (!isDomain(params.domain)) {
    return (
      <section className="rounded border border-red-800 bg-red-950/30 p-4">
        <h2 className="text-lg font-semibold">404 Not Found</h2>
        <p className="text-sm text-red-200">Unknown dashboard domain.</p>
      </section>
    );
  }
  const domain = params.domain;
  const subjects = DOMAIN_SUBJECTS[domain];
  const canRead = canActorReadDomain(actor, domain);

  if (!canRead) {
    return (
      <section className="rounded border border-red-800 bg-red-950/30 p-4 space-y-3">
        <h2 className="text-lg font-semibold">403 Forbidden</h2>
        <p className="text-sm text-red-200">
          Role {actor.role} does not have READ permission for dashboard domain <span className="font-mono">{domain}</span>.
        </p>
      </section>
    );
  }

  const allowedCapabilityKeys = subjects.flatMap((subject) =>
    listActorActions(actor, subject).map((action) => `${subject}:${action}`)
  );
  const payload = listDashboardData(actor, domain);
  const isAdminOrCeo = actor.roles.includes("RRE_ADMIN") || actor.roles.includes("RRE_CEO");
  const switchableDomains = isAdminOrCeo
    ? DOMAINS.filter((item) => DOMAIN_SUBJECTS[item].some((subject) => listActorActions(actor, subject).includes("READ")))
    : [];

  return (
    <section className="space-y-5">
      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{DASHBOARD_LABELS[domain]} Dashboard</h2>
            <p className="text-xs text-slate-400">
              Role badge: <span className="rounded border border-slate-700 px-2 py-1">{actor.role}</span>
            </p>
          </div>
          {isAdminOrCeo ? (
            <Link className="text-sm text-emerald-300 underline" href="/portal/audit">
              Audit
            </Link>
          ) : null}
        </div>
      </div>

      {isAdminOrCeo ? (
        <div className="rounded border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400 mb-2">Domain switcher</p>
          <div className="flex flex-wrap gap-2">
            {switchableDomains.map((item) => (
              <Link
                key={item}
                href={`/portal/dashboard/${item}`}
                className={`rounded px-2 py-1 text-xs border ${
                  item === domain ? "border-emerald-500 text-emerald-300" : "border-slate-700 text-slate-300"
                }`}
              >
                {DASHBOARD_LABELS[item]}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <DashboardActionsPanel domain={domain} allowedCapabilityKeys={allowedCapabilityKeys} />

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold">Read model</h3>
        <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </section>
  );
}
