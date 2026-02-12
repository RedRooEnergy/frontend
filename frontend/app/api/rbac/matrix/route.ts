import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../lib/auth/request";
import { ROLE_PERMISSIONS } from "../../../../lib/rbac/matrix";
import { unauthorized } from "../../../../lib/api/http";

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();

  const url = new URL(request.url);
  const targetRole = url.searchParams.get("role");

  if (targetRole && targetRole !== actor.role && !["RRE_ADMIN", "RRE_CEO"].includes(actor.role)) {
    return NextResponse.json({ error: "Only Admin/CEO can read other role matrices" }, { status: 403 });
  }

  if (targetRole) {
    return NextResponse.json({
      role: targetRole,
      permissions: (ROLE_PERMISSIONS as Record<string, unknown>)[targetRole] || [],
    });
  }

  return NextResponse.json({
    role: actor.role,
    permissions: ROLE_PERMISSIONS[actor.role],
  });
}
