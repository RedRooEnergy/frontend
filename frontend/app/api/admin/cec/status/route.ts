import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { getLatestSyncRun } from "../../../../../lib/cec/store";
import { getCecSchedulerStatus } from "../../../../../lib/cec/devScheduler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const latest = await getLatestSyncRun();
    let schedule = null;
    try {
      schedule = await getCecSchedulerStatus();
    } catch {
      schedule = null;
    }
    return NextResponse.json({ ok: true, latest, schedule });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Unable to load CEC status" }, { status: 500 });
  }
}
