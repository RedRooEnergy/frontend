import { appendChatControlEvent, appendChatMessage, createChatCase, updateChatThreadState } from "./store";
import type { ChatActor, ChatCaseCategory, ChatMessageRecord, ChatThreadRecord } from "./types";

type TriggerRule = {
  id: string;
  category: ChatCaseCategory;
  reasonCode: string;
  keywords: string[];
};

const RULES: TriggerRule[] = [
  {
    id: "support_refund_return",
    category: "SUPPORT",
    reasonCode: "SUPPORT_REFUND_RETURN",
    keywords: ["refund", "return"],
  },
  {
    id: "freight_delivery_missing",
    category: "FREIGHT",
    reasonCode: "FREIGHT_DELIVERY_EXCEPTION",
    keywords: ["not delivered", "tracking", "missing"],
  },
  {
    id: "warranty_faulty_broken",
    category: "WARRANTY",
    reasonCode: "WARRANTY_QUALITY_ISSUE",
    keywords: ["faulty", "warranty", "broken"],
  },
  {
    id: "finance_chargeback_dispute",
    category: "FINANCE",
    reasonCode: "FINANCE_CHARGEBACK_DISPUTE",
    keywords: ["chargeback", "dispute"],
  },
  {
    id: "moderation_abuse",
    category: "MODERATION",
    reasonCode: "MODERATION_ABUSE_FLAG",
    keywords: ["abuse", "threat", "violent"],
  },
];

function normalizeBody(body: string) {
  return String(body || "").trim().toLowerCase();
}

function findTriggeredRule(body: string) {
  const normalized = normalizeBody(body);
  if (!normalized) return null;
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule;
    }
  }
  return null;
}

export async function runChatAutomationRules(input: {
  actor: ChatActor;
  thread: ChatThreadRecord;
  message: ChatMessageRecord;
}) {
  const rule = findTriggeredRule(input.message.body);
  if (!rule) return { triggered: false as const };

  if (input.thread.caseId) {
    await appendChatControlEvent({
      threadId: input.thread.threadId,
      messageId: input.message.messageId,
      actorId: "system",
      actorRole: "SYSTEM",
      eventType: "CASE_CREATED",
      metadata: {
        skipped: true,
        reason: "CASE_ALREADY_EXISTS",
        ruleId: rule.id,
        caseId: input.thread.caseId,
      },
    });

    return {
      triggered: true as const,
      skipped: true as const,
      existingCaseId: input.thread.caseId,
      ruleId: rule.id,
    };
  }

  const caseRecord = await createChatCase({
    threadId: input.thread.threadId,
    category: rule.category,
    reasonCode: rule.reasonCode,
    createdBy: input.actor.actorId,
    createdByRole: input.actor.actorRole,
  });

  const updatedThread = await updateChatThreadState({
    threadId: input.thread.threadId,
    status: "ESCALATED",
    caseId: caseRecord.caseId,
  });

  const systemMessage = await appendChatMessage({
    threadId: input.thread.threadId,
    senderId: "system",
    senderRole: "SYSTEM",
    body: `Thread escalated, Case #${caseRecord.caseId} created`,
    attachments: [],
    systemEvent: true,
    systemEventType: "THREAD_ESCALATED_CASE_CREATED",
    moderationFlags: [rule.reasonCode],
  });

  await appendChatControlEvent({
    threadId: input.thread.threadId,
    messageId: input.message.messageId,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "THREAD_ESCALATED",
    metadata: {
      caseId: caseRecord.caseId,
      category: caseRecord.category,
      reasonCode: caseRecord.reasonCode,
      ruleId: rule.id,
      threadStatus: updatedThread?.status || "ESCALATED",
    },
  });

  await appendChatControlEvent({
    threadId: input.thread.threadId,
    messageId: systemMessage.messageId,
    actorId: "system",
    actorRole: "SYSTEM",
    eventType: "CASE_CREATED",
    metadata: {
      caseId: caseRecord.caseId,
      category: caseRecord.category,
      reasonCode: caseRecord.reasonCode,
      ruleId: rule.id,
    },
  });

  return {
    triggered: true as const,
    skipped: false as const,
    caseId: caseRecord.caseId,
    category: caseRecord.category,
    ruleId: rule.id,
  };
}
