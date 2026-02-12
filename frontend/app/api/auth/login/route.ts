import { NextResponse } from "next/server";
import { findUserByEmail } from "../../../../lib/data/mockDb";
import { issueToken } from "../../../../lib/auth/token";
import { authCookieName } from "../../../../lib/auth/request";
import { getUserRoleCodes } from "../../../../lib/rbac/runtimeStore";
import type { RoleName } from "../../../../lib/rbac/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; role?: RoleName };
  const email = (body.email || "").trim();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  const roleCodes = getUserRoleCodes(user.id);
  if (!roleCodes.length) {
    return NextResponse.json({ error: "user has no active role assignments" }, { status: 403 });
  }
  if (body.role && !roleCodes.includes(body.role)) {
    return NextResponse.json({ error: "role mismatch for user" }, { status: 400 });
  }

  const token = issueToken({ userId: user.id, role: roleCodes[0], roles: roleCodes, email: user.email });
  const response = NextResponse.json({
    actor: {
      userId: user.id,
      role: roleCodes[0],
      roles: roleCodes,
      email: user.email,
      name: user.name,
    },
    token,
  });
  response.cookies.set(authCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
