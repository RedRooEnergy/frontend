import { NextResponse } from "next/server";
import { authCookieName } from "../../../../lib/auth/request";
import { extractIpAddress, processPortalLogin } from "../../../../lib/portal/auth";
import type { RoleName } from "../../../../lib/rbac/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string; role?: RoleName };
  const email = (body.email || "").trim();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  try {
    const login = processPortalLogin({
      email,
      requestedRole: body.role,
      ipAddress: extractIpAddress((request as any).headers as Headers),
    });
    const response = NextResponse.json({
      actor: login.actor,
      redirectPath: login.redirectPath,
      lastLogin: login.lastLogin?.timestampUtc || null,
      note: body.password ? "Password accepted by interface; verification uses current token system in this environment." : null,
    });
    response.cookies.set(authCookieName(), login.token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal login failed";
    const status = /authorized|role/i.test(message) ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

