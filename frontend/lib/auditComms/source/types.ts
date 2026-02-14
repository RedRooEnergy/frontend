export type AuditCommsChannelName = "EMAIL" | "WECHAT";

export type AuditCommsCorrelationKeyType =
  | "orderId"
  | "shipmentId"
  | "paymentId"
  | "complianceCaseId"
  | "governanceCaseId";

export type AuditCommsCorrelationRefs = {
  orderId?: string;
  shipmentId?: string;
  paymentId?: string;
  complianceCaseId?: string;
  governanceCaseId?: string;
};

export type AuditCommsEvidenceSourceQuery = {
  correlationKey: {
    keyType: AuditCommsCorrelationKeyType;
    keyValue: string;
  };
  startDate?: string;
  endDate?: string;
  limit?: number;
};

export type AuditCommsEvidenceSourceRow = {
  channelName: AuditCommsChannelName;
  dispatchId: string;
  createdAt: string;
  payloadHash: string;
  statusProgressionHash: string | null;
  statusSummary: string;
  correlationRefs: AuditCommsCorrelationRefs;
  providerStatus?: string;
  providerErrorCodeRedacted?: string | null;
};

export const AUDIT_COMMS_SOURCE_MAX_LIMIT = 500;

export const AUDIT_COMMS_CORRELATION_KEY_TYPES: ReadonlyArray<AuditCommsCorrelationKeyType> = [
  "orderId",
  "shipmentId",
  "paymentId",
  "complianceCaseId",
  "governanceCaseId",
];
