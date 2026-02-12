# EXT-FREIGHT-02 — Operational Verification Plan (PASS-2)

Version: v1.0
Status: PASS-2 (Operational Verification)
Mode: Non-blocking informational verification

## Purpose

PASS-2 verifies runtime fidelity of freight operations across Sea/Air paths,
Customs/DDP checkpoints, and Last-Mile delivery evidence.

PASS-2 does not modify branch protection and does not alter PASS-1 governance locks.

## A) Sea Freight Path (DDP)

Inputs:
- `orderId`
- `shipmentId`
- `containerId` (or `bookingRef`)

Required milestones/events:
- `SHIPMENT_DISPATCHED`
- `CUSTOMS_CLEARED` checkpoint
- `DELIVERY_CONFIRMED`

Required invariants:
- Order must not reach `DELIVERED` without delivery evidence reference.
- Order must not reach `SETTLEMENT_PENDING` without `DELIVERY_CONFIRMED`.

## B) Air Freight Path (DDP)

Inputs:
- `orderId`
- `shipmentId`
- `airwayBillRef`

Required milestones/events:
- `SHIPMENT_DISPATCHED`
- `CUSTOMS_CLEARED` checkpoint
- `DELIVERY_CONFIRMED`

Required invariants:
- Order must not reach `DELIVERED` without delivery evidence reference.
- Order must not reach `SETTLEMENT_PENDING` without `DELIVERY_CONFIRMED`.

## C) Customs / Duty (DDP)

Canonical checkpoint:
- Event code: `CUSTOMS_CLEARED`

Evidence reference rule:
- `CUSTOMS_CLEARED` must carry an immutable document reference id/hash.

Invariant:
- Delivery confirmation must not be accepted without DDP clearance evidence
  when DDP is required.

## D) Last-Mile

Proof-of-delivery evidence:
- POD document reference id/hash
- carrier delivery confirmation reference

Invariant:
- Settlement release is denied until POD exists and delivery is confirmed.

## E) Evidence Outputs (PASS-2)

Required outputs:
- JSON operational scorecard
- Evidence pack directory under:
  - `artefacts/freight-operational-pass2/<runId>/`
- Run summary JSON and SHA-256 manifest:
  - `summary.freight-operational-pass2.<runId>.json`
  - `summary.freight-operational-pass2.<runId>.json.sha256`

Primary scorecard path pattern:
- `artefacts/freight-operational-pass2/scorecard.freight-operational-pass2.<runId>.json`

## Execution Modes

- Static mode (default in CI): file-backed contract checks only.
- Integration mode: enabled with `PASS2_BASE_URL` and `PASS2_TEST_ORDER_ID`.
  Runtime checks are strict and fail on misses.
