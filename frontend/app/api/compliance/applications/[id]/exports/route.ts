import { NextResponse } from "next/server";
import { createExport } from "../../../../../../lib/compliance/store";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";

export async function POST(request: Request, context: { params: { id: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const exportRecord = createExport(context.params.id);
    return NextResponse.json(exportRecord, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create export" },
      { status: 500 }
    );
  }
}

