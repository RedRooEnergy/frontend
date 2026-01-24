import { AuditEvent } from "../../../core/platform/src/audit/audit-event";

export const DDP_AUDIT_EVENTS = {
  DDP_CALCULATED: "DDP_CALCULATED",
  SHIPMENT_CREATED: "SHIPMENT_CREATED",
  SHIPMENT_DISPATCHED: "SHIPMENT_DISPATCHED",
} as const;

export type DDPAuditEventType =
  (typeof DDP_AUDIT_EVENTS)[keyof typeof DDP_AUDIT_EVENTS];

export type DDPAuditEvent = AuditEvent & {
  readonly eventType: DDPAuditEventType;
  readonly shipmentId: string;
};
