import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../lib/auth/request";
import { unauthorized } from "../../../../lib/api/http";
import { listRolePermissions } from "../../../../lib/rbac/runtimeStore";
import type { RoleName } from "../../../../lib/rbac/types";

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();

  const url = new URL(request.url);
  const targetRole = url.searchParams.get("role");

  if (targetRole && !actor.roles.includes("RRE_ADMIN") && !actor.roles.includes("RRE_CEO")) {
    return NextResponse.json({ error: "Only Admin/CEO can read other role matrices" }, { status: 403 });
  }

  const targetRoleId = (targetRole || actor.role) as RoleName;

  if (targetRole) {
    return NextResponse.json({
      role: targetRoleId,
      permissions: listRolePermissions(targetRoleId),
    });
  }

  return NextResponse.json({
    role: targetRoleId,
    permissions: listRolePermissions(targetRoleId),
  });
}
