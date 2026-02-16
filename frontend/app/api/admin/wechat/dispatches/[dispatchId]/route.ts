import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../../lib/wechat/config";
import { getWeChatDispatchById, listWeChatDispatchStatusEvents } from "../../../../../../lib/wechat/store";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { dispatchId: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const dispatchId = String(context.params?.dispatchId || "").trim();
  if (!dispatchId) {
    return NextResponse.json({ error: "dispatchId required" }, { status: 400 });
  }

  const dispatch = await getWeChatDispatchById(dispatchId);
  if (!dispatch) {
    return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
  }

  const statusEvents = await listWeChatDispatchStatusEvents(dispatch.dispatchId);

  return NextResponse.json({
    dispatch,
    statusEvents,
  });
}
