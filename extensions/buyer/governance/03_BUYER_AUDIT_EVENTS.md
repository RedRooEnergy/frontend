# EXT-07 — Buyer Audit Events

Status: GOVERNANCE DRAFT

All buyer actions emit audit events with scope ORDER_LIFECYCLE.

Events:
- BUYER_REGISTERED
- BUYER_VERIFIED
- ORDER_CREATED
- ORDER_CONFIRMED
- ORDER_CANCELLED
- ORDER_COMPLETED

Rules:
- events are append-only
- requestId is mandatory
- actor context must be BUYER or SYSTEM
- timestamps are system-generated

