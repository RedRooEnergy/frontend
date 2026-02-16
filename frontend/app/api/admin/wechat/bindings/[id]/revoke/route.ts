import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../../lib/auth/adminGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../../../lib/wechat/config";
import { revokeWeChatBinding } from "../../../../../../../lib/wechat/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { id: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const bindingId = String(context.params?.id || "").trim();
  if (!bindingId) {
    return NextResponse.json({ error: "bindingId required" }, { status: 400 });
  }

  const updated = await revokeWeChatBinding({
    bindingId,
    actorId: admin.actorId,
    actorRole: "admin",
    reason: "Admin revoke request",
  });

  if (!updated) {
    return NextResponse.json({ error: "Binding not found" }, { status: 404 });
  }

  return NextResponse.json({ binding: updated });
}
