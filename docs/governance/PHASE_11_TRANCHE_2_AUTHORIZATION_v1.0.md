# Phase 11 Tranche 2 Authorization v1.0
Version: v1.0
Subsystem: Shipping (Deterministic Quote / Select / Read)
Status: AUTHORIZED (Tranche 2)
Date: 2026-02-17
Branch: governance-clean-rebuild
Baseline Freeze Tag: v1.0-runtime-consolidated
Tranche 1 Close SHA: c3e328a832e678e22017f1fd1df06ad182e596d3

## 1) Objective
Implement a deterministic local shipping subsystem to unblock Phase 11 orchestration progression beyond payments, without external carrier integrations or authority expansion.

## 2) Authorized Contracts
- `POST /api/shipping/quote`
- `POST /api/shipping/select`
- `GET /api/shipping/shipments/:id`

No additional endpoints are authorized in this tranche.

## 3) Scope Boundaries
In scope:
- deterministic local quote calculation
- Mongo-backed shipment persistence
- deterministic quote selection model
- CI validation updates
- orchestration smoke progression updates

Out of scope:
- carrier API integrations
- real-time freight APIs
- customs/duty external providers
- DDP cost engines
- settlement/queue coupling changes
- email notifications

## 4) Determinism Requirements
- no external network calls
- identical input yields identical quote outputs
- deterministic quote IDs (`std`, `exp`)
- no automatic interactions with settlement or queue

## 5) Governance Constraints
- no changes to payments/refunds/admin-queue/settlement authority model
- no background-job requirements for shipping flow
- only authorized shipping contracts may be added

## 6) Acceptance Criteria
1. Quote endpoint returns deterministic shipment + deterministic quotes
2. Select endpoint transitions shipment from `QUOTED` to `SELECTED`
3. Read endpoint reflects persisted selected state
4. Runtime validator updated and passing
5. Two consecutive CI PASS runs on Runtime Unified Boot Integration CI
6. Inventory and smoke documents updated

## 7) Expected Progression
After Tranche 2 close, Phase 11 progression target is 50% with remaining gaps in Pricing, CRM, and Email surfaces.
