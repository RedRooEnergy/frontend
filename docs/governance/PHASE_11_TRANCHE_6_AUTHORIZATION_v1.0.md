# Phase 11 Tranche 6 Authorization v1.0
Version: v1.0
Subsystem: Chain Linkage Alignment (orderId propagation only)
Status: AUTHORIZED (Tranche 6)
Date: 2026-02-17
Branch: governance-clean-rebuild
Baseline Freeze Tag: v1.0-runtime-consolidated
Tranche 5 Close SHA: cd78c2d5016fe89aa77ff3bc6083ad55aabef212

## 1) Objective
Resolve the current orchestration precondition failure by ensuring deterministic `orderId` propagation in the checkout/pricing chain before CRM linkage query execution.

Current first orchestration failure:
- `Chain A — CRM: query cases linked to order`
- reason: `Missing orderId for CRM linkage query`

## 2) Authorized Scope
Authorized:
- deterministic `orderId` emission at checkout/pricing chain boundary
- deterministic propagation of `orderId` so orchestration reaches CRM query execution path
- minimal contract alignment updates required to expose `orderId` in chain response

## 3) Out of Scope
- pricing calculation changes
- payment status/state-machine changes
- CRM behavior or schema changes
- email queue/log surface implementation
- settlement behavior changes
- authority model changes
- workflow/state-transition changes
- background jobs

## 4) Determinism Rules
- `orderId` generated once per checkout chain invocation
- no hidden side effects
- no background processing
- no new authority or role behavior
- no additional write surfaces beyond existing create flow

## 5) Acceptance Criteria
1. `orderId` is present in checkout/pricing response used by orchestration chain.
2. Orchestration harness progresses beyond `Missing orderId for CRM linkage query`.
3. Runtime boot validator remains PASS.
4. Two consecutive PASS runs on Runtime Unified Boot Integration CI.
5. Governance docs updated with tranche evidence and new first-failure location.

## 6) Expected Progression
After Tranche 6 close, Phase 11 progression target is 85%.
Remaining major gap after this tranche: Email queue/log surface alignment.
