import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../../../lib/auth/request";
import { governanceListUserRoles } from "../../../../../../lib/api/rbacGovernanceService";
import { handleApiError, unauthorized } from "../../../../../../lib/api/http";

export async function GET(request: NextRequest, context: { params: { userId: string } }) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  try {
    return NextResponse.json(governanceListUserRoles(actor, context.params.userId));
  } catch (error) {
    return handleApiError(error);
  }
}

