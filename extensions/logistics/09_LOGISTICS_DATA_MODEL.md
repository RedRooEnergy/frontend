# EXT-06 — Logistics Data Model

Status: GOVERNANCE DRAFT

This document defines the authoritative data structures for logistics tracking.

Core Entities:
- Shipment
- Package
- Carrier
- TrackingEvent
- CustomsStatus

Shipment:
- shipmentId (immutable)
- orderId
- supplierId
- buyerId
- carrier
- serviceLevel
- status
- createdAt
- activatedAt

TrackingEvent:
- eventId (immutable)
- shipmentId
- eventType
- location
- timestamp
- actorId
- requestId

Rules:
- shipmentId and eventId are immutable
- All state transitions must emit an audit event
- No direct mutation without audit

