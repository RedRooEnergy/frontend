import { NextResponse } from "next/server";
import { getActiveChecklist } from "../../../../data/complianceChecklistSeed";
import { requireAdmin } from "../../../../lib/auth/adminGuard";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const productType = searchParams.get("productType") as any;
  const checklist = productType ? getActiveChecklist(productType) : null;
  if (!checklist) {
    return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
  }
  return NextResponse.json(checklist);
}

