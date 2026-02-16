import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieHeader = request.headers.get("cookie");
  const session = getSessionFromCookieHeader(cookieHeader);

  return NextResponse.json({
    ok: true,
    hasCookie: Boolean(cookieHeader),
    session: session
      ? {
          role: session.role,
          userId: session.userId,
          email: session.email,
          issuedAt: session.issuedAt,
          expiresAt: session.expiresAt,
        }
      : null,
  });
}
