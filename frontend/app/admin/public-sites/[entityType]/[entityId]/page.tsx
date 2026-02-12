import { redirect } from "next/navigation";
import AdminPublicSiteDetailPanel from "../../../../../components/publicSites/AdminPublicSiteDetailPanel";
import { getServerActor } from "../../../../../lib/auth/serverActor";

export default function AdminPublicSiteDetailPage({ params }: { params: { entityType: string; entityId: string } }) {
  const actor = getServerActor();
  if (!actor) {
    redirect("/portal/login");
  }

  const allowed = actor.roles.some((role) => role === "RRE_ADMIN" || role === "DEVELOPER" || role === "RRE_CEO");
  if (!allowed) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Forbidden</h1>
        <p className="text-sm text-red-300">Only Admin/Developer/CEO may access this page.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Public Site Detail</h1>
        <p className="text-sm text-slate-400">
          Entity: {params.entityType.toUpperCase()} / {params.entityId}
        </p>
      </header>
      <AdminPublicSiteDetailPanel entityId={params.entityId} entityType={params.entityType.toUpperCase()} />
    </section>
  );
}
