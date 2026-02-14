import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../lib/wechat/config";
import { retryFailedWeChatDispatch } from "../../../../../lib/wechat/dispatchService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  let payload: { dispatchId?: string } = {};
  try {
    payload = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const dispatchId = String(payload.dispatchId || "").trim();
  if (!dispatchId) {
    return NextResponse.json({ error: "dispatchId required" }, { status: 400 });
  }

  try {
    const retried = await retryFailedWeChatDispatch({
      dispatchId,
      actorId: admin.actorId,
    });

    return NextResponse.json(retried);
  } catch (error: any) {
    const code = String(error?.message || "WECHAT_RETRY_FAILED");
    const status =
      code === "WECHAT_DISPATCH_NOT_FOUND"
        ? 404
        : code === "WECHAT_RETRY_ONLY_ALLOWED_FOR_FAILED_DISPATCH"
        ? 409
        : code === "WECHAT_RETRY_BLOCKED_BINDING_NOT_FOUND"
        ? 409
        : 500;

    return NextResponse.json({ error: "Retry dispatch failed", code }, { status });
  }
}
