# EXT-06 — Logistics Data Model

Status: GOVERNANCE DRAFT

This document defines the canonical logistics data structures.

Shipment
- shipmentId (immutable, UUID)
- orderId (immutable reference)
- supplierId
- buyerId
- carrier
- trackingNumber
- incoterm (must be DDP)
- status (ENUM)
- createdAt (timestamp)
- updatedAt (timestamp)

ShipmentStatus ENUM
- DRAFT
- BOOKED
- IN_TRANSIT
- CUSTOMS_HELD
- CUSTOMS_CLEARED
- DELIVERED
- FAILED

Rules:
- shipmentId is immutable once issued
- Status transitions must be validated
- All status changes emit audit events
- No direct mutation without authorization

