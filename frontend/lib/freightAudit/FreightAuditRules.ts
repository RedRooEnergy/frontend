export type FreightAuditRuleId =
  | "F-01"
  | "F-02"
  | "F-03"
  | "F-04"
  | "F-05"
  | "F-06"
  | "F-07"
  | "F-08"
  | "F-09"
  | "F-10"
  | "F-11"
  | "F-12";

export type FreightAuditSeverity = "CRITICAL" | "MAJOR" | "MINOR";
export type FreightAuditEscalationLevel = "LOG_ONLY" | "REVIEW_REQUIRED" | "ESCALATE" | "BLOCK_ESCROW";

export type FreightAuditLifecycleStage =
  | "ONBOARDING_AUTHORITY"
  | "PRICING_QUOTATION"
  | "ORDER_BOOKING_BINDING"
  | "PICKUP_CUSTODY"
  | "INTERNATIONAL_TRANSIT"
  | "CUSTOMS_DDP"
  | "LAST_MILE_DELIVERY"
  | "INSURANCE_CLAIMS"
  | "ESCROW_SETTLEMENT"
  | "EXCEPTION_MANAGEMENT"
  | "API_DATA_IMMUTABILITY"
  | "REGULATOR_READINESS";

export type FreightAuditTriggerEvent =
  | "BOOKED"
  | "DISPATCHED"
  | "CUSTOMS_CLEARED"
  | "DELIVERED"
  | "ESCROW_ELIGIBLE"
  | "PAYOUT_READY";

export type FreightAuditResponsibleParty =
  | "PLATFORM"
  | "SUPPLIER"
  | "FREIGHT_PARTNER"
  | "CARRIER"
  | "BUYER";

export type FreightEvidenceSource = "API" | "WEBHOOK" | "DOCUMENT" | "CUSTOMS" | "CARRIER" | "SYSTEM";

export type FreightAuditEvidenceRequirement = {
  code: string;
  description: string;
  source: FreightEvidenceSource;
  required: boolean;
};

export type FreightAuditConditionDefinition = {
  evaluatorKey: string;
  summary: string;
  inputs: string[];
};

export type FreightAuditRuleDefinition = {
  id: FreightAuditRuleId;
  title: string;
  description: string;
  severity: FreightAuditSeverity;
  escalationLevel: FreightAuditEscalationLevel;
  blocking: boolean;
  lifecycleStage: FreightAuditLifecycleStage;
  triggerEvent: FreightAuditTriggerEvent[];
  responsibleParty: FreightAuditResponsibleParty;
  tags: string[];
  condition: FreightAuditConditionDefinition;
  requiredEvidence: FreightAuditEvidenceRequirement[];
};

export type FreightAuditRuleSet = {
  extensionId: "EXT-FREIGHT-02";
  ruleSetId: "freight-audit-rules";
  version: "v1.0.0";
  publishedAtUtc: string;
  rules: FreightAuditRuleDefinition[];
};

/**
 * Declarative initial rule definitions (F-01 .. F-12).
 * These definitions are intentionally data-only and can be persisted/versioned
 * without route-handler changes.
 */
