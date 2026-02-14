# Extensions Registry

This registry lists all approved platform extensions.

## EXT-01 — Supplier Onboarding

Status: CLOSED — LOCKED BASELINE  
Data Authority: CORE ONLY  
Implementation: COMPLETE  
Charter: extensions/supplier-onboarding/governance/01_SUPPLIER_ONBOARDING_CHARTER.md  
Parent: Core Platform (LOCKED)  
Activation: Not authorised  
CCR: Pending

Notes:
- Governance-first extension
- No implementation permitted before approval

Rules:
- Extensions MUST integrate through Core contracts only
- Extensions CANNOT modify Core behavior
- Each extension requires its own governance folder and CCR

## EXT-02 — Catalogue Management

Status: COMPLETE — LOCKED (ROUTES DISABLED)  
Lock: extensions/catalogue-management/EXTENSION_LOCK.md  
Scope: Product catalogue lifecycle (draft → approved → published → immutable)  
Core Dependencies: Audit, Authorization, Immutability  
Change Control: Required before implementation

## EXT-03 — Logistics, Freight & DDP

Status: LOCKED  
Lock File: extensions/logistics-ddp/EXTENSION_LOCK.md  
Scope: Delivered Duty Paid (DDP), HS codes, duties, GST, freight status, carrier integration  
Authority: Core Governance  
CCR: Pending

## EXT-04 — Payments, Escrow & Pricing Snapshot

Status: IMPLEMENTATION AUTHORIZED
Governance: COMPLETE
Change Control: REQUIRED for all modifications
Lock File: extensions/payments-escrow/EXTENSION_LOCK.md
Baseline: Frozen
Scope:
- Pricing snapshot issuance
- Escrow hold and release
- Refund and dispute linkage
- Audit-bound financial events

## EXT-05 — Catalogue & Product Management

Status: IMPLEMENTATION AUTHORIZED
Governance: COMPLETE
Change Control: REQUIRED for all modifications
Scope:
- Product catalogue structure
- Category & attribute governance
- Compliance-bound product publication
- Versioned product records

Dependencies:
- Core Platform (locked)
- EXT-01 Supplier Onboarding
- EXT-03 Compliance & Certification

## EXT-06 — Logistics, Freight & DDP

Purpose:
Governed handling of Delivered-Duty-Paid (DDP) logistics, customs, duties, GST, carrier integration, and shipment state.

Status: GOVERNANCE IN PROGRESS
Governance: IN PROGRESS
Implementation: NOT AUTHORIZED
Change Control: REQUIRED

Dependencies:
- Core (audit, authorization, request context)
- EXT-05 (Product Catalogue)
- EXT-04 (Payments & Escrow)

Notes:
This extension enforces DDP-only shipment logic.
No shipment may progress without compliance, pricing snapshot integrity, and audit coverage.

## EXT-07 — Buyer Experience & Order Lifecycle
Folder: extensions/buyer
Status: IMPLEMENTATION AUTHORIZED
Governance: COMPLETE
Change Control: REQUIRED for all modifications

## EXT-WECHAT-01 — WeChat Governed Communications Channel

Status: LOCKED BASELINE
Operational State: Feature-gated (disabled by default)
Change Control: REQUIRED (boundary expansion prohibited)
Audit: CI enforced (wechat-system-ci.yml)
Scope:
- Event-bound WeChat notifications/prompts
- Deterministic template rendering + payload hashing
- Binding verification and lifecycle controls
- Immutable dispatch/inbound evidence records
- Regulator read-only governance overview (hash-first)

Dependencies:
- Core identity/session controls
- Core audit and immutable evidence posture
- Existing order/compliance/freight/payment correlation surfaces

Implementation hash reference:
- Tag: ext-wechat-01-baseline-v1.0
- CI: test:wechat passing
- Immutable boundaries verified

## EXT-INTERNAL-MSG-01 — Governed Internal Messaging

Status: DESIGN LOCK (no runtime impact)
Runtime Impact: NONE
Change Control: REQUIRED to authorize build phase
Bounded by: EXT-COMMS-01 (docs/communications/COMMUNICATIONS_CONTROL_PLANE.md)
Scope:
- Governed in-platform collaboration channel
- Evidence-bearing message controls under communications governance
- Non-state-authoritative messaging boundaries
- Regulator read-only export posture
- Prohibited pattern controls for persistence, hashing, and identity

Reference:
- docs/communications/EXT-INTERNAL-MSG-01_GOVERNANCE.md

## EXT-AUDIT-COMMS-01 — Unified Cross-Channel Evidence View

Status: DESIGN LOCK (no runtime impact)
Runtime Impact: NONE
Change Control: REQUIRED to authorize build phase
Bounded by: EXT-COMMS-01 (docs/communications/COMMUNICATIONS_CONTROL_PLANE.md)
Scope:
- Read-only cross-channel evidence aggregation
- Correlation-first regulator evidence surface
- Deterministic composite hash across included channels
- Channel parity rules for payload/status progression visibility
- Prohibited mutation patterns for audit aggregation

Reference:
- Governance charter: docs/communications/EXT-AUDIT-COMMS-01_GOVERNANCE.md
- Gate 1 spec: docs/communications/EXT-AUDIT-COMMS-01_GATE1_READONLY_DASHBOARD_SPEC.md

## EXT-26 — [EXTENSION NAME – TO BE CONFIRMED]

Status: GOVERNANCE COMPLETE  
Implementation: NOT AUTHORIZED  
Change Control: REQUIRED (extension must be reopened)  

