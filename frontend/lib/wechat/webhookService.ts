import { resolveWeChatRuntimeConfig } from "./config";
import { applyWeChatBindingVerificationFromCallback } from "./verificationService";
import { extractWeChatInboundContext } from "./webhook";
import {
  appendWeChatInboundMessageRecord,
  getWeChatBindingByWeChatUserId,
  listWeChatDispatches,
  type WeChatStoreDependencies,
} from "./store";

export async function processWeChatInboundWebhook(
  input: {
    payload: Record<string, unknown>;
    receivedAt?: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
) {
  const runtimeConfig = resolveWeChatRuntimeConfig();

  const context = extractWeChatInboundContext(input.payload);
  const binding = context.fromUserName
    ? await getWeChatBindingByWeChatUserId(
        {
          wechatUserId: context.fromUserName,
          wechatAppId: runtimeConfig.provider.appId,
        },
        dependencyOverrides
      )
    : null;

  const latestDispatch = binding
    ? await listWeChatDispatches(
        {
          recipientBindingId: binding.bindingId,
          page: 1,
          limit: 1,
        },
        dependencyOverrides
      )
    : { items: [] };

  let processingResult: {
    status: "IGNORED" | "MAPPED" | "VERIFICATION_APPLIED" | "FAILED";
    code: string;
    message?: string;
  } = {
    status: "MAPPED",
    code: "WECHAT_INBOUND_CAPTURED",
  };

  if (
    context.msgType === "event" &&
    (context.event === "SUBSCRIBE" || context.event === "SCAN") &&
    context.eventKey
  ) {
    const verification = await applyWeChatBindingVerificationFromCallback(
      {
        eventKey: context.eventKey,
        wechatUserId: context.fromUserName,
        officialAccountFollowerId: context.fromUserName,
        actorRole: "system",
        actorId: "wechat-webhook",
      },
      dependencyOverrides
    );

    processingResult = {
      status: verification.verified ? "VERIFICATION_APPLIED" : "FAILED",
      code: verification.code,
      message: verification.bindingId ? `bindingId=${verification.bindingId}` : undefined,
    };
  }

  const inbound = await appendWeChatInboundMessageRecord(
    {
      recipientBindingId: binding?.bindingId || null,
      eventContextHint: {
        dispatchId: latestDispatch.items[0]?.dispatchId || null,
        eventCode: latestDispatch.items[0]?.eventCode || null,
      },
      inboundPayload: input.payload,
      receivedAt: input.receivedAt,
      processed: true,
      processingResult,
    },
    dependencyOverrides
  );

  return {
    inbound: inbound.record,
    context,
    processingResult,
  };
}
