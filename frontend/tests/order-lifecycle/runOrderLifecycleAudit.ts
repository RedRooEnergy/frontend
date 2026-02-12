import { buildCheck, fileContains, fileExists, writeScorecard } from "../governance/auditRunner";

const checks = [
  buildCheck(
    "ORDER-01",
    "Order state machine docs exist and include required states",
    fileExists("extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md") &&
      [
        "DRAFT",
        "CREATED",
        "PAYMENT_HELD",
        "COMPLIANCE_PENDING",
        "COMPLIANCE_APPROVED",
        "COMPLIANCE_FAILED",
        "FREIGHT_PENDING",
        "IN_TRANSIT",
        "DELIVERED",
        "SETTLEMENT_PENDING",
        "SETTLEMENT_RELEASED",
        "CLOSED",
      ].every((state) => fileContains("extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md", state)),
    "Canonical order state machine exists with all required states.",
    "Canonical order state machine is missing or incomplete.",
    ["extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md"]
  ),
  buildCheck(
    "ORDER-02",
    "Event taxonomy exists and includes required event codes",
    fileExists("extensions/order-lifecycle/02_ORDER_EVENT_TAXONOMY.md") &&
      [
        "ORDER_CREATED",
        "PAYMENT_HELD",
        "COMPLIANCE_APPROVED",
        "SHIPMENT_DISPATCHED",
        "DELIVERY_CONFIRMED",
        "SETTLEMENT_RELEASED",
        "RETURN_REQUESTED",
        "DISPUTE_OPENED",
      ].every((code) => fileContains("extensions/order-lifecycle/02_ORDER_EVENT_TAXONOMY.md", code)),
    "Canonical order event taxonomy exists with required event codes.",
    "Order event taxonomy is missing required canonical event codes.",
    ["extensions/order-lifecycle/02_ORDER_EVENT_TAXONOMY.md"]
  ),
  buildCheck(
    "ORDER-03",
    "Authority matrix exists and explicitly denies free-form transitions",
    fileExists("extensions/order-lifecycle/03_AUTHORITY_MATRIX.md") &&
      fileContains("extensions/order-lifecycle/03_AUTHORITY_MATRIX.md", "No free-form order status editing") &&
      fileContains("extensions/order-lifecycle/03_AUTHORITY_MATRIX.md", "Admin is never a free actor"),
    "Authority matrix explicitly denies free-form status mutation.",
    "Authority matrix missing or free-form transition denial anchors absent.",
    ["extensions/order-lifecycle/03_AUTHORITY_MATRIX.md"]
  ),
  buildCheck(
    "ORDER-04",
    "Transition rules table exists and includes escrow gating",
    fileExists("extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md") &&
      fileContains("extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md", "pricing snapshot locked") &&
      fileContains("extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md", "PAYMENT_HELD") &&
      fileContains("extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md", "SETTLEMENT_PENDING") &&
      fileContains("extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md", "SETTLEMENT_RELEASED"),
    "Transition rules spec includes deterministic payment/escrow gating anchors.",
    "Transition rules spec missing deterministic escrow/payment gating anchors.",
    ["extensions/order-lifecycle/04_TRANSITION_RULES_EXECUTABLE_SPEC.md"]
  ),
  buildCheck(
    "ORDER-05",
    "Buyer order UI is projection-only",
    fileContains("frontend/app/buyer/order/[id]/page.tsx", "Status is read-only from enforcement") &&
      fileContains("frontend/app/buyer/orders/page.tsx", "Actions controlled by backend"),
    "Buyer order projection surfaces are explicitly read-only/from-enforcement.",
    "Buyer order projection surfaces missing read-only/from-enforcement anchors.",
    ["frontend/app/buyer/order/[id]/page.tsx", "frontend/app/buyer/orders/page.tsx"]
  ),
  buildCheck(
    "ORDER-06",
    "Admin audit UI exists and contains immutable append-only anchor",
    fileContains("frontend/app/admin/audit/page.tsx", "append-only and immutable"),
    "Admin audit UI includes immutable append-only anchor.",
    "Admin audit UI missing immutable append-only anchor.",
    ["frontend/app/admin/audit/page.tsx"]
  ),
  buildCheck(
    "ORDER-07",
    "Payment snapshot governance references exist",
    fileContains("docs/12.04_escrow-lifecycle-settlement-trigger-rules.md", "Pricing snapshot is locked and verified") &&
      fileContains("extensions/payments-escrow/15_API_CONTRACTS.md", "pricingSnapshotId") &&
      fileContains("extensions/payments-escrow/15_API_CONTRACTS.md", "Pricing Snapshot"),
    "Payment snapshot governance anchors are present in docs and API contracts.",
    "Payment snapshot governance anchors are missing in required references.",
    ["docs/12.04_escrow-lifecycle-settlement-trigger-rules.md", "extensions/payments-escrow/15_API_CONTRACTS.md"]
  ),
  buildCheck(
    "ORDER-08",
    "Freight gating references exist",
    fileContains("extensions/freight-logistics/SHIPMENT_AND_CONSIGNMENT_MODEL.md", "Shipment") &&
      fileContains("extensions/logistics-ddp/01_LIFECYCLE_STATES.md", "Logistics, Freight & DDP") &&
      fileContains("extensions/logistics-ddp/01_LIFECYCLE_STATES.md", "Lifecycle States"),
    "Freight/DDP governance references are present for lifecycle gating.",
    "Freight/DDP governance references are missing for lifecycle gating.",
    ["extensions/freight-logistics/SHIPMENT_AND_CONSIGNMENT_MODEL.md", "extensions/logistics-ddp/01_LIFECYCLE_STATES.md"]
  ),
  buildCheck(
    "ORDER-09",
    "Compliance gating references exist",
    fileContains("extensions/compliance-authority/contracts/compliance.states.md", "COMPLIANCE_APPROVED") &&
      fileContains("extensions/compliance-authority/contracts/compliance.states.md", "COMPLIANCE_REJECTED") &&
      fileContains("extensions/compliance-authority/AUTH_AND_AUTHORITY_BOUNDARIES.md", "Default deny"),
    "Compliance gating references are present in compliance states and authority boundaries.",
    "Compliance gating references are missing in required compliance artefacts.",
    [
      "extensions/compliance-authority/contracts/compliance.states.md",
      "extensions/compliance-authority/AUTH_AND_AUTHORITY_BOUNDARIES.md",
    ]
  ),
  buildCheck(
    "ORDER-10",
    "Returns/disputes are linked as cases, not silent primary state edits",
    fileContains("extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md", "linked to an order") &&
      fileContains("extensions/returns-refunds-disputes/CASE_TYPES_STATES_AND_OWNERSHIP.md", "All post-order issues are case-based"),
    "Returns/disputes are explicitly governed as linked cases.",
    "Returns/disputes linked-case governance anchors are missing.",
    [
      "extensions/order-lifecycle/01_ORDER_LIFECYCLE_STATES.md",
      "extensions/returns-refunds-disputes/CASE_TYPES_STATES_AND_OWNERSHIP.md",
    ]
  ),
  buildCheck(
    "ORDER-11",
    "Evidence immutability rules are referenced",
    fileContains("extensions/order-lifecycle/05_AUDIT_AND_OBSERVABILITY.md", "immutable") &&
      fileContains(
        "extensions/order-lifecycle/05_AUDIT_AND_OBSERVABILITY.md",
        "EVIDENCE_UPLOAD_AND_IMMUTABILITY_RULES.md"
      ) &&
      fileExists("extensions/documents-records/EVIDENCE_UPLOAD_AND_IMMUTABILITY_RULES.md"),
    "Order lifecycle observability references immutable evidence controls.",
    "Order lifecycle observability missing immutable evidence references.",
    [
      "extensions/order-lifecycle/05_AUDIT_AND_OBSERVABILITY.md",
      "extensions/documents-records/EVIDENCE_UPLOAD_AND_IMMUTABILITY_RULES.md",
    ]
  ),
  buildCheck(
    "ORDER-12",
    "Extension lock doctrine exists",
    fileContains("extensions/order-lifecycle/EXTENSION_LOCK.md", "Status: LOCKED ON PASS-1") &&
      fileContains("extensions/order-lifecycle/EXTENSION_LOCK.md", "requires formal change control"),
    "Extension lock doctrine exists with lock and change-control anchors.",
    "Extension lock doctrine is missing required lock/change-control anchors.",
    ["extensions/order-lifecycle/EXTENSION_LOCK.md"]
  ),
];

writeScorecard({
  auditId: "order-lifecycle",
  slug: "order-lifecycle",
  checks,
});
