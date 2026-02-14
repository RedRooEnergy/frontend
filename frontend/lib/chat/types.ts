export type ChatActorRole =
  | "BUYER"
  | "SUPPLIER"
  | "ADMIN"
  | "REGULATOR"
  | "FREIGHT"
  | "SERVICE_PARTNER"
  | "SYSTEM";

export type ChatThreadType =
  | "ORDER"
  | "PRODUCT_INQUIRY"
  | "COMPLIANCE"
  | "FREIGHT"
  | "WARRANTY"
  | "ADMIN";

export type ChatRelatedEntityType =
  | "ORDER"
  | "PRODUCT"
  | "CASE"
  | "WARRANTY_INCIDENT"
  | "NONE";

export type ChatThreadStatus = "OPEN" | "ESCALATED" | "LOCKED" | "ARCHIVED";

export type ChatParticipant = {
  userId: string;
  role: Exclude<ChatActorRole, "SYSTEM">;
  orgId?: string;
  supplierId?: string;
  buyerId?: string;
};

export type ChatAttachmentSnapshot = {
  attachmentId: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
  storageKey?: string;
  uploadedAt?: string;
};

export type ChatThreadRecord = {
  _id?: string;
  threadId: string;
  type: ChatThreadType;
  relatedEntityType: ChatRelatedEntityType;
  relatedEntityId: string | null;
  participants: ChatParticipant[];
  status: ChatThreadStatus;
  caseId: string | null;
  tenantId: string | null;
  threadHash: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
};

export type ChatMessageRecord = {
  _id?: string;
  messageId: string;
  threadId: string;
  senderId: string;
  senderRole: ChatActorRole;
  body: string;
  attachments: ChatAttachmentSnapshot[];
  systemEvent: boolean;
  systemEventType: string | null;
  createdAt: string;
  messageHash: string;
  moderationFlags: string[];
};

export type ChatAttachmentRecord = {
  _id?: string;
  attachmentId: string;
  threadId: string | null;
  uploadedBy: string;
  uploadedByRole: ChatActorRole;
  fileName: string;
  mime: string;
  size: number;
  sha256: string | null;
  storageKey: string | null;
  uploadStatus: "PENDING" | "UPLOADED" | "FAILED";
  createdAt: string;
  uploadedAt: string | null;
};

export type ChatRedactionEventRecord = {
  _id?: string;
  redactionEventId: string;
  threadId: string;
  messageId: string;
  reasonCode: string;
  reasonDetail: string | null;
  redactedBy: string;
  redactedByRole: ChatActorRole;
  createdAt: string;
  redactionHash: string;
};

export type ChatControlEventType =
  | "THREAD_CREATED"
  | "MESSAGE_POSTED"
  | "THREAD_ESCALATED"
  | "THREAD_LOCKED"
  | "MESSAGE_REDACTED"
  | "THREAD_EXPORTED"
  | "ATTACHMENT_CREATED"
  | "ATTACHMENT_UPLOADED"
  | "CASE_CREATED";

export type ChatControlEventRecord = {
  _id?: string;
  eventId: string;
  threadId: string | null;
  messageId: string | null;
  actorId: string;
  actorRole: ChatActorRole;
  eventType: ChatControlEventType;
  metadata: Record<string, unknown> | null;
  eventHash: string;
  createdAt: string;
};

export type ChatCaseCategory = "SUPPORT" | "FREIGHT" | "WARRANTY" | "FINANCE" | "MODERATION";

export type ChatCaseRecord = {
  _id?: string;
  caseId: string;
  threadId: string;
  category: ChatCaseCategory;
  status: "OPEN" | "IN_REVIEW" | "CLOSED";
  reasonCode: string;
  createdBy: string;
  createdByRole: ChatActorRole;
  createdAt: string;
  updatedAt: string;
};

export type ChatActor = {
  actorId: string;
  actorEmail: string;
  actorRole: Exclude<ChatActorRole, "SYSTEM">;
};

export type ChatRelatedEntityContext = {
  relatedEntityType: ChatRelatedEntityType;
  relatedEntityId: string | null;
  ownerBuyerId?: string | null;
  ownerBuyerEmail?: string | null;
  supplierId?: string | null;
  participantIds?: string[];
};
