import { NextResponse } from "next/server";
import { requireSupplier } from "../../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../lib/wechat/config";
import { listWeChatBindings } from "../../../../../lib/wechat/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supplier = requireSupplier(request.headers);
  if (!supplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const bindings = await listWeChatBindings({
    entityType: "SUPPLIER",
    entityId: supplier.actorId,
    wechatAppId: runtimeConfig.provider.appId,
    limit: 20,
    page: 1,
  });

  return NextResponse.json({
    items: bindings.items,
    total: bindings.total,
  });
}
