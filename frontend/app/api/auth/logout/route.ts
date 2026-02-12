import { NextResponse } from "next/server";
import { authCookieName } from "../../../../lib/auth/request";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return response;
}

