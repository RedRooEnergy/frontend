export type WeChatEntityType = "SUPPLIER" | "ADMIN" | "BUYER";

export type WeChatBindingStatus = "PENDING" | "VERIFIED" | "SUSPENDED" | "REVOKED";

export type WeChatVerificationMethod = "QR_LINK" | "OAUTH" | "MANUAL_REVIEW";

export type WeChatTemplateStatus = "DRAFT" | "LOCKED";

export type WeChatLanguage = "en-AU" | "zh-CN";

export type WeChatProviderName = "WECHAT_OFFICIAL_ACCOUNT";

export type WeChatDispatchProviderStatus = "QUEUED" | "SENT" | "DELIVERED" | "FAILED";

export type WeChatClassification = "OPERATIONAL" | "COMPLIANCE" | "FREIGHT" | "PAYMENT" | "ACCOUNT";

export type WeChatRetentionClass = "7Y" | "1Y";

export type WeChatBindingAuditEntry = {
  auditId: string;
  actorRole: "system" | "supplier" | "admin";
  actorId: string;
  action:
    | "BINDING_CREATED"
    | "BINDING_START_REISSUED"
    | "BINDING_VERIFIED"
    | "BINDING_SUSPENDED"
    | "BINDING_REVOKED"
    | "BINDING_REACTIVATED";
  reason: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type WeChatChannelBindingRecord = {
  _id?: string;
  bindingId: string;
  entityType: WeChatEntityType;
  entityId: string;
  wechatAppId: string;
  wechatUserId?: string | null;
  officialAccountFollowerId?: string | null;
  status: WeChatBindingStatus;
  verificationMethod: WeChatVerificationMethod;
  verificationTokenHashSha256?: string | null;
  verificationTokenExpiresAt?: string | null;
  verifiedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  audit: WeChatBindingAuditEntry[];
};

export type WeChatTemplateRegistryRecord = {
  _id?: string;
  eventCode: string;
  templateKey: string;
  wechatTemplateId: string;
  language: WeChatLanguage;
  schemaVersion: string;
  requiredPlaceholders: string[];
  allowedLinks: string[];
  status: WeChatTemplateStatus;
  renderTemplate: string;
  hashOfTemplateContractSha256: string;
  createdAt: string;
};

export type WeChatDispatchRecord = {
  _id?: string;
  dispatchId: string;
  idempotencyKey: string;
  eventCode: string;
  correlation: {
    orderId?: string;
    complianceCaseId?: string;
    shipmentId?: string;
    paymentId?: string;
    productId?: string;
    bindingId?: string;
  };
  correlationKey: string;
  recipientBindingId: string;
  recipientRoleAtSendTime: WeChatEntityType;
  render: {
    renderedPayload: string;
    renderedPayloadHashSha256: string;
    rendererVersion: string;
    templateKey: string;
    wechatTemplateId: string;
    language: WeChatLanguage;
    templateRegistryHashSha256: string;
  };
  provider: {
    providerName: WeChatProviderName;
    providerRequestId?: string | null;
    providerResponseRedacted?: Record<string, unknown> | null;
    providerStatus: WeChatDispatchProviderStatus;
    providerErrorCode?: string | null;
  };
  policy: {
    classification: WeChatClassification;
    retentionClass: WeChatRetentionClass;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type WeChatDispatchStatusEventType =
  | "DISPATCH_CREATED"
  | "PROVIDER_SENT"
  | "PROVIDER_DELIVERED"
  | "PROVIDER_FAILED"
  | "RETRY_REQUESTED"
  | "RETRY_SUPPRESSED";

export type WeChatDispatchStatusEventRecord = {
  _id?: string;
  statusEventId: string;
  dispatchId: string;
  eventType: WeChatDispatchStatusEventType;
  providerStatus: WeChatDispatchProviderStatus;
  providerRequestId?: string | null;
  providerErrorCode?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type WeChatInboundMessageRecord = {
  _id?: string;
  inboundId: string;
  recipientBindingId?: string | null;
  eventContextHint?: {
    dispatchId?: string | null;
    eventCode?: string | null;
  };
  inboundPayload: Record<string, unknown>;
  inboundPayloadHashSha256: string;
  receivedAt: string;
  processed: boolean;
  processingResult: {
    status: "IGNORED" | "MAPPED" | "VERIFICATION_APPLIED" | "FAILED";
    code: string;
    message?: string;
  };
  createdAt: string;
};

export type WeChatAuditAttestationRecord = {
  _id?: string;
  runId: string;
  scorecardJson: Record<string, unknown>;
  signedPdfPath: string;
  summaryPdfPath: string;
  hashManifestPath: string;
  createdAt: string;
};

export type WeChatDispatchRecipient = {
  entityType: WeChatEntityType;
  entityId: string;
  language?: WeChatLanguage;
};

export type WeChatDispatchInput = {
  eventCode: string;
  recipient: WeChatDispatchRecipient;
  correlation: WeChatDispatchRecord["correlation"];
  placeholders: Record<string, string | number | boolean | null | undefined>;
  createdByRole: "system" | "admin";
  createdById: string;
  forceResend?: boolean;
  retryOfDispatchId?: string;
  metadata?: Record<string, unknown>;
};
