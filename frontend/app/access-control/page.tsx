import { redirect } from "next/navigation";
import { getServerActor } from "../../lib/auth/serverActor";

export default function AccessControlRootPage() {
  const actor = getServerActor();
  if (!actor) {
    redirect("/access-control/login");
  }
  redirect("/access-control/dashboard");
}

