import { redirect } from "next/navigation";
import AdminPlacementContractsPanel from "../../../../components/publicSites/AdminPlacementContractsPanel";
import { getServerActor } from "../../../../lib/auth/serverActor";

export default function AdminPublicSitePlacementsPage() {
  const actor = getServerActor();
  if (!actor) {
    redirect("/portal/login");
  }

  const allowed = actor.roles.some((role) => role === "RRE_ADMIN" || role === "DEVELOPER" || role === "RRE_CEO");
  if (!allowed) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Forbidden</h1>
        <p className="text-sm text-red-300">Only Admin/Developer/CEO may access placement contracts.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Admin &gt; Placement Contracts</h1>
        <p className="text-sm text-slate-400">Weekly lock, tier caps, and immutable placement hashes.</p>
      </header>
      <AdminPlacementContractsPanel />
    </section>
  );
}
