# EXT-ORDER-01 — Canonical Order Lifecycle Authority Lock

Version: v1.0
Status: PASS-1 GOVERNANCE DRAFT
Implementation: DOCUMENTED (PROJECTION-ONLY)

## Purpose

EXT-ORDER-01 defines the canonical order lifecycle authority plane across Buyer,
Supplier, Installer/Service Partner, Freight, Compliance, and Finance oversight.

Order lifecycle authority is cross-domain and must be deterministic.
No domain may mutate order state outside approved transition authority.

## Core Boundary

- Order lifecycle is the cross-domain authority plane.
- Frontend is projection-only and must not perform runtime lifecycle mutation.
- Transition authority remains governed by documented role/transition rules.
- Audit evidence is immutable and append-only by policy.

## In Scope

- Canonical order states and transition lanes
- Canonical order event taxonomy
- Role-to-transition authority matrix
- Deterministic transition preconditions and side effects
- PASS-1 verification checks (ORDER-01 through ORDER-12)

## Out of Scope

- New backend mutation APIs
- Free-form order status editing controls
- Ad hoc/admin override transitions outside defined authority
- Changes to locked Buyer, Freight, or Installer onboarding semantics

## Baseline References

- Governance baseline tag: `governance-baseline-v1.0-investor`
- Investor-grade posture: enforced required checks on `main` with strict protection
- Related locked subsystem tags:
  - `buyer-onboarding-audit-v1.0.0`
  - `freight-customs-audit-v1.0.0`
  - `installer-onboarding-v1.0.0`

## Change Control

This extension remains governance-first.
Any semantic change to lifecycle states, event codes, or authority matrix requires
formal change control and PASS-1 checklist re-validation.
