import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../../../lib/public-sites/authz";
import { findSnapshotById } from "../../../../../../../lib/public-sites/store";

function pdfLikeDocument(snapshot: any) {
  const body = [
    "RedRooEnergy Public Site Snapshot Export",
    `Snapshot ID: ${snapshot.id}`,
    `Entity: ${snapshot.entityType}:${snapshot.entityId}`,
    `Version: ${snapshot.version}`,
    `Status: ${snapshot.status}`,
    `Published At: ${snapshot.publishedAt || "n/a"}`,
    `Rendered Hash: ${snapshot.renderedHash || "n/a"}`,
    "",
    JSON.stringify(snapshot.contentJSON || {}, null, 2),
  ].join("\n");
  return body;
}

export async function GET(request: NextRequest, context: { params: { snapshotId: string } }) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  const snapshot = findSnapshotById(context.params.snapshotId);
  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const format = String(request.nextUrl.searchParams.get("format") || "json").toLowerCase();
  if (format === "json") {
    return NextResponse.json({ snapshot });
  }

  if (format === "pdf") {
    const payload = pdfLikeDocument(snapshot);
    return new NextResponse(payload, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename=public-site-snapshot-${snapshot.version}.pdf`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
