import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getExportById } from "../../../../../../../lib/compliance/store";
import { requireAdmin } from "../../../../../../../lib/auth/adminGuard";
import { requireRegulator } from "../../../../../../../lib/auth/roleGuard";

export async function GET(request: Request, context: { params: { exportId: string } }) {
  const admin = requireAdmin(request.headers);
  const regulator = requireRegulator(request.headers);
  if (!admin && !regulator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const exportRecord = getExportById(context.params.exportId);
  if (!exportRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!fs.existsSync(exportRecord.jsonPath)) {
    return NextResponse.json({ error: "Manifest missing" }, { status: 404 });
  }

  const content = fs.readFileSync(exportRecord.jsonPath);
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${context.params.exportId}.manifest.json"`,
    },
  });
}

