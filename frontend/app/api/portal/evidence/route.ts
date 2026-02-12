import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../lib/auth/request";
import { hasPortalAccess } from "../../../../lib/portal/config";
import { buildEvidenceIndex } from "../../../../lib/portal/evidence";
import { appendPortalAccessAudit } from "../../../../lib/rbac/audit";

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!actor) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!hasPortalAccess(actor.roles)) {
    appendPortalAccessAudit({
      actorUserId: actor.userId,
      actorRole: actor.role,
      actorEmail: actor.email,
      path: "/api/portal/evidence",
      outcome: "DENY",
      reason: "Role is not permitted for portal evidence access",
    });
    return NextResponse.json({ error: "Role is not authorized for portal evidence" }, { status: 403 });
  }

  const index = buildEvidenceIndex();
  appendPortalAccessAudit({
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorEmail: actor.email,
    path: "/api/portal/evidence",
    outcome: "ALLOW",
    reason: "Portal evidence index access granted",
  });

  return NextResponse.json(index);
}
