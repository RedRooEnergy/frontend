import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { resolveWeChatRuntimeConfig } from "../../../../../lib/wechat/config";
import { listWeChatDispatches } from "../../../../../lib/wechat/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);

  const result = await listWeChatDispatches({
    eventCode: searchParams.get("eventCode") || undefined,
    providerStatus: (searchParams.get("providerStatus") as any) || undefined,
    recipientBindingId: searchParams.get("recipientBindingId") || undefined,
    orderId: searchParams.get("orderId") || undefined,
    complianceCaseId: searchParams.get("complianceCaseId") || undefined,
    shipmentId: searchParams.get("shipmentId") || undefined,
    paymentId: searchParams.get("paymentId") || undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  });

  return NextResponse.json(result);
}
