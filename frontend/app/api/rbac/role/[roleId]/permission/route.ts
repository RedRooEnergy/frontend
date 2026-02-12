import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest, authCookieName } from "../../../../../../lib/auth/request";
import {
  governanceGrantPermission,
  governanceRevokePermission,
  issueFreshTokenForActor,
} from "../../../../../../lib/api/rbacGovernanceService";
import { handleApiError, unauthorized } from "../../../../../../lib/api/http";

export async function POST(request: NextRequest, context: { params: { roleId: string } }) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { permissionId?: string; reason?: string };
  try {
    const result = governanceGrantPermission(actor, context.params.roleId, String(body.permissionId || ""), String(body.reason || ""));
    const token = issueFreshTokenForActor(actor);
    const response = NextResponse.json({ roleId: context.params.roleId, result });
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

export async function DELETE(request: NextRequest, context: { params: { roleId: string } }) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { permissionId?: string; reason?: string };
  try {
    const result = governanceRevokePermission(actor, context.params.roleId, String(body.permissionId || ""), String(body.reason || ""));
    const token = issueFreshTokenForActor(actor);
    const response = NextResponse.json({ roleId: context.params.roleId, result });
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

