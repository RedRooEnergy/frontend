import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../lib/auth/request";
import { governanceListPermissions } from "../../../../lib/api/rbacGovernanceService";
import { handleApiError, unauthorized } from "../../../../lib/api/http";

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  try {
    return NextResponse.json({ permissions: governanceListPermissions(actor) });
  } catch (error) {
    return handleApiError(error);
  }
}

