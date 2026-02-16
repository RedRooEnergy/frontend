import { NextResponse } from "next/server";
import { getApplication } from "../../../../../lib/compliance/store";
import { requireSupplier } from "../../../../../lib/auth/roleGuard";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";

export async function GET(request: Request, context: { params: { id: string } }) {
  const admin = requireAdmin(request.headers);
  const supplier = requireSupplier(request.headers);
  if (!admin && !supplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const app = getApplication(context.params.id);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(app);
}

