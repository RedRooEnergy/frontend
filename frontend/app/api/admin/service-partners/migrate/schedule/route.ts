import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { getSchedulerStatus, startScheduler, stopScheduler } from "../../../../../../lib/servicePartner/devMigrationScheduler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = await getSchedulerStatus();
  return NextResponse.json({ ok: true, status });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body?.enabled);

  const status = enabled ? await startScheduler(admin.actorId) : await stopScheduler(admin.actorId);
  return NextResponse.json({ ok: true, status });
}