Governance Artefacts (on disk):
- extensions/ext-26/EXTENSION_CHARTER_AND_SCOPE.md
- extensions/ext-26/FUNCTIONAL_SCOPE_AND_BOUNDARIES.md
- extensions/ext-26/AUTHORITY_DELEGATION_AND_TRUST_MODEL.md
- extensions/ext-26/DATA_OWNERSHIP_AND_EVIDENCE_BOUNDARIES.md
- extensions/ext-26/FAILURE_HANDLING_AND_ESCALATION_DOCTRINE.md
- extensions/ext-26/PERMISSION_AND_AUTHORITY_ENFORCEMENT_BOUNDARIES.md
- extensions/ext-26/SCOPE_ISOLATION_AND_EXTENSION_CONTAINMENT_DOCTRINE.md
- extensions/ext-26/AUDIT_SURFACE_AND_TRACE_BOUNDARIES.md
- extensions/ext-26/EXTENSION_LIFECYCLE_ENABLEMENT_AND_DECOMMISSIONING_DOCTRINE.md
- extensions/ext-26/REGULATORY_LEGAL_AND_EXTERNAL_AUTHORITY_ALIGNMENT.md
- extensions/ext-26/SECURITY_PRIVACY_AND_DATA_PROTECTION_BOUNDARIES.md
- extensions/ext-26/PERFORMANCE_SCALABILITY_AND_RESOURCE_ISOLATION_DOCTRINE.md
- extensions/ext-26/DOCUMENTATION_TRANSPARENCY_AND_OPERATOR_OBLIGATIONS.md
- extensions/ext-26/EXTENSION_CLOSURE_SIGNOFF_AND_REGISTRY_UPDATE.md

## EXT-27 — [EXTENSION NAME – TO BE CONFIRMED]

Status: GOVERNANCE COMPLETE  
Implementation: NOT AUTHORIZED  
Change Control: REQUIRED  

Governance Artefacts (on disk):
- extensions/ext-27/EXTENSION_CHARTER_AND_PURPOSE.md
- extensions/ext-27/SCOPE_DEFINITION_AND_EXPLICIT_BOUNDARIES.md
- extensions/ext-27/AUTHORITY_DELEGATION_AND_TRUST_MODEL.md
- extensions/ext-27/DATA_OWNERSHIP_AND_EVIDENCE_BOUNDARIES.md
- extensions/ext-27/FAILURE_HANDLING_AND_ESCALATION_DOCTRINE.md
- extensions/ext-27/PERMISSION_AND_AUTHORITY_ENFORCEMENT_BOUNDARIES.md
- extensions/ext-27/SCOPE_ISOLATION_AND_EXTENSION_CONTAINMENT_DOCTRINE.md
- extensions/ext-27/AUDIT_SURFACE_AND_TRACE_BOUNDARIES.md
- extensions/ext-27/EXTENSION_LIFECYCLE_ENABLEMENT_AND_DECOMMISSIONING_DOCTRINE.md
- extensions/ext-27/REGULATORY_LEGAL_AND_EXTERNAL_AUTHORITY_ALIGNMENT.md
- extensions/ext-27/SECURITY_PRIVACY_AND_DATA_PROTECTION_BOUNDARIES.md
- extensions/ext-27/PERFORMANCE_SCALABILITY_AND_RESOURCE_ISOLATION_DOCTRINE.md
- extensions/ext-27/DOCUMENTATION_TRANSPARENCY_AND_OPERATOR_OBLIGATIONS.md
- extensions/ext-27/EXTENSION_CLOSURE_SIGNOFF_AND_REGISTRY_UPDATE.md

## EXT-28 — [EXTENSION NAME – TO BE CONFIRMED]

Status: GOVERNANCE COMPLETE  
Implementation: NOT AUTHORIZED  
Change Control: REQUIRED (extension must be reopened)  

Governance Artefacts (on disk):
- extensions/ext-28/EXTENSION_CHARTER_AND_PURPOSE.md
- extensions/ext-28/SCOPE_DEFINITION_AND_EXPLICIT_BOUNDARIES.md
- extensions/ext-28/AUTHORITY_DELEGATION_AND_TRUST_MODEL.md
- extensions/ext-28/DATA_OWNERSHIP_AND_EVIDENCE_BOUNDARIES.md
- extensions/ext-28/FAILURE_HANDLING_AND_ESCALATION_DOCTRINE.md
- extensions/ext-28/PERMISSION_AND_AUTHORITY_ENFORCEMENT_BOUNDARIES.md
- extensions/ext-28/SCOPE_ISOLATION_AND_EXTENSION_CONTAINMENT_DOCTRINE.md
- extensions/ext-28/AUDIT_SURFACE_AND_TRACE_BOUNDARIES.md
- extensions/ext-28/EXTENSION_LIFECYCLE_ENABLEMENT_AND_DECOMMISSIONING_DOCTRINE.md
- extensions/ext-28/REGULATORY_LEGAL_AND_EXTERNAL_AUTHORITY_ALIGNMENT.md
- extensions/ext-28/SECURITY_PRIVACY_AND_DATA_PROTECTION_BOUNDARIES.md
- extensions/ext-28/PERFORMANCE_SCALABILITY_AND_RESOURCE_ISOLATION_DOCTRINE.md
- extensions/ext-28/DOCUMENTATION_TRANSPARENCY_AND_OPERATOR_OBLIGATIONS.md
- extensions/ext-28/EXTENSION_CLOSURE_SIGNOFF_AND_REGISTRY_UPDATE.md
