import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { listEmailTemplates } from "../../../../../lib/email/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const templates = await listEmailTemplates();
  return NextResponse.json({ templates });
}
