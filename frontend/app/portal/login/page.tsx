import Link from "next/link";
import { PortalLoginForm } from "../../../components/portal/PortalLoginForm";
import { getServerActor } from "../../../lib/auth/serverActor";
import { getLastSuccessfulPortalLogin } from "../../../lib/rbac/audit";
import { hasPortalAccess, resolvePortalDashboardPath } from "../../../lib/portal/config";

export default function PortalLoginPage() {
  const actor = getServerActor();
  const hasAccess = actor ? hasPortalAccess(actor.roles) : false;
  const lastLogin = hasAccess ? getLastSuccessfulPortalLogin(actor.userId) : null;

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Portal Dashboard Login</h1>
      <p className="text-sm text-slate-300">
        Access Admin, Finance, CEO, Developer, Marketing, and Regulator dashboards directly without using the public homepage.
      </p>
      {hasAccess && actor ? (
        <div className="rounded border border-emerald-700/40 bg-emerald-900/10 p-4 text-sm">
          <p>
            Logged in role: <span className="font-medium text-emerald-200">{actor.role}</span>
          </p>
          <p>Last login: {lastLogin?.timestampUtc || "No prior login event recorded"}</p>
          <Link href={resolvePortalDashboardPath(actor.roles)} className="text-emerald-300 underline">
            Continue to dashboard
          </Link>
        </div>
      ) : null}
      <PortalLoginForm />
    </section>
  );
}
