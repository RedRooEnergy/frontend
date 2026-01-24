# EXT-03 — Logistics, Freight & DDP
## Data Model (Governance-Bound)

This document defines the authoritative data structures for the Logistics & DDP extension.
All fields are immutable once persisted unless explicitly stated.

---

## LogisticsDraft

Primary working record for freight and DDP calculation.

Fields:
- logisticsDraftId (string, immutable, system-generated)
- supplierId (string, immutable)
- orderId (string, immutable)
- originCountry (string, immutable)
- destinationCountry (string, immutable)
- incoterm (enum: DDP only, immutable)
- currency (string, immutable)
- dutyAmount (number, immutable after calculation)
- taxAmount (number, immutable after calculation)
- freightAmount (number, immutable after calculation)
- totalAmount (number, immutable after calculation)
- status (enum: DRAFT | CALCULATED | VERIFIED | DISPATCHED | CLOSED)
- createdAt (timestamp, immutable)
- updatedAt (timestamp, system-managed)

---

## Shipment

Represents the physical shipment once dispatched.

Fields:
- shipmentId (string, immutable, system-generated)
- logisticsDraftId (string, immutable, foreign key)
- carrier (string, immutable)
- trackingReference (string, immutable)
- dispatchDate (timestamp, immutable)
- deliveryDate (timestamp, nullable)
- status (enum: IN_TRANSIT | DELIVERED | EXCEPTION)

---

## ComplianceVerification

Records compliance approval.

Fields:
- verificationId (string, immutable)
- logisticsDraftId (string, immutable)
- verifierId (string, immutable)
- verifiedAt (timestamp, immutable)
- result (enum: PASS | FAIL)

---

## Invariants

- incoterm MUST always equal DDP.
- A LogisticsDraft may only have one Shipment.
- State transitions are strictly linear:
  DRAFT → CALCULATED → VERIFIED → DISPATCHED → CLOSED
- Any deviation is a governance breach.

---

## Audit Binding

- Every create or state transition MUST emit a corresponding audit event.
- Read operations emit LOGISTICS-STATUS-READ where required by governance.
