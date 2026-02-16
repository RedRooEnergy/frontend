import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { getAuditLogs } from "../../../../../lib/servicePartner/serverStore";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get("partnerId") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const logs = await getAuditLogs({ partnerId, limit });
  return NextResponse.json({ logs });
}