export const FREIGHT_AUDIT_RULE_SET: FreightAuditRuleSet = {
  extensionId: "EXT-FREIGHT-02",
  ruleSetId: "freight-audit-rules",
  version: "v1.0.0",
  publishedAtUtc: "2026-02-12T00:00:00.000Z",
  rules: [
    {
      id: "F-01",
      title: "Freight Partner Onboarding & Authority",
      description:
        "Verify partner legal identity, insurance validity, DDP authority, and credential scope before booking is accepted.",
      severity: "CRITICAL",
      escalationLevel: "BLOCK_ESCROW",
      blocking: true,
      lifecycleStage: "ONBOARDING_AUTHORITY",
      triggerEvent: ["BOOKED"],
      responsibleParty: "PLATFORM",
      tags: ["onboarding", "authority", "insurance", "ddp"],
      condition: {
        evaluatorKey: "validateFreightPartnerAuthority",
        summary:
          "Partner identity, insurance policy window, and declared DDP authority must all be valid for the shipment.",
        inputs: ["freightPartnerId", "shipment.incoterm", "shipment.dispatchDate", "partner.insurancePolicy"],
      },
      requiredEvidence: [
        { code: "PARTNER_LEGAL_ENTITY_RECORD", description: "Registered legal entity proof.", source: "DOCUMENT", required: true },
        { code: "PARTNER_INSURANCE_POLICY", description: "Active cargo/public liability coverage.", source: "DOCUMENT", required: true },
        { code: "PARTNER_DDP_AUTH_DECLARATION", description: "Declared DDP capability and duty/GST responsibility.", source: "SYSTEM", required: true },
      ],
    },
    {
      id: "F-02",
      title: "Pricing & Quotation Integrity",
      description:
        "Ensure freight quotation is generated from approved rules and includes DDP duty/GST components without post-order repricing.",
      severity: "CRITICAL",
      escalationLevel: "BLOCK_ESCROW",
      blocking: true,
      lifecycleStage: "PRICING_QUOTATION",
      triggerEvent: ["BOOKED"],
      responsibleParty: "PLATFORM",
      tags: ["pricing", "quote", "ddp", "duty", "gst"],
      condition: {
        evaluatorKey: "validateFreightQuoteIntegrity",
        summary:
          "Freight quote must be rate-table derived, surcharge-disclosed, and immutable once order is confirmed.",
        inputs: ["orderId", "quote.rateTableVersion", "quote.lineItems", "order.confirmedAt", "quote.lockedAt"],
      },
      requiredEvidence: [
        { code: "QUOTE_RATE_TABLE_VERSION", description: "Applied freight rate table/version.", source: "SYSTEM", required: true },
        { code: "QUOTE_DDP_BREAKDOWN", description: "Duty/GST/clearance components disclosed.", source: "SYSTEM", required: true },
        { code: "QUOTE_LOCK_RECORD", description: "Timestamp proving quote immutability post-order.", source: "SYSTEM", required: true },
      ],
    },
    {
      id: "F-03",
      title: "Order to Shipment Binding",
      description:
        "Confirm deterministic order-shipment linkage with unique shipment identity and tracked split consignments.",
      severity: "CRITICAL",
      escalationLevel: "ESCALATE",
      blocking: true,
      lifecycleStage: "ORDER_BOOKING_BINDING",
      triggerEvent: ["DISPATCHED"],
      responsibleParty: "PLATFORM",
      tags: ["booking", "binding", "idempotency", "split-orders"],
      condition: {
        evaluatorKey: "validateOrderShipmentBinding",
        summary:
          "Each shipment must map to one order binding context with unique shipment IDs and explicit split rationale.",
        inputs: ["orderId", "shipmentId", "shipment.splitGroup", "booking.confirmationRef"],
      },
      requiredEvidence: [
        { code: "ORDER_SHIPMENT_BINDING_RECORD", description: "Persisted order/shipment linkage.", source: "SYSTEM", required: true },
        { code: "CARRIER_BOOKING_CONFIRMATION", description: "Carrier or forwarder booking confirmation reference.", source: "API", required: true },
      ],
    },
    {
      id: "F-04",
      title: "Supplier Pickup & Chain of Custody",
      description:
        "Validate pickup readiness, dangerous goods declarations, and immutable custody handover evidence.",
      severity: "CRITICAL",
      escalationLevel: "ESCALATE",
      blocking: true,
      lifecycleStage: "PICKUP_CUSTODY",
      triggerEvent: ["DISPATCHED"],
      responsibleParty: "FREIGHT_PARTNER",
      tags: ["pickup", "custody", "dangerous-goods", "evidence"],
      condition: {
        evaluatorKey: "validatePickupCustodyEvidence",
        summary:
          "Pickup must include packaging checks, DG declaration status, and signed/photographic handover evidence.",
        inputs: ["shipmentId", "pickup.window", "pickup.weightDimensions", "pickup.handoverEvidence"],
      },
      requiredEvidence: [
        { code: "PICKUP_HANDOVER_PROOF", description: "Signature/photo custody transfer proof.", source: "DOCUMENT", required: true },
        { code: "PICKUP_WEIGHT_DIMENSIONS", description: "Captured pickup metrics for anti-tamper checks.", source: "SYSTEM", required: true },
        { code: "DANGEROUS_GOODS_DECLARATION", description: "Declared DG/lithium handling where applicable.", source: "DOCUMENT", required: true },
      ],
    },
    {
      id: "F-05",
      title: "International Transit Integrity (Sea/Air)",
      description:
        "Assure selected mode (sea/air) matches quote and that carrier tracking milestones are continuous and valid.",
      severity: "MAJOR",
      escalationLevel: "ESCALATE",
      blocking: false,
      lifecycleStage: "INTERNATIONAL_TRANSIT",
      triggerEvent: ["CUSTOMS_CLEARED"],
      responsibleParty: "FREIGHT_PARTNER",
      tags: ["transit", "sea", "air", "tracking", "sla"],
      condition: {
        evaluatorKey: "validateInternationalTransitMilestones",
        summary:
          "Transport mode, carrier assignment, and milestone progression must align with quoted SLA and service level.",
        inputs: ["shipment.mode", "quote.mode", "tracking.events", "tracking.reference"],
      },
      requiredEvidence: [
        { code: "CARRIER_TRACKING_REFERENCE", description: "Primary carrier tracking identifier.", source: "CARRIER", required: true },
        { code: "TRANSIT_MILESTONE_EVENTS", description: "Chronological in-transit event stream.", source: "WEBHOOK", required: true },
      ],
    },
    {
      id: "F-06",
      title: "Customs, Duty & GST Governance (DDP)",
      description:
        "Require validated HS classification, duty/GST calculations, and customs clearance evidence before progression.",
      severity: "CRITICAL",
      escalationLevel: "BLOCK_ESCROW",
      blocking: true,
      lifecycleStage: "CUSTOMS_DDP",
      triggerEvent: ["CUSTOMS_CLEARED"],
      responsibleParty: "PLATFORM",
      tags: ["customs", "ddp", "duty", "gst", "hs-code"],
      condition: {
        evaluatorKey: "validateCustomsDutyGst",
        summary:
          "Customs-cleared state requires verifiable entry evidence and consistent duty/GST computation under DDP payer identity.",
        inputs: ["shipment.customsEntryNumber", "shipment.hsCode", "shipment.dutyAmount", "shipment.gstAmount", "shipment.ddpPayer"],
      },
      requiredEvidence: [
        { code: "CUSTOMS_ENTRY_RECORD", description: "Broker/customs entry reference and clearance state.", source: "CUSTOMS", required: true },
        { code: "DUTY_GST_CALCULATION_SNAPSHOT", description: "Deterministic duty/GST computation snapshot.", source: "SYSTEM", required: true },
        { code: "HS_CLASSIFICATION_EVIDENCE", description: "HS code justification record.", source: "DOCUMENT", required: true },
      ],
    },
    {
      id: "F-07",
      title: "Last-Mile Delivery & POD Validation",
      description:
        "Ensure delivery confirmation includes recipient verification and immutable POD evidence for settlement gating.",
      severity: "CRITICAL",
      escalationLevel: "BLOCK_ESCROW",
      blocking: true,
      lifecycleStage: "LAST_MILE_DELIVERY",
      triggerEvent: ["DELIVERED"],
      responsibleParty: "CARRIER",
      tags: ["last-mile", "delivery", "pod", "recipient"],
      condition: {
        evaluatorKey: "validateLastMilePod",
        summary:
          "Delivered milestone is valid only with recipient-verified POD and logged delivery attempts.",
        inputs: ["shipment.deliveryAttempts", "shipment.podReference", "shipment.recipientVerification"],
      },
      requiredEvidence: [
        { code: "PROOF_OF_DELIVERY_REFERENCE", description: "POD document or carrier confirmation ref.", source: "CARRIER", required: true },
        { code: "DELIVERY_ATTEMPT_LOG", description: "Timestamped delivery attempts and outcomes.", source: "SYSTEM", required: true },
      ],
    },
    {
      id: "F-08",
      title: "Insurance Binding & Claims Readiness",
      description:
        "Check shipment insurance binding timing, declared value coverage, and claim evidence completeness.",
      severity: "MAJOR",
      escalationLevel: "REVIEW_REQUIRED",
      blocking: false,
      lifecycleStage: "INSURANCE_CLAIMS",
      triggerEvent: ["DELIVERED"],
      responsibleParty: "PLATFORM",
      tags: ["insurance", "claims", "coverage", "loss-damage"],
      condition: {
        evaluatorKey: "validateInsuranceCoverageAndClaims",
        summary:
          "Insurance must be bound pre-dispatch with coverage matching shipment value and claim package completeness.",
        inputs: ["shipment.insuranceBoundAt", "shipment.dispatchDate", "shipment.declaredValue", "shipment.insuredValue", "claims.records"],
      },
      requiredEvidence: [
        { code: "INSURANCE_POLICY_BINDING", description: "Policy bound timestamp and policy reference.", source: "DOCUMENT", required: true },
        { code: "CLAIMS_EVIDENCE_PACK", description: "Loss/damage claim support documents where applicable.", source: "DOCUMENT", required: false },
      ],
    },
    {
      id: "F-09",
      title: "Freight Escrow & Settlement Gating",
      description:
        "Prevent freight settlement progression unless POD and all critical freight controls have passed.",
      severity: "CRITICAL",
      escalationLevel: "BLOCK_ESCROW",
      blocking: true,
      lifecycleStage: "ESCROW_SETTLEMENT",
      triggerEvent: ["ESCROW_ELIGIBLE"],
      responsibleParty: "PLATFORM",
      tags: ["escrow", "settlement", "payment", "financial-controls"],
      condition: {
        evaluatorKey: "validateEscrowFreightGate",
        summary:
          "Escrow eligibility requires completed delivery confirmation, POD, and no unresolved critical freight failures.",
        inputs: ["orderId", "shipmentId", "shipment.podReference", "audit.openCriticalFailures", "payment.escrowStatus"],
      },
      requiredEvidence: [
        { code: "ESCROW_GATE_DECISION_RECORD", description: "Deterministic decision record for escrow gate.", source: "SYSTEM", required: true },
        { code: "DELIVERY_CONFIRMATION_EVENT", description: "Delivery confirmation event and timestamp.", source: "API", required: true },
      ],
    },
    {
      id: "F-10",
      title: "Exception Detection & Escalation Workflow",
      description:
        "Detect SLA delays, missing milestones, and customs/payment anomalies with mandatory exception lifecycle transitions.",
      severity: "MAJOR",
      escalationLevel: "ESCALATE",
      blocking: false,
      lifecycleStage: "EXCEPTION_MANAGEMENT",
      triggerEvent: ["ESCROW_ELIGIBLE"],
      responsibleParty: "PLATFORM",
      tags: ["exceptions", "sla", "alerts", "escalation"],
      condition: {
        evaluatorKey: "validateExceptionLifecycle",
        summary:
          "Detected operational anomalies must create traceable exceptions with explicit owner and closure evidence.",
        inputs: ["shipmentId", "exception.status", "exception.owner", "exception.resolutionEvidence"],
      },
      requiredEvidence: [
        { code: "EXCEPTION_RECORD", description: "Immutable exception record with severity/owner.", source: "SYSTEM", required: true },
        { code: "EXCEPTION_RESOLUTION_EVIDENCE", description: "Evidence required for closure/override.", source: "DOCUMENT", required: false },
      ],
    },
    {
      id: "F-11",
      title: "API Security, Data Isolation & Immutability",
      description:
        "Validate webhook authenticity, cross-tenant isolation, and immutable shipment evidence after milestone lock.",
      severity: "CRITICAL",
      escalationLevel: "ESCALATE",
      blocking: true,
      lifecycleStage: "API_DATA_IMMUTABILITY",
      triggerEvent: ["PAYOUT_READY"],
      responsibleParty: "PLATFORM",
      tags: ["api-security", "immutability", "tenant-isolation", "webhook"],
      condition: {
        evaluatorKey: "validateApiIntegrityAndIsolation",
        summary:
          "Webhook signatures, tenant scope boundaries, and post-milestone immutability must hold across freight records.",
        inputs: ["webhook.signatureValid", "record.tenantId", "record.mutationAfterLock", "evidence.hash"],
      },
      requiredEvidence: [
        { code: "WEBHOOK_SIGNATURE_LOG", description: "Verified webhook signature entries.", source: "WEBHOOK", required: true },
        { code: "EVIDENCE_HASH_RECORD", description: "Stored hash integrity record for immutable evidence.", source: "SYSTEM", required: true },
      ],
    },
    {
      id: "F-12",
      title: "Regulator Replay & Evidence Pack Readiness",
      description:
        "Guarantee deterministic reconstruction of freight timeline and export-ready, hash-verifiable regulator evidence packs.",
      severity: "CRITICAL",
      escalationLevel: "ESCALATE",
      blocking: true,
      lifecycleStage: "REGULATOR_READINESS",
      triggerEvent: ["PAYOUT_READY"],
      responsibleParty: "PLATFORM",
      tags: ["regulator", "evidence-pack", "replay", "export"],
      condition: {
        evaluatorKey: "validateRegulatorEvidenceReplay",
        summary:
          "Run must support deterministic timeline replay with complete evidence references and stable export ordering.",
        inputs: ["auditRunId", "timeline.events", "evidence.manifestHash", "export.generatedAt"],
      },
      requiredEvidence: [
        { code: "TIMELINE_REPLAY_EXPORT", description: "Deterministic freight timeline export.", source: "SYSTEM", required: true },
        { code: "EVIDENCE_PACK_MANIFEST", description: "Hash-linked regulator evidence manifest.", source: "SYSTEM", required: true },
      ],
    },
  ],
};

