import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth/adminGuard";
import { requireBuyer, requireSupplier } from "../../../../lib/auth/roleGuard";
import { resolveWeChatRuntimeConfig } from "../../../../lib/wechat/config";
import { getWeChatBindingForEntity, getWeChatInboundBindingSummary } from "../../../../lib/wechat/store";
import type { WeChatEntityType } from "../../../../lib/wechat/types";

export const runtime = "nodejs";

type ChannelBindingStatus = "NONE" | "PENDING" | "VERIFIED" | "REVOKED" | "ERROR";

function mapBindingStatus(status: string | null | undefined): ChannelBindingStatus {
  const normalized = String(status || "").trim().toUpperCase();
  if (!normalized) return "NONE";
  if (normalized === "PENDING") return "PENDING";
  if (normalized === "VERIFIED") return "VERIFIED";
  if (normalized === "REVOKED") return "REVOKED";
  if (normalized === "SUSPENDED") return "ERROR";
  return "ERROR";
}

function resolveActor(request: Request): {
  entityType: WeChatEntityType;
  entityId: string;
  role: "ADMIN" | "SUPPLIER" | "BUYER";
} | null {
  const admin = requireAdmin(request.headers);
  if (admin) {
    return {
      entityType: "ADMIN",
      entityId: admin.actorId,
      role: "ADMIN",
    };
  }

  const supplier = requireSupplier(request.headers);
  if (supplier) {
    return {
      entityType: "SUPPLIER",
      entityId: supplier.actorId,
      role: "SUPPLIER",
    };
  }

  const buyer = requireBuyer(request.headers);
  if (buyer) {
    return {
      entityType: "BUYER",
      entityId: buyer.actorId,
      role: "BUYER",
    };
  }

  return null;
}

export async function GET(request: Request) {
  const actor = resolveActor(request);
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    return NextResponse.json({ error: "WeChat extension disabled" }, { status: 404 });
  }

  const binding = await getWeChatBindingForEntity({
    entityType: actor.entityType,
    entityId: actor.entityId,
    wechatAppId: runtimeConfig.provider.appId,
  });

  if (!binding) {
    return NextResponse.json({
      role: actor.role,
      bindingStatus: "NONE",
      unreadCount: 0,
      lastInboundAt: null,
      bindingId: null,
    });
  }

  const inboundSummary = await getWeChatInboundBindingSummary({
    recipientBindingId: binding.bindingId,
  });

  return NextResponse.json({
    role: actor.role,
    bindingStatus: mapBindingStatus(binding.status),
    unreadCount: inboundSummary.unreadCount,
    lastInboundAt: inboundSummary.lastInboundAt,
    bindingId: binding.bindingId,
  });
}
