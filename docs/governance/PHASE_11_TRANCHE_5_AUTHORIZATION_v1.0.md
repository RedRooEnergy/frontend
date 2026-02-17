# Phase 11 Tranche 5 Authorization v1.0
Version: v1.0
Subsystem: CRM Read Contract Alignment (Read Surface Only)
Status: AUTHORIZED (Tranche 5)
Date: 2026-02-17
Branch: governance-clean-rebuild
Baseline Freeze Tag: v1.0-runtime-consolidated
Tranche 4 Close SHA: 2b3eb79158cf8f46018d0a19569e96f1ceb645a4

## 1) Objective
Resolve the current Phase 11 CRM contract gap by implementing read-only CRM surfaces in the unified runtime.

## 2) Authorized Contracts
- `GET /api/crm/cases`
- `GET /api/crm/cases/:id`

Query support for `GET /api/crm/cases`:
- `entityType` (optional)
- `entityId` (optional)

## 3) Scope Boundaries
In scope:
- deterministic read-only retrieval of CRM cases
- deterministic JSON response contracts
- `404` semantics for unknown case IDs
- runtime validator updates for CRM read checks
- governance inventory and smoke updates

Out of scope:
- case creation endpoints
- case mutation endpoints
- case automation/workflow behavior
- pricing/orderId emission changes
- authority model changes
- state transition logic

## 4) Determinism Rules
- pure read paths only
- no background jobs
- no status transitions
- no side effects

## 5) Acceptance Criteria
1. `GET /api/crm/cases` returns deterministic list response.
2. `GET /api/crm/cases/:id` returns deterministic case response for existing IDs.
3. Unknown or invalid case IDs return `404`.
4. Runtime boot validator includes CRM read checks and remains PASS.
5. Two consecutive PASS runs on Runtime Unified Boot Integration CI.
6. `RUNTIME_SURFACE_INVENTORY_v1.0.md` updated to mark CRM read surfaces PRESENT.
7. `RUNTIME_PHASE11_HARNESS_SMOKE_REPORT_v1.5.md` added.

## 6) Expected Progression
After Tranche 5 close, Phase 11 progression target is 75%.
Remaining major gap after this tranche: Email queue/log read surface.
