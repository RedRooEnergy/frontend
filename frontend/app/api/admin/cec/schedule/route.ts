import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { getCecSchedulerStatus, startCecScheduler, stopCecScheduler } from "../../../../../lib/cec/devScheduler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const status = await getCecSchedulerStatus();
    return NextResponse.json({ ok: true, status });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Unable to load CEC schedule" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const payload = (await request.json().catch(() => ({}))) as { enabled?: boolean; intervalHours?: number };
    const enabled = Boolean(payload.enabled);
    const intervalHours = Number(payload.intervalHours) || 24;
    const status = enabled
      ? await startCecScheduler(intervalHours, admin.actorId)
      : await stopCecScheduler(admin.actorId);
    return NextResponse.json({ ok: true, status });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Unable to update CEC schedule" }, { status: 500 });
  }
}
