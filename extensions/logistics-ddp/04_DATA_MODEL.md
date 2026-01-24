# EXT-03 — Logistics, Freight & DDP
## Core Data Model

This document defines the authoritative data structures for the Logistics & DDP extension.
These models are extension-scoped and must not weaken Core guarantees.

---

## LogisticsDraft

Represents an in-progress logistics record prior to shipment activation.

Fields:
- logisticsDraftId (string, immutable)
- supplierId (string, immutable)
- orderId (string, immutable)
- originCountry (string)
- destinationCountry (string)
- hsCodes (array<string>)
- grossWeightKg (number)
- volumeM3 (number)
- declaredValue (number)
- currency (string)
- status (enum: DRAFT | CALCULATED | VERIFIED | DISPATCHED | CLOSED)
- createdAt (timestamp, immutable)
- updatedAt (timestamp)

---

## DDPCalculation

Represents a completed DDP calculation snapshot.

Fields:
- ddpCalculationId (string, immutable)
- logisticsDraftId (string, immutable)
- duties (number)
- taxes (number)
- freightCost (number)
- insuranceCost (number)
- totalLandedCost (number)
- currency (string)
- calculatedAt (timestamp, immutable)

---

## ComplianceVerification

Represents compliance verification tied to logistics.

Fields:
- verificationId (string, immutable)
- logisticsDraftId (string, immutable)
- authority (string)
- result (enum: APPROVED | REJECTED)
- notes (string)
- verifiedAt (timestamp, immutable)

---

## State Invariants

- logisticsDraftId is immutable.
- DDP calculations are immutable once created.
- Status transitions must be monotonic.
- CLOSED is terminal.

---

## Prohibitions

- No deletion of logistics records.
- No modification of immutable fields.
- No direct access to Core audit store.
