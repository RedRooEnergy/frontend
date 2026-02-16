import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { summarizeConnectionEvents } from "../../../../../lib/connectionEventsStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({
      ok: true,
      summary: {
        total: 0,
        byServicePartner: [],
        byEngagementType: [],
        bySourceType: [],
        byWeek: [],
      },
      devFallback: true,
    });
  }

  const url = new URL(request.url);
  const summary = await summarizeConnectionEvents({
    servicePartnerId: url.searchParams.get("servicePartnerId") || undefined,
    sourceType: (url.searchParams.get("sourceType") as any) || undefined,
    engagementType: (url.searchParams.get("engagementType") as any) || undefined,
    status: (url.searchParams.get("status") as any) || undefined,
    startDate: url.searchParams.get("startDate") || undefined,
    endDate: url.searchParams.get("endDate") || undefined,
  });

  return NextResponse.json({ ok: true, summary });
}
