# EXT-06 — Logistics Data Model

Status: GOVERNANCE DRAFT

This document defines the canonical logistics data structures.

Entities:

LogisticsRecord
- logisticsId (immutable)
- supplierId
- orderId
- carrier
- trackingNumber
- status
- checkpoints[]
- createdAt
- updatedAt

Checkpoint
- checkpointId
- location
- event
- occurredAt
- recordedAt

Rules:
- logisticsId is immutable once created
- Status transitions must follow approved lifecycle
- Checkpoints are append-only
- No in-place mutation of historical data
- All mutations must emit audit events

