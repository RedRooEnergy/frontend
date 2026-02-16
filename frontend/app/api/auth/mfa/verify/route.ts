import { NextResponse } from "next/server";
import { verifyMfaChallenge } from "../../../../../lib/mfaStore";
import { buildSessionCookie, createSessionToken } from "../../../../../lib/auth/sessionCookie";

export const runtime = "nodejs";

function validateRole(role: string) {
  return ["buyer", "supplier", "service-partner", "freight", "regulator", "admin"].includes(role);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "").trim();
    const emailCode = String(body.emailCode || "").trim();
    const smsCode = String(body.smsCode || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    if (!validateRole(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (!/^\d{8}$/.test(emailCode)) {
      return NextResponse.json({ error: "Email code must be 8 digits." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(smsCode)) {
      return NextResponse.json({ error: "SMS code must be 6 digits." }, { status: 400 });
    }

    const result = verifyMfaChallenge(email, role, emailCode, smsCode);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Verification failed." }, { status: 400 });
    }
    const token = createSessionToken({
      role: role as any,
      email,
      userId: `${role}:${email}`,
    });
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Verification failed." }, { status: 500 });
  }
}
