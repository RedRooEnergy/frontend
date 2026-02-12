import { redirect } from "next/navigation";
import ParticipantPublicSiteEditor from "../../../../components/publicSites/ParticipantPublicSiteEditor";
import { getServerActor } from "../../../../lib/auth/serverActor";
import { findProfileByEntity } from "../../../../lib/public-sites/store";

function resolveEntityTypeFromRole(role: string) {
  if (role === "SUPPLIER") return "SUPPLIER";
  if (role === "INSTALLER") return "INSTALLER";
  return null;
}

export default function ParticipantPublicSitePage() {
  const actor = getServerActor();
  if (!actor) {
    redirect("/portal/login");
  }

  const entityType = resolveEntityTypeFromRole(actor.role);
  if (!entityType) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Unavailable</h1>
        <p className="text-sm text-slate-400">Public-site draft editing is currently available for Supplier and Installer roles.</p>
      </section>
    );
  }

  const profile = findProfileByEntity(actor.userId, entityType);
  if (!profile) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Profile missing</h1>
        <p className="text-sm text-slate-400">
          Ask admin to create your public profile first in Admin &gt; Public Sites.
        </p>
      </section>
    );
  }

  return (
    <ParticipantPublicSiteEditor entityId={profile.entityId} entityType={profile.entityType} slug={profile.slug} />
  );
}
