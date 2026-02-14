# Extensions Registry (Authoritative)

Version: v1.0 LOCKED  
Status: Locked  
Governance State: PAUSED

Authority:
This document is the single authoritative registry of all Extensions (EXT-XX)
for the RedRooEnergy platform.

Any extension not listed here is non-existent for governance purposes.

Precedence:
This registry supersedes any extension registry or listing located outside
the /docs directory. Root-level copies are non-authoritative reference artefacts
only and must not be used for governance validation.

## EXT-01 — Supplier Onboarding

Status: Locked (Closed baseline)  

Purpose:
Governance-first supplier onboarding extension; activation not authorised; CCR pending.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Closed baseline; governance locked; implementation complete; activation not authorised; CCR pending.

## EXT-02 — Catalogue Management

Status: Locked (Routes disabled)  

Purpose:
Product catalogue lifecycle governance (draft → approved → published → immutable) with Core dependencies on audit, authorization, and immutability.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Locked with routes disabled; change control required before implementation changes.

## EXT-03 — Logistics, Freight & DDP (Superseded)

Status: Closed (Superseded by EXT-06)  

Purpose:
Legacy DDP logistics baseline retained for historical reference; superseded by EXT-06.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Superseded by EXT-06; no further governance or implementation work under EXT-03.

## EXT-04 — Payments, Escrow & Pricing Snapshot

Status: Active (Implementation authorized)  

Purpose:
Pricing snapshot issuance, escrow hold and release, refund and dispute linkage, and audit-bound financial events.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Governance complete; implementation authorized; change control required; baseline frozen; lock file present.

## EXT-05 — Catalogue & Product Management

Status: Active (Implementation authorized)  

Purpose:
Product catalogue structure, category and attribute governance, compliance-bound publication, and versioned product records.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Governance complete; implementation authorized; change control required.

## EXT-06 — Logistics, Freight & DDP

Status: Active (Authoritative Logistics Extension)  

Purpose:
Authoritative DDP logistics extension covering customs, duties, GST, freight status, and carrier integration with compliance, pricing snapshot integrity, and audit coverage.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Supersedes EXT-03; governance active; implementation not authorized; change control required.

## EXT-07 — Buyer Experience & Order Lifecycle

Status: Active (Implementation authorized)  

Purpose:
Buyer experience and order lifecycle governance (folder: extensions/buyer).

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Governance complete; implementation authorized; change control required.

## EXT-INTERNAL-MSG-01 — Governed Internal Messaging

Status: Design Lock (No runtime impact)  
Bounded by: EXT-COMMS-01 (docs/communications/COMMUNICATIONS_CONTROL_PLANE.md)

Purpose:
Governance design for an internal platform collaboration channel that is evidence-bearing and non-state-authoritative, bounded by the Communications Control Plane.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Design locked only; runtime implementation not authorized; change control required before any build phase.

## EXT-AUDIT-COMMS-01 — Unified Cross-Channel Evidence View

Status: Design Lock (No runtime impact)  
Bounded by: EXT-COMMS-01 (docs/communications/COMMUNICATIONS_CONTROL_PLANE.md)

Purpose:
Governance design for a regulator-first, read-only, cross-channel evidence convergence surface spanning Email and WeChat, with Internal Messaging reserved for future inclusion.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Design locked only; runtime implementation not authorized; change control required before any build phase.
Governance charter: docs/communications/EXT-AUDIT-COMMS-01_GOVERNANCE.md
Gate 1 spec: docs/communications/EXT-AUDIT-COMMS-01_GATE1_READONLY_DASHBOARD_SPEC.md
Gate 2 spec: docs/communications/EXT-AUDIT-COMMS-01_GATE2_IMPLEMENTATION_CONTRACT_BOUNDARIES.md
Gate 3 spec: docs/communications/EXT-AUDIT-COMMS-01_GATE3_READONLY_IMPLEMENTATION_PLANNING_CONTRACT.md
Gate 4 spec: docs/communications/EXT-AUDIT-COMMS-01_GATE4_READONLY_IMPLEMENTATION_SPEC.md

## EXT-26 — Marketing Orchestration & Campaign Governance

Status: Complete (Governance complete; implementation not authorized)  

Purpose:
Governance for marketing campaign orchestration, approvals, and execution boundaries.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Governance complete; implementation not authorized; change control required to reopen.

Lock Declaration:
This Extension Registry is LOCKED at v1.0.
It defines the authoritative list, identity, and lifecycle intent of Extensions.
No runtime activation, enforcement, or implementation change is implied.
Any modification requires formal change control authorisation.

## EXT-27 — Analytics, Reporting & Metrics

Status: Complete (Governance complete; implementation not authorized)  

Purpose:
Governance for analytics pipelines, reporting outputs, and metric definitions under Core constraints.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Governance complete; implementation not authorized; change control required to reopen.

## EXT-28 — Security, Monitoring & Incident Response

Status: Complete (Governance complete; implementation not authorized)  

Purpose:
Governance for security monitoring, alerting, and incident response coordination under Core supremacy.

Core Interaction:
This Extension does not modify the Immutable Core and operates strictly within Core constraints.

Lifecycle Notes:
Governance complete; implementation not authorized; change control required to reopen.
