import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../../../lib/auth/request";
import { governanceListRolePermissions } from "../../../../../../lib/api/rbacGovernanceService";
import { handleApiError, unauthorized } from "../../../../../../lib/api/http";

export async function GET(request: NextRequest, context: { params: { roleId: string } }) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  try {
    return NextResponse.json({
      roleId: context.params.roleId,
      permissions: governanceListRolePermissions(actor, context.params.roleId),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