export const FREIGHT_AUDIT_RULE_SET_VERSION = `${FREIGHT_AUDIT_RULE_SET.ruleSetId}.${FREIGHT_AUDIT_RULE_SET.version}` as const;

export function listFreightAuditRules() {
  return FREIGHT_AUDIT_RULE_SET.rules.slice();
}

export function getFreightAuditRule(ruleId: FreightAuditRuleId) {
  return FREIGHT_AUDIT_RULE_SET.rules.find((rule) => rule.id === ruleId) ?? null;
}

export function listFreightAuditRulesByTrigger(triggerEvent: FreightAuditTriggerEvent) {
  return FREIGHT_AUDIT_RULE_SET.rules.filter((rule) => rule.triggerEvent.includes(triggerEvent));
}

export function validateFreightAuditRuleSet() {
  const ids = new Set<string>();
  for (const rule of FREIGHT_AUDIT_RULE_SET.rules) {
    if (ids.has(rule.id)) throw new Error(`Duplicate freight rule id: ${rule.id}`);
    ids.add(rule.id);
    if (!rule.condition.evaluatorKey) throw new Error(`Missing evaluatorKey for ${rule.id}`);
    if (!rule.triggerEvent.length) throw new Error(`Missing triggerEvent for ${rule.id}`);
    if (!rule.requiredEvidence.length) throw new Error(`Missing requiredEvidence for ${rule.id}`);
  }
  if (ids.size !== 12) throw new Error(`Expected 12 freight rules, got ${ids.size}`);
  return true;
}
