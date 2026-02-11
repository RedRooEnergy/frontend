import { buildCheck, fileContains, fileExists, writeScorecard } from "../governance/auditRunner";

const checks = [
  buildCheck(
    "FREIGHT-01",
    "Freight scope and charter are explicitly defined",
    fileExists("extensions/freight-logistics/EXTENSION_DEFINITION.md") &&
      fileExists("extensions/freight-logistics/README.md"),
    "Freight extension charter and README are present.",
    "Freight charter/README artefacts are missing.",
    ["extensions/freight-logistics/EXTENSION_DEFINITION.md", "extensions/freight-logistics/README.md"]
  ),
  buildCheck(
    "FREIGHT-02",
    "Freight role and authority boundaries are documented",
    fileExists("extensions/freight-logistics/GOVERNANCE_AND_ROLES.md") &&
      fileExists("extensions/freight-logistics/AUTH_AND_SCOPE_BOUNDARIES.md"),
    "Freight governance and role boundaries are documented.",
    "Freight governance/role boundary docs are missing.",
    ["extensions/freight-logistics/GOVERNANCE_AND_ROLES.md", "extensions/freight-logistics/AUTH_AND_SCOPE_BOUNDARIES.md"]
  ),
  buildCheck(
    "FREIGHT-03",
    "DDP/customs governance package exists",
    fileExists("extensions/logistics-ddp/01_LIFECYCLE_STATES.md") &&
      fileExists("extensions/logistics-ddp/05_AUTHORIZATION_RULES.md") &&
      fileExists("extensions/logistics-ddp/11_API_CONTRACTS.md"),
    "DDP lifecycle, authorization, and API contract docs are present.",
    "DDP/customs governance artefacts are incomplete.",
    [
      "extensions/logistics-ddp/01_LIFECYCLE_STATES.md",
      "extensions/logistics-ddp/05_AUTHORIZATION_RULES.md",
      "extensions/logistics-ddp/11_API_CONTRACTS.md",
    ]
  ),
  buildCheck(
    "FREIGHT-04",
    "Shipment state and event model are deterministic",
    fileExists("extensions/freight-logistics/contracts/logistics.states.md") &&
      fileExists("extensions/freight-logistics/events/logistics.events.ts") &&
      fileContains("extensions/freight-logistics/SHIPMENT_AND_CONSIGNMENT_MODEL.md", "Shipment"),
    "Freight shipment states and events are defined with a shipment model.",
    "Freight shipment state/event model is incomplete.",
    [
      "extensions/freight-logistics/contracts/logistics.states.md",
      "extensions/freight-logistics/events/logistics.events.ts",
      "extensions/freight-logistics/SHIPMENT_AND_CONSIGNMENT_MODEL.md",
    ]
  ),
  buildCheck(
    "FREIGHT-05",
    "Freight routing and service boundaries exist",
    fileExists("extensions/freight-logistics/routes/logistics.routes.ts") &&
      fileExists("extensions/freight-logistics/routes/index.ts") &&
      fileExists("extensions/freight-logistics/services/placeholder.ts"),
    "Freight routing and service boundary stubs are in place.",
    "Freight routing/service boundary files are missing.",
    [
      "extensions/freight-logistics/routes/logistics.routes.ts",
      "extensions/freight-logistics/routes/index.ts",
      "extensions/freight-logistics/services/placeholder.ts",
    ]
  ),
  buildCheck(
    "FREIGHT-06",
    "Freight evidence immutability controls are documented",
    fileExists("extensions/documents-records/EVIDENCE_UPLOAD_AND_IMMUTABILITY_RULES.md") &&
      fileExists("extensions/documents-records/RETENTION_LEGAL_HOLD_AND_EVIDENCE_PACKS.md"),
    "Evidence immutability and retention controls are explicitly documented.",
    "Evidence immutability/retention controls are missing.",
    [
      "extensions/documents-records/EVIDENCE_UPLOAD_AND_IMMUTABILITY_RULES.md",
      "extensions/documents-records/RETENTION_LEGAL_HOLD_AND_EVIDENCE_PACKS.md",
    ]
  ),
  buildCheck(
    "FREIGHT-07",
    "Freight exception/escalation governance is defined",
    fileExists("extensions/returns-refunds-disputes/CASE_TYPES_STATES_AND_OWNERSHIP.md") &&
      fileExists("extensions/returns-refunds-disputes/AUDIT_AND_OBSERVABILITY.md"),
    "Exception case ownership and escalation observability controls are present.",
    "Exception/escalation governance artefacts are incomplete.",
    [
      "extensions/returns-refunds-disputes/CASE_TYPES_STATES_AND_OWNERSHIP.md",
      "extensions/returns-refunds-disputes/AUDIT_AND_OBSERVABILITY.md",
    ]
  ),
  buildCheck(
    "FREIGHT-08",
    "Freight closure evidence links to finance settlement controls",
    fileExists("extensions/finance-settlement/adapters/settlementProjection.adapter.ts") &&
      fileExists("extensions/finance-settlement/FINANCIAL_CASE_ESCROW_AND_SETTLEMENT_MODEL.md") &&
      fileExists("extensions/finance-settlement/AUDIT_AND_OBSERVABILITY.md"),
    "Finance settlement projection and audit controls support freight closure replay.",
    "Finance settlement replay controls for freight closure are incomplete.",
    [
      "extensions/finance-settlement/adapters/settlementProjection.adapter.ts",
      "extensions/finance-settlement/FINANCIAL_CASE_ESCROW_AND_SETTLEMENT_MODEL.md",
      "extensions/finance-settlement/AUDIT_AND_OBSERVABILITY.md",
    ]
  ),
];

writeScorecard({
  auditId: "freight-customs",
  slug: "freight-customs",
  checks,
});
