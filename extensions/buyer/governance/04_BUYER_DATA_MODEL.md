# EXT-07 — Buyer Data Model

Status: GOVERNANCE DRAFT

Buyer (immutable fields unless stated):
- buyerId (string, immutable)
- email (string, immutable)
- status (enum: DRAFT | VERIFIED | SUSPENDED)
- createdAt (timestamp, immutable)
- verifiedAt (timestamp, nullable)
- metadata (object, append-only)

Rules:
- buyerId is system-generated
- email cannot be changed after verification
- status transitions are governed
- all mutations emit audit events

