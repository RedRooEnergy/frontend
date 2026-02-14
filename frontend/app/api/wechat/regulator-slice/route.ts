import { NextResponse } from "next/server";
import { requireRegulator } from "../../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../lib/wechat/config";
import {
  listWeChatDispatchSliceForRegulator,
  listWeChatInboundSliceForRegulator,
  listWeChatLedgerSliceForRegulator,
} from "../../../../../lib/wechat/store";

export const runtime = "nodejs";

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

export async function GET(request: Request) {
  const regulator = requireRegulator(request.headers);
  if (!regulator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const url = new URL(request.url);
  const bindingId = String(url.searchParams.get("bindingId") || "").trim() || undefined;
  const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 200);
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 10_000);

  const [bindings, dispatches, inbound] = await Promise.all([
    listWeChatLedgerSliceForRegulator({ bindingId, limit, page }),
    listWeChatDispatchSliceForRegulator({ bindingId, limit, page }),
    listWeChatInboundSliceForRegulator({ bindingId, limit, page }),
  ]);

  return NextResponse.json({
    bindings: bindings.items,
    dispatches: dispatches.items,
    inbound: inbound.items,
    paging: {
      limit,
      page,
      bindingTotal: bindings.total,
      dispatchTotal: dispatches.total,
      inboundTotal: inbound.total,
    },
    generatedAt: new Date().toISOString(),
  });
}
