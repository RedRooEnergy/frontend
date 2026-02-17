# Phase 11 Tranche 3 Authorization v1.0
Version: v1.0
Subsystem: Pricing (Deterministic Checkout / Snapshot Read)
Status: AUTHORIZED (Tranche 3)
Date: 2026-02-17
Branch: governance-clean-rebuild
Baseline Freeze Tag: v1.0-runtime-consolidated
Tranche 2 Close SHA: bbe4f7cb35c4daa990eb2ec7509d2e62c57f4d06

## 1) Objective
Implement a deterministic local pricing checkout/snapshot subsystem to unblock the first failing Phase 11 harness contract without introducing external provider dependencies or authority expansion.

## 2) Authorized Contracts
- `POST /api/checkout/session`
- `GET /api/pricing/snapshots/:id`

No additional endpoints are authorized in this tranche.

## 3) Scope Boundaries
In scope:
- deterministic pricing checkout session creation
- immutable pricing snapshot persistence and readback
- deterministic snapshot hash generation for identical normalized input
- runtime validator and orchestration-smoke progression updates
- governance documentation updates for surface inventory and tranche close

Out of scope:
- payments checkout/status changes
- shipping quote/select/read changes
- CRM contracts
- email queue/log contracts
- settlement/refund/admin-queue authority model changes
- external pricing engines, FX services, tax engines, or freight providers

## 4) Determinism Requirements
- no external network calls
- identical normalized input must produce identical hash and snapshot payload
- snapshot records are immutable after creation
- no background jobs required for pricing flow

## 5) Governance Constraints
- no hidden authority expansion
- no changes to existing tranche-1/tranche-2 contracts or behavior
- no coupling changes to settlement, queue, or refund controls
- all changes must remain auditable and CI-validated

## 6) Acceptance Criteria
1. `POST /api/checkout/session` returns deterministic response including `snapshotId`.
2. `GET /api/pricing/snapshots/:id` returns persisted snapshot contract with stable hash fields.
3. Runtime validator remains PASS with added pricing checks.
4. Phase 11 orchestration harness progresses beyond `Pricing checkout` missing-contract failure.
5. Two consecutive PASS runs on Runtime Unified Boot Integration CI.
6. Governance docs updated:
   - `RUNTIME_SURFACE_INVENTORY_v1.0.md` shows pricing contracts PRESENT
   - new tranche close report committed with CI evidence

## 7) Expected Progression
After Tranche 3 close, Phase 11 progression target is 60% with remaining gaps in CRM and Email surfaces.
