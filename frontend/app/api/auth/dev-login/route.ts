import { NextResponse } from "next/server";
import { buildSessionCookie, createSessionToken } from "../../../../lib/auth/sessionCookie";

function validateRole(role: string) {
  return ["buyer", "supplier", "service-partner", "freight", "regulator", "admin"].includes(role);
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "").trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  if (!validateRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const token = createSessionToken({
    role: role as any,
    email,
    userId: `${role}:${email}`,
    ttlHours: 12,
  });
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildSessionCookie(token));
  return response;
}
