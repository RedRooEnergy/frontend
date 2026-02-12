import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../lib/auth/request";
import { getLastSuccessfulPortalLogin } from "../../../../lib/rbac/audit";
import { hasPortalAccess, resolvePortalDashboardPath } from "../../../../lib/portal/config";

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!actor) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!hasPortalAccess(actor.roles)) {
    return NextResponse.json({ error: "Role is not authorized for portal" }, { status: 403 });
  }
  return NextResponse.json({
    actor,
    redirectPath: resolvePortalDashboardPath(actor.roles),
    lastLogin: getLastSuccessfulPortalLogin(actor.userId)?.timestampUtc || null,
  });
}

