import { redirect } from "next/navigation";
import { getServerActor } from "../../../lib/auth/serverActor";
import { hasPortalAccess, resolvePortalDashboardPath } from "../../../lib/portal/config";

export default function PortalDashboardIndexPage() {
  const actor = getServerActor();
  if (!actor || !hasPortalAccess(actor.roles)) {
    return (
      <section className="rounded border border-red-800 bg-red-950/30 p-4">
        <h2 className="text-lg font-semibold">401 Unauthorized</h2>
        <p className="text-sm text-red-200">Authentication is required to access the portal dashboards.</p>
      </section>
    );
  }
  redirect(resolvePortalDashboardPath(actor.roles));
}

