# EXT-03 — Logistics, Freight & DDP
## Core Data Model (Governed)

This document defines the authoritative data model for Logistics, Freight, and Delivered Duty Paid (DDP).
All fields are immutable unless explicitly stated.

---

## LogisticsDraft

Represents a governed logistics calculation prior to shipment.

### Fields

- logisticsDraftId (string, immutable, UUID)
- supplierId (string, immutable)
- orderId (string, immutable)
- originCountry (string, immutable)
- destinationCountry (string, immutable)
- hsCode (string, immutable)
- weightKg (number, immutable)
- volumeM3 (number, immutable)
- declaredValue (number, immutable)
- currency (string, immutable)

### Derived Fields

- dutyAmount (number, system-calculated)
- gstAmount (number, system-calculated)
- freightCost (number, system-calculated)
- totalLandedCost (number, system-calculated)

### State

- status (enum)
  - DRAFT
  - CALCULATED
  - VERIFIED
  - DISPATCHED
  - CLOSED

---

## Shipment

Represents a bound shipment after verification.

### Fields

- shipmentId (string, immutable, UUID)
- logisticsDraftId (string, immutable)
- carrier (string, immutable)
- trackingNumber (string, immutable)
- dispatchDate (ISO timestamp, immutable)
- expectedDeliveryDate (ISO timestamp, immutable)
- actualDeliveryDate (ISO timestamp, nullable, immutable once set)

---

## Immutability Rules

- logisticsDraftId and shipmentId are generated once and never reused.
- Calculated monetary fields are written once per state transition.
- State transitions are append-only and audited.
- No deletion is permitted.

---

## Governance Constraints

- A LogisticsDraft MUST exist before Shipment creation.
- Shipment creation requires VERIFIED status.
- Manual overrides are prohibited.
- All writes emit audit events.
