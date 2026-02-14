import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";

export const runtime = "nodejs";

function notImplemented() {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
    },
    { status: 501 }
  );
}

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return notImplemented();
}

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return notImplemented();
}
