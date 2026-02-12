import Link from "next/link";
import { redirect } from "next/navigation";
import AdminPublicSitesPanel from "../../../components/publicSites/AdminPublicSitesPanel";
import { getServerActor } from "../../../lib/auth/serverActor";

export default function AdminPublicSitesPage() {
  const actor = getServerActor();
  if (!actor) {
    redirect("/portal/login");
  }

  const allowed = actor.roles.some((role) => role === "RRE_ADMIN" || role === "DEVELOPER" || role === "RRE_CEO");
  if (!allowed) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Forbidden</h1>
        <p className="text-sm text-red-300">Only Admin/Developer/CEO may access Public Sites governance.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin &gt; Public Sites</h1>
          <p className="text-sm text-slate-400">Draft review, publish, suspend, and immutable hash governance.</p>
        </div>
        <Link href="/admin/extensions" className="text-sm underline">
          Extensions
        </Link>
      </header>

      <AdminPublicSitesPanel />
    </section>
  );
}
