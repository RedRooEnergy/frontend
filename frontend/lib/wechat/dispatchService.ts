import { resolveWeChatRuntimeConfig } from "./config";
import { getWeChatEventMeta, type WeChatEventCode } from "./events";
import {
  buildCorrelationKey,
  buildDispatchIdempotencyKey,
  forbidRegulatorAutoSend,
  requireCorrelationContract,
  requirePermittedRecipient,
  requireValidWeChatEventCode,
} from "./guards";
import { createWeChatProviderAdapter } from "./provider";
import { renderWeChatMessage } from "./renderer";
import {
  appendWeChatDispatchStatusEvent,
  buildWeChatDispatchRecord,
  createWeChatDispatchRecord,
  getWeChatBindingById,
  getWeChatBindingForEntity,
  getWeChatDispatchById,
  getWeChatDispatchByIdempotencyKey,
  getWeChatTemplateRegistryEntry,
  listWeChatDispatchStatusEvents,
  type WeChatStoreDependencies,
} from "./store";
import type { WeChatDispatchInput, WeChatDispatchRecord, WeChatLanguage } from "./types";

export const WECHAT_DISPATCH_VERSION = "ext-wechat-01-dispatch.v1";

function normalizeLanguage(language: string | undefined): WeChatLanguage {
  const normalized = String(language || "").trim();
  if (normalized === "zh-CN") return "zh-CN";
  return "en-AU";
}

function resolveWindowBucket(nowIso: string) {
  const windowMinutes = Math.min(Math.max(Number(process.env.WECHAT_IDEMPOTENCY_WINDOW_MINUTES || "60"), 1), 24 * 60);
  const nowMs = Date.parse(nowIso);
  const bucketMs = Math.floor(nowMs / (windowMinutes * 60 * 1000)) * windowMinutes * 60 * 1000;
  return new Date(bucketMs).toISOString();
}

function assertBindingDispatchable(binding: { status: string }) {
  if (binding.status !== "VERIFIED") {
    throw new Error("WECHAT_DISPATCH_BLOCKED: recipient binding not VERIFIED");
  }
}

function allowTemplateStatus(status: string) {
  if (status === "LOCKED") return true;
  if (process.env.NODE_ENV === "production") return false;
  return status === "DRAFT";
}

async function appendDispatchCreatedStatus(
  dispatchId: string,
  dependencyOverrides: Partial<WeChatStoreDependencies>
) {
  await appendWeChatDispatchStatusEvent(
    {
      dispatchId,
      eventType: "DISPATCH_CREATED",
      providerStatus: "QUEUED",
      metadata: {
        dispatchVersion: WECHAT_DISPATCH_VERSION,
      },
    },
    dependencyOverrides
  );
}

