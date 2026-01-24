# Core Platform Baseline Lock

Component: RedRooEnergy Core Platform  
Path: core/platform  
Baseline Version: v0.1  
Status: LOCKED  
Authority: ETG-001  
Date: 2026-01-19

## Locked Capabilities

The following Core capabilities are complete and frozen:

- Deterministic startup sequence
- Immutable environment snapshot
- Mandatory startup audit emission
- Audit event scope enforcement
- Request ID propagation
- Actor identity binding (SYSTEM)
- Default-deny authorization boundary
- Health-only allowlist
- Sanitized error handling with request correlation
- Document hashing with audit-bound immutability
- Immutability seal enforcement
- Read-only public contracts

## Extensions

- EXT-01 Supplier Onboarding: CLOSED (read-only, Core authoritative)
- EXT-02 (Catalogue Management) governance locked; routes disabled pending CCR.
- EXT-03 Logistics DDP — LOCKED
- EXT-04 (Payments, Escrow & Pricing Snapshot): AUTHORIZED — IMPLEMENTATION LOCKED

## Enforcement Rules

- No Core file may be modified without an approved Change Control Record (CCR)
- Extensions may not bypass Core authorization, audit, or immutability
- Core behavior is authoritative over all extensions

## Change Control

Any modification requires:
- CCR entry in `docs/21_change-control/`
- Risk assessment
- Explicit approval authority
