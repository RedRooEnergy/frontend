import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest, authCookieName } from "../../../../../../lib/auth/request";
import {
  governanceAssignUserRole,
  governanceRemoveUserRole,
  issueFreshTokenForActor,
} from "../../../../../../lib/api/rbacGovernanceService";
import { handleApiError, unauthorized } from "../../../../../../lib/api/http";

export async function POST(request: NextRequest, context: { params: { userId: string } }) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { roleId?: string; reason?: string };
  try {
    const result = governanceAssignUserRole(actor, context.params.userId, String(body.roleId || ""), String(body.reason || ""));
    const token = issueFreshTokenForActor(actor);
    const response = NextResponse.json({ userId: context.params.userId, result });
    response.cookies.set(authCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: { userId: string } }) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { roleId?: string; reason?: string };
  try {
    const result = governanceRemoveUserRole(actor, context.params.userId, String(body.roleId || ""), String(body.reason || ""));
    const token = issueFreshTokenForActor(actor);
    const response = NextResponse.json({ userId: context.params.userId, result });
    response.cookies.set(authCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