export async function sendWeChatDispatch(
  input: WeChatDispatchInput,
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  dispatch: WeChatDispatchRecord;
  deduped: boolean;
  providerStatus: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
}> {
  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled) {
    throw new Error("WECHAT_EXTENSION_DISABLED");
  }

  requireValidWeChatEventCode(input.eventCode);
  forbidRegulatorAutoSend(input.recipient.entityType);
  requirePermittedRecipient(input.eventCode, input.recipient.entityType);
  requireCorrelationContract({ eventCode: input.eventCode, correlation: input.correlation });

  const template = await getWeChatTemplateRegistryEntry(
    {
      eventCode: input.eventCode,
      language: normalizeLanguage(input.recipient.language),
    },
    dependencyOverrides
  );

  if (!template) {
    throw new Error(`WECHAT_TEMPLATE_MISSING: ${input.eventCode}`);
  }

  if (!allowTemplateStatus(template.status)) {
    throw new Error(`WECHAT_TEMPLATE_STATUS_BLOCKED: ${template.status}`);
  }

  if (process.env.NODE_ENV === "production" && template.status !== "LOCKED") {
    throw new Error("WECHAT_TEMPLATE_STATUS_BLOCKED: production requires LOCKED template");
  }

  const binding = await getWeChatBindingForEntity(
    {
      entityType: input.recipient.entityType,
      entityId: input.recipient.entityId,
      wechatAppId: runtimeConfig.provider.appId,
    },
    dependencyOverrides
  );

  if (!binding) {
    throw new Error("WECHAT_DISPATCH_BLOCKED: recipient binding missing");
  }

  assertBindingDispatchable(binding);

  const render = renderWeChatMessage({
    template,
    placeholders: input.placeholders,
  });

  const correlationKey = buildCorrelationKey(input.correlation);
  const nowIso = new Date().toISOString();
  const idempotencyWindowBucketUtc = resolveWindowBucket(nowIso);

  const idempotencyKey = buildDispatchIdempotencyKey({
    eventCode: input.eventCode,
    tenantId: null,
    recipientBindingId: binding.bindingId,
    correlationKey: `${correlationKey}:${idempotencyWindowBucketUtc}`,
    renderedPayloadHashSha256: render.renderedPayloadHashSha256,
    forceResend: input.forceResend === true,
    retryOfDispatchId: input.retryOfDispatchId || null,
  });

  if (!input.forceResend) {
    const existing = await getWeChatDispatchByIdempotencyKey(idempotencyKey, dependencyOverrides);
    if (existing) {
      const statuses = await listWeChatDispatchStatusEvents(existing.dispatchId, dependencyOverrides);
      const latest = statuses.length > 0 ? statuses[statuses.length - 1].providerStatus : existing.provider.providerStatus;
      return {
        dispatch: existing,
        deduped: true,
        providerStatus: latest,
      };
    }
  }

  const dispatchId = buildWeChatDispatchRecord({
    eventCode: input.eventCode,
    correlationKey,
    recipientBindingId: binding.bindingId,
    idempotencyKey,
    payloadHashSha256: render.renderedPayloadHashSha256,
  });

  const eventMeta = getWeChatEventMeta(input.eventCode);
  const record: WeChatDispatchRecord = {
    dispatchId,
    idempotencyKey,
    eventCode: input.eventCode,
    correlation: input.correlation,
    correlationKey,
    recipientBindingId: binding.bindingId,
    recipientRoleAtSendTime: binding.entityType,
    render: {
      renderedPayload: render.renderedPayload,
      renderedPayloadHashSha256: render.renderedPayloadHashSha256,
      rendererVersion: render.rendererVersion,
      templateKey: template.templateKey,
      wechatTemplateId: template.wechatTemplateId,
      language: template.language,
      templateRegistryHashSha256: template.hashOfTemplateContractSha256,
    },
    provider: {
      providerName: "WECHAT_OFFICIAL_ACCOUNT",
      providerRequestId: null,
      providerResponseRedacted: null,
      providerStatus: "QUEUED",
      providerErrorCode: null,
    },
    policy: {
      classification: eventMeta.classification,
      retentionClass: eventMeta.retentionClass,
    },
    metadata: {
      createdByRole: input.createdByRole,
      createdById: input.createdById,
      forceResend: input.forceResend === true,
      retryOfDispatchId: input.retryOfDispatchId || null,
      idempotencyWindowBucketUtc,
      dispatchVersion: WECHAT_DISPATCH_VERSION,
      templateSchemaVersion: template.schemaVersion,
    },
    createdAt: nowIso,
  };

  const created = await createWeChatDispatchRecord(record, dependencyOverrides);
  if (!created.created) {
    const statuses = await listWeChatDispatchStatusEvents(created.record.dispatchId, dependencyOverrides);
    const latest = statuses.length > 0 ? statuses[statuses.length - 1].providerStatus : created.record.provider.providerStatus;
    return {
      dispatch: created.record,
      deduped: true,
      providerStatus: latest,
    };
  }

  await appendDispatchCreatedStatus(created.record.dispatchId, dependencyOverrides);

  const provider = createWeChatProviderAdapter({
    mode: runtimeConfig.provider.mode,
    endpoint: runtimeConfig.provider.endpoint,
    accessToken: runtimeConfig.provider.accessToken,
  });

  const result = await provider.sendTemplateMessage({
    toUserId: String(binding.wechatUserId || "").trim(),
    appId: runtimeConfig.provider.appId,
    eventCode: input.eventCode,
    templateId: template.wechatTemplateId,
    language: template.language,
    renderedPayload: render.renderedPayload,
  });

  await appendWeChatDispatchStatusEvent(
    {
      dispatchId: created.record.dispatchId,
      eventType: result.providerStatus === "FAILED" ? "PROVIDER_FAILED" : "PROVIDER_SENT",
      providerStatus: result.providerStatus,
      providerRequestId: result.providerRequestId,
      providerErrorCode: result.providerErrorCode,
      metadata: {
        providerResponseRedacted: result.providerResponseRedacted,
      },
    },
    dependencyOverrides
  );

  return {
    dispatch: created.record,
    deduped: false,
    providerStatus: result.providerStatus,
  };
}

