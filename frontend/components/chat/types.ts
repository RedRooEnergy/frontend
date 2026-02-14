export type ChatRole = "BUYER" | "SUPPLIER" | "ADMIN";

export type ChatThreadSummary = {
  threadId: string;
  type: string;
  status: "OPEN" | "ESCALATED" | "LOCKED" | "ARCHIVED";
  relatedEntityType: string;
  relatedEntityId: string | null;
  caseId: string | null;
  updatedAt: string;
  unreadCount: number;
  latestMessage: {
    messageId: string;
    senderId: string;
    senderRole: string;
    createdAt: string;
    bodyPreview: string;
    systemEvent: boolean;
  } | null;
};

export type ChatRedactionView = {
  isRedacted: boolean;
  redactedAt: string | null;
  redactionEventId: string | null;
};

export type ChatMessageView = {
  messageId: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  body: string;
  attachments: Array<{
    attachmentId: string;
    name: string;
    mime: string;
    size: number;
    sha256: string;
    storageKey?: string;
  }>;
  systemEvent: boolean;
  systemEventType: string | null;
  createdAt: string;
  messageHash: string;
  moderationFlags: string[];
  redaction: ChatRedactionView;
};

export type ChatThreadDetail = {
  thread: {
    threadId: string;
    type: string;
    status: "OPEN" | "ESCALATED" | "LOCKED" | "ARCHIVED";
    relatedEntityType: string;
    relatedEntityId: string | null;
    caseId: string | null;
    participants: Array<{
      userId: string;
      role: string;
      orgId?: string;
      supplierId?: string;
      buyerId?: string;
    }>;
    createdAt: string;
    updatedAt: string;
    lockedBy: string | null;
  };
  messages: ChatMessageView[];
  redactions: Array<{
    redactionEventId: string;
    messageId: string;
    reasonCode: string;
    reasonDetail: string | null;
    redactedBy: string;
    redactedByRole: string;
    createdAt: string;
  }>;
  etag: string;
};

export type UploadedAttachmentRef = {
  attachmentId: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
};
