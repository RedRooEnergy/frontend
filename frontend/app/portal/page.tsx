import { redirect } from "next/navigation";
import { getServerActor } from "../../lib/auth/serverActor";
import { hasPortalAccess } from "../../lib/portal/config";

export default function PortalRootPage() {
  const actor = getServerActor();
  if (!actor || !hasPortalAccess(actor.roles)) {
    redirect("/portal/login");
  }
  redirect("/portal/dashboard");
}

