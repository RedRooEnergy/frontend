import { resolveWeChatRuntimeConfig } from "./config";
import {
  getWeChatBindingById,
  upsertWeChatBindingStart,
  verifyWeChatBindingByToken,
  type WeChatStoreDependencies,
} from "./store";
import type { WeChatBindingStatus, WeChatEntityType, WeChatVerificationMethod } from "./types";

function parseVerificationEventKey(raw: string) {
  const value = String(raw || "").trim();
  if (!value) return null;

  const withoutPrefix = value.startsWith("qrscene_") ? value.slice("qrscene_".length) : value;
  const normalized = withoutPrefix.startsWith("BIND:") ? withoutPrefix.slice("BIND:".length) : withoutPrefix;
  const parts = normalized.split(":").map((part) => part.trim());
  if (parts.length < 2) return null;

  const bindingId = parts[0] || "";
  const verificationToken = parts.slice(1).join(":");

  if (!bindingId || !verificationToken) return null;

  return {
    bindingId,
    verificationToken,
  };
}

export async function startWeChatBindingFlow(
  input: {
    entityType: WeChatEntityType;
    entityId: string;
    actorRole: "system" | "supplier" | "admin";
    actorId: string;
    verificationMethod?: WeChatVerificationMethod;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  bindingId: string;
  status: WeChatBindingStatus;
  wechatAppId: string;
  verificationLink: string;
  verificationEventKey: string;
  verificationTokenExpiresAt: string | null;
}> {
  const runtimeConfig = resolveWeChatRuntimeConfig();

  const created = await upsertWeChatBindingStart(
    {
      entityType: input.entityType,
      entityId: input.entityId,
      wechatAppId: runtimeConfig.provider.appId,
      verificationMethod: input.verificationMethod || "QR_LINK",
      actorRole: input.actorRole,
      actorId: input.actorId,
      reason: "Supplier initiated WeChat binding flow",
      verificationTokenTtlMinutes: runtimeConfig.verification.tokenTtlMinutes,
    },
    dependencyOverrides
  );

  const eventKey = `BIND:${created.binding.bindingId}:${created.verificationToken}`;
  const verificationLink = `${runtimeConfig.verification.linkBaseUrl.replace(/\/$/, "")}/wechat/bind?eventKey=${encodeURIComponent(eventKey)}`;

  return {
    bindingId: created.binding.bindingId,
    status: created.binding.status,
    wechatAppId: created.binding.wechatAppId,
    verificationLink,
    verificationEventKey: eventKey,
    verificationTokenExpiresAt: created.binding.verificationTokenExpiresAt || null,
  };
}

export async function applyWeChatBindingVerificationFromCallback(
  input: {
    eventKey: string;
    wechatUserId: string;
    officialAccountFollowerId?: string | null;
    actorRole?: "system" | "supplier" | "admin";
    actorId?: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  verified: boolean;
  code: string;
  bindingId?: string;
}> {
  const parsed = parseVerificationEventKey(input.eventKey);
  if (!parsed) {
    return {
      verified: false,
      code: "WECHAT_BINDING_EVENT_KEY_INVALID",
    };
  }

  const binding = await getWeChatBindingById(parsed.bindingId, dependencyOverrides);
  if (!binding) {
    return {
      verified: false,
      code: "WECHAT_BINDING_NOT_FOUND",
      bindingId: parsed.bindingId,
    };
  }

  const updated = await verifyWeChatBindingByToken(
    {
      bindingId: parsed.bindingId,
      verificationToken: parsed.verificationToken,
      wechatUserId: String(input.wechatUserId || "").trim(),
      officialAccountFollowerId: String(input.officialAccountFollowerId || "").trim() || null,
      actorRole: input.actorRole || "system",
      actorId: input.actorId || "wechat-webhook",
      reason: "WeChat callback verification",
    },
    dependencyOverrides
  );

  return {
    verified: updated.updated,
    code: updated.code,
    bindingId: parsed.bindingId,
  };
}

export function parseWeChatBindingEventKey(eventKey: string) {
  return parseVerificationEventKey(eventKey);
}
