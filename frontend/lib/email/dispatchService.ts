import "server-only";
import crypto from "crypto";
import { EmailQueue } from "./queue";
import { createEmailProvider } from "./provider";
import { EMAIL_POLICY } from "./policies";
import { renderTemplate } from "./renderer";
import {
  buildIdempotencyKey,
  forbidRegulatorAutoSend,
  requirePermittedRecipientRole,
  requireRecipientScope,
  requireValidEventCode,
} from "./guards";
import { EmailEventCode, EmailRecipientRole } from "./events";
import {
  EmailDispatch,
  getDispatchByIdempotencyKey,
  getLatestTemplateForEvent,
  isEmailEventBlocked,
  recordEmailDispatch,
} from "./store";
import { scopeResolvers } from "./scopeResolvers";

export type EmailRecipient = {
  userId: string;
  role: EmailRecipientRole;
  email: string;
  displayName?: string;
  language?: "EN" | "ZH_CN";
};

export type EmailSendInput = {
  eventCode: EmailEventCode;
  recipient: EmailRecipient;
  entityRefs: Record<string, string>;
  variables?: Record<string, string | number>;
  language?: "EN" | "ZH_CN";
};

let queue: EmailQueue | null = null;

function getQueue() {
  if (!queue) {
    queue = new EmailQueue(createEmailProvider());
  }
  return queue;
}

function resolveStableEntityKey(entityRefs: Record<string, string>) {
  const candidates = [
    entityRefs.primaryId,
    entityRefs.orderId,
    entityRefs.productId,
    entityRefs.workflowId,
    entityRefs.supplierId,
    entityRefs.buyerId,
  ].filter(Boolean);
  return candidates[0] || null;
}

function resolveLanguage(input: EmailSendInput) {
  return (
    input.language ||
    input.recipient.language ||
    EMAIL_POLICY.languages.fallback
  );
}

function allowTemplateStatus(status: string) {
  if (status === "LOCKED") return true;
  if (process.env.NODE_ENV === "production") return false;
  return status === "APPROVED";
}

export async function sendEmail(input: EmailSendInput) {
  requireValidEventCode(input.eventCode);
  forbidRegulatorAutoSend(input.recipient.role);
  requirePermittedRecipientRole(input.eventCode, input.recipient.role);

  if (await isEmailEventBlocked(input.eventCode)) {
    throw new Error(`EMAIL_EVENT_DISABLED: ${input.eventCode}`);
  }

  await requireRecipientScope({
    role: input.recipient.role,
    recipientUserId: input.recipient.userId,
    recipientEmail: input.recipient.email,
    entityRefs: input.entityRefs,
    scopeResolvers,
  });

  const language = resolveLanguage(input);
  const template =
    (await getLatestTemplateForEvent(input.eventCode, input.recipient.role, language)) ||
    (language !== "EN"
      ? await getLatestTemplateForEvent(input.eventCode, input.recipient.role, "EN")
      : null);

  if (!template) {
    throw new Error(`EMAIL_TEMPLATE_MISSING: ${input.eventCode}:${input.recipient.role}`);
  }
  if (!allowTemplateStatus(template.status)) {
    throw new Error(`EMAIL_TEMPLATE_STATUS_BLOCKED: ${template.status}`);
  }

  const stableEntityKey = resolveStableEntityKey(input.entityRefs);
  if (!stableEntityKey) {
    throw new Error("EMAIL_GOVERNANCE_VIOLATION: entityRefs missing primaryId");
  }

  const idempotencyKey = buildIdempotencyKey({
    eventCode: input.eventCode,
    recipientUserId: input.recipient.userId,
    stableEntityKey,
  });

  const existing = await getDispatchByIdempotencyKey(idempotencyKey);
  if (existing) return existing;

  const defaults: Record<string, string | number> = {
    eventCode: input.eventCode,
    recipientName: input.recipient.displayName || input.recipient.email,
    referenceId: stableEntityKey,
    referenceUrl: input.entityRefs.referenceUrl || "",
    actionRequired: input.entityRefs.actionRequired || "",
  };
  const variables = { ...defaults, ...(input.variables || {}) };

  const rendered = renderTemplate(
    {
      subjectTemplate: template.subjectTemplate,
      bodyTemplateHtml: template.bodyTemplateHtml,
      bodyTemplateText: template.bodyTemplateText,
      allowedVariables: template.allowedVariables,
    },
    variables
  );

  let providerMessageId: string | null = null;
  let sendStatus: EmailDispatch["sendStatus"] = "SENT";
  let error: string | null = null;

  try {
    providerMessageId = await getQueue().send({
      to: input.recipient.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (err: any) {
    sendStatus = "FAILED";
    error = err?.message || "EMAIL_SEND_FAILED";
  }

  const dispatch: EmailDispatch = {
    dispatchId: crypto.randomUUID(),
    eventCode: input.eventCode,
    templateId: template.templateId,
    templateVersion: template.version,
    recipientUserId: input.recipient.userId,
    recipientRole: input.recipient.role,
    recipientEmail: input.recipient.email,
    entityRefs: input.entityRefs,
    renderedHash: rendered.hash,
    providerMessageId,
    sendStatus,
    error,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  return recordEmailDispatch(dispatch);
}
