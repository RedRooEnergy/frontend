import Link from "next/link";
import { redirect } from "next/navigation";
import { GovernanceControlSurface } from "../../../components/access-control/GovernanceControlSurface";
import { LogoutButton } from "../../../components/access-control/LogoutButton";
import { ClientRouteGuard } from "../../../components/access-control/ClientRouteGuard";
import { getServerActor } from "../../../lib/auth/serverActor";

export default function GovernancePage() {
  const actor = getServerActor();
  if (!actor) {
    redirect("/access-control/login");
  }

  if (!actor.roles.some((role) => role === "RRE_ADMIN" || role === "RRE_CEO")) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Forbidden</h2>
        <p className="text-red-300 text-sm">Only CEO and RRE Admin may access the permission management dashboard.</p>
        <Link href="/access-control/dashboard" className="text-emerald-300 underline">
          Back to access-control dashboard
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <ClientRouteGuard />
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold">Permission Management Dashboard</h2>
          <p className="text-sm text-slate-300">
            Role assignment and dashboard access governance for CEO/Admin control.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/access-control/dashboard" className="text-emerald-300 underline text-sm">
            Access dashboards
          </Link>
          <LogoutButton />
        </div>
      </div>
      <GovernanceControlSurface />
    </section>
  );
}
