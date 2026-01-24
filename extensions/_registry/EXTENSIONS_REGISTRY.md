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

Status: EMPTY (No extensions registered)

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

Status: DRAFT  
Authority: Pending  
Scope:
- Pricing snapshot issuance
- Escrow hold and release
- Refund and dispute linkage
- Audit-bound financial events
