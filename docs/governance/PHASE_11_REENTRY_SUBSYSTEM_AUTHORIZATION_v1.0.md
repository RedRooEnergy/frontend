# Phase 11 Re-Entry Subsystem Authorization v1.0
Version: v1.0
Date: 2026-02-17
Status: AUTHORIZED (TRANCHE 1)
Branch: governance-clean-rebuild
Baseline Freeze Tag: v1.0-runtime-consolidated
Freeze Record SHA: e4006cf97e0683f4836c5dd8c8e28dac44eb5af0

## 1) Re-Entry Objective
Re-enter Phase 11 under governance control by implementing the first missing subsystem required for orchestration progression.

## 2) Authorized Subsystem (Tranche 1)
Payments checkout/status only.

Authorized contracts:
- `POST /api/payments/checkout`
- `GET /api/payments/status/:id`

No other new subsystem contracts are authorized in this tranche.

## 3) Scope Boundaries
In scope:
- authoritative payments checkout/status implementation in consolidated runtime
- deterministic local/test-mode execution path
- persistence for payment checkout/status state
- contract validation and CI coverage updates

Out of scope:
- shipping subsystem
- CRM subsystem
- email log subsystem
- external payment provider integration (Stripe/live rails)
- authority changes to existing refund/queue/settlement behavior

## 4) Governance Constraints
- No hidden authority expansion.
- No changes to Phase 10.5 frozen runtime boundaries except the explicitly authorized payments contracts.
- All changes must remain auditable and CI-validated.

## 5) Acceptance Criteria (Tranche 1)
1. `POST /api/payments/checkout` returns deterministic JSON with payment identifier and status.
2. `GET /api/payments/status/:id` returns deterministic status for created payment.
3. Runtime boot validator remains PASS.
4. Orchestration harness can progress beyond current payments-contract missing failure point (even if later subsystems still fail).
5. Documentation updates:
   - runtime surface inventory reflects payments contracts as present
   - Phase 11 smoke notes updated with new first-failure location

## 6) CI Gates
Required before tranche close:
- Runtime Unified Boot Integration CI: PASS
- No failing governance checks introduced
- Artifact evidence retained for validation runs

## 7) Execution Order After Tranche 1
1. Shipping deterministic quote/select
2. CRM linkage read
3. Email log read surface

Phase 11 progression remains gated until these surfaces are implemented and validated.

## 8) Close Condition
Tranche 1 is complete when all acceptance criteria pass and close evidence is committed under governance docs.
