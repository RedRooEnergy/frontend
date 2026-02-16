import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { getAuditLogs } from "../../../../../../lib/servicePartner/serverStore";

function escapeCsv(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get("partnerId") || undefined;
  const format = (searchParams.get("format") || "json").toLowerCase();
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const logs = await getAuditLogs({ partnerId, limit });

  if (format === "csv") {
    const header = ["id", "actorId", "actorRole", "action", "targetType", "targetId", "reasonCode", "notes", "createdAt"];
    const rows = logs.map((log) => [
      log.id,
      log.actorId,
      log.actorRole,
      log.action,
      log.targetType,
      log.targetId,
      log.reasonCode || "",
      log.notes || "",
      log.createdAt,
    ]);
    const csv = [header.join(","), ...rows.map((row) => row.map((v) => escapeCsv(String(v))).join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=service-partner-audit-${partnerId || "all"}.csv`,
      },
    });
  }

  return NextResponse.json({ logs });
}
