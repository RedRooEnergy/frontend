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

## EXT-WECHAT-07 — Public Key Distribution & Auditor Verification

Status: CLOSED — GOVERNANCE LOCKED
Operational State: Read-only regulator verification surface (GET-only)
Change Control: REQUIRED (reopen required for any modification)
Scope:
- Regulator-guarded public key disclosure for detached signature verification
- RSA-only/SPKI/fingerprint verification metadata exposure
- Explicit disabled-path 404 behavior
- No mutation routes and no authority expansion

References:
- Close Pack: `docs/communications/EXT-WECHAT-07_CLOSE_PACK.md`
- Regulator Addendum: `docs/communications/REGULATOR_ADDENDUM_EXT-WECHAT-07_v1.0.md`
- Aggregator Rule: `GOV-WECHAT-07` (CRITICAL, binary PASS/FAIL)
- Aggregator + CI Baseline: `9e2ab9a3e6f0cd808f535f6d5ec29fc6ebc3a982`
- Board Ratification: `docs/governance/BOARD_RESOLUTION_EXT-WECHAT-07_RATIFICATION_v1.0.md`

## EXT-CHAIN-INTEGRITY-01 — Cross-Subsystem Cryptographic Assurance Layer

Status: IMPLEMENTED (INTEGRITY ACTIVATED; RUNTIME ENFORCEMENT NOT AUTHORIZED)
Operational State: Integrity assurance layer active via static governance controls
Change Control: REQUIRED (any enforcement expansion requires reopening)
Scope:
- Deterministic linkage across payment snapshot, export manifest, and freight settlement hashes
- Write-once linkage immutability safeguards
- Deterministic canonical settlement serialization and chain recomputation
- Read-only mismatch detection and failure taxonomy mapping
- PGA static rule activation (`GOV-CHAIN-01`) with CI fail-gate

References:
- Assertion: `docs/communications/EXT-CHAIN-INTEGRITY-01_ASSERTION.md`
- Schema Design Pack: `docs/communications/EXT-CHAIN-INTEGRITY-01_SCHEMA_DESIGN_PACK.md`
- Invariant Scaffolding: `docs/communications/EXT-CHAIN-INTEGRITY-01_INVARIANT_TEST_SCAFFOLDING_SPEC.md`
- Design-Lock Close Pack: `docs/communications/EXT-CHAIN-INTEGRITY-01_CLOSE_PACK.md`
- Implementation Authorization Packet: `docs/communications/EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_PACKET.md`
- Implementation Close Pack: `docs/communications/EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_CLOSE_PACK.md`
- Board Authorization: `docs/governance/BOARD_RESOLUTION_EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_v1.0.md`
- Board Ratification: `docs/governance/BOARD_RESOLUTION_EXT-CHAIN-INTEGRITY-01_RATIFICATION_v1.0.md`
- Aggregator Rule: `GOV-CHAIN-01` (CRITICAL, binary PASS/FAIL)
- PGA + CI Activation Baseline: `b9823ce`

## EXT-GOV-AUTH-01 — Platform Design Authority Framework

Status: LOCKED (DESIGN AUTHORITY ONLY; NON-OPERATIONAL)
Operational State: Governance-only authority model for architectural evolution
Change Control: REQUIRED for any modification
Scope:
- Grand-Master authority hierarchy definition
- Platform Architect Council and Governance Lead boundary mapping
- Design-governance technical enforcement mapping (branch protection/CODEOWNERS/CI)
- Authority breach handling and immutable governance evidence requirements

Boundaries:
- No runtime RBAC identifier change
- No backend permission logic expansion
- No operational transaction authority grant

References:
- Authority hierarchy: `docs/00_master_project_definition/RRE-00-PLATFORM-AUTHORITY-HIERARCHY-v1.0.md`
- Extension spec: `docs/extensions/EXT-GOV-AUTH-01/EXT-GOV-AUTH-01_SPEC.md`
- Close pack: `docs/governance/PLATFORM_DESIGN_AUTHORITY_LOCK_CLOSE_PACK_v1.0.md`
- Board resolution: `docs/governance/BOARD_RESOLUTION_PLATFORM_DESIGN_AUTHORITY_LOCK_v1.0.md`
- Manifest: `docs/governance/PLATFORM_DESIGN_AUTHORITY_LOCK_MANIFEST_v1.0.json`

## EXT-GOV-AUTH-02 — Multi-Signature Governance Workflow

Status: DESIGN LOCK CLOSED (NON-OPERATIONAL)
Operational State: Governance workflow contract for quorum-based design authority approvals
Change Control: REQUIRED for any modification
Scope:
- Multi-signature approval ledger model for governance proposals
- Quorum policy definitions by proposal class
- Workflow transition state model and breach handling
- Mandatory audit coupling for approval transitions

Boundaries:
- No runtime RBAC identifier changes
- No backend permission logic expansion
- No operational transaction authority grants

References:
- Extension spec: `docs/extensions/EXT-GOV-AUTH-02/EXT-GOV-AUTH-02_SPEC.md`
- Workflow contract: `docs/governance/GOV-AUTH-02_MULTISIGNATURE_WORKFLOW_CONTRACT_v1.0.md`
- Design-lock close pack: `docs/governance/EXT-GOV-AUTH-02_DESIGN_LOCK_CLOSE_PACK_v1.0.md`
- Board preview packet: `docs/governance/BOARD_PREVIEW_PACKET_EXT-GOV-AUTH-02_v1.0.md`

Activation Deferral:
- Runtime activation is not authorized in this extension and is deferred to `EXT-GOV-AUTH-02-ACTIVATION`.

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
- Gate 2 spec: docs/communications/EXT-AUDIT-COMMS-01_GATE2_IMPLEMENTATION_CONTRACT_BOUNDARIES.md
- Gate 3 spec: docs/communications/EXT-AUDIT-COMMS-01_GATE3_READONLY_IMPLEMENTATION_PLANNING_CONTRACT.md
- Gate 4 spec: docs/communications/EXT-AUDIT-COMMS-01_GATE4_READONLY_IMPLEMENTATION_SPEC.md
- Gate 5 plan: docs/communications/EXT-AUDIT-COMMS-01_GATE5_BOUNDED_BUILD_PLAN_READONLY.md

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

## MASTER DOMAIN STATUS (APPEND-ONLY)

Domain: WeChat  
WECHAT DOMAIN STATUS: COMPLETE  
Integrity Layer Status: ACTIVE  
Enforcement Authority: NOT AUTHORIZED

Status classification:
- IMPLEMENTED
- GOVERNANCE-ACTIVE
- CI-ENFORCED
- BOARD-RATIFIED
- REGULATOR-DISCLOSABLE

Activation Baseline: `b9823ce`  
Closure Baseline: `c6bd401`  
Reference: `docs/governance/WECHAT_SUBSYSTEM_COMPLETION_DECLARATION_v1.0.md`
