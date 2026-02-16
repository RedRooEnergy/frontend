import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { exportEmailAudit } from "../../../../../lib/email/export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "json").toLowerCase();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const { json, jsonHash, pdf, manifest, manifestHash } = await exportEmailAudit({ startDate, endDate });

  if (format === "pdf") {
    return new NextResponse(pdf.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=email-audit.pdf",
        "X-Manifest-Hash": manifestHash,
        "X-Json-Hash": jsonHash,
      },
    });
  }

  return NextResponse.json({
    manifest,
    manifestHash,
    records: json,
    jsonHash,
  });
}