export async function retryFailedWeChatDispatch(
  input: {
    dispatchId: string;
    actorId: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  dispatch: WeChatDispatchRecord;
  providerStatus: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  code: string;
}> {
  const original = await getWeChatDispatchById(input.dispatchId, dependencyOverrides);
  if (!original) {
    throw new Error("WECHAT_DISPATCH_NOT_FOUND");
  }

  const statusEvents = await listWeChatDispatchStatusEvents(original.dispatchId, dependencyOverrides);
  const latestStatus = statusEvents.length > 0 ? statusEvents[statusEvents.length - 1].providerStatus : original.provider.providerStatus;
  if (latestStatus !== "FAILED") {
    throw new Error("WECHAT_RETRY_ONLY_ALLOWED_FOR_FAILED_DISPATCH");
  }

  const binding = await getWeChatBindingById(original.recipientBindingId, dependencyOverrides);
  if (!binding) {
    throw new Error("WECHAT_RETRY_BLOCKED_BINDING_NOT_FOUND");
  }

  const runtimeConfig = resolveWeChatRuntimeConfig();
  const provider = createWeChatProviderAdapter({
    mode: runtimeConfig.provider.mode,
    endpoint: runtimeConfig.provider.endpoint,
    accessToken: runtimeConfig.provider.accessToken,
  });

  await appendWeChatDispatchStatusEvent(
    {
      dispatchId: original.dispatchId,
      eventType: "RETRY_REQUESTED",
      providerStatus: latestStatus,
      metadata: {
        actorId: input.actorId,
      },
    },
    dependencyOverrides
  );

  const providerResult = await provider.sendTemplateMessage({
    toUserId: String(binding.wechatUserId || "").trim(),
    appId: runtimeConfig.provider.appId,
    eventCode: original.eventCode as WeChatEventCode,
    templateId: original.render.wechatTemplateId,
    language: original.render.language,
    renderedPayload: original.render.renderedPayload,
  });

  const eventType = providerResult.providerStatus === "FAILED" ? "PROVIDER_FAILED" : "PROVIDER_SENT";

  await appendWeChatDispatchStatusEvent(
    {
      dispatchId: original.dispatchId,
      eventType,
      providerStatus: providerResult.providerStatus,
      providerRequestId: providerResult.providerRequestId,
      providerErrorCode: providerResult.providerErrorCode,
      metadata: {
        actorId: input.actorId,
        retryDispatchId: original.dispatchId,
      },
    },
    dependencyOverrides
  );

  return {
    dispatch: original,
    providerStatus: providerResult.providerStatus,
    code: providerResult.providerStatus === "FAILED" ? "WECHAT_RETRY_FAILED" : "WECHAT_RETRY_SENT",
  };
}
