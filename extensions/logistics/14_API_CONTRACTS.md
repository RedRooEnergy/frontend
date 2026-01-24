# EXT-06 — Logistics API Contracts

Status: GOVERNANCE DRAFT

All logistics APIs are governed by Core contracts.

Endpoints (conceptual):

POST /logistics
- Create logistics record
- Authorized roles only
- Emits LOGISTICS_CREATE audit event

POST /logistics/{id}/checkpoint
- Append tracking checkpoint
- Append-only operation
- Emits LOGISTICS_TRACKING_APPEND audit event

POST /logistics/{id}/verify
- Compliance verification
- Emits LOGISTICS_VERIFY audit event

GET /logistics/{id}
- Read-only
- No audit emission

Rules:
- No endpoint may bypass authorization
- No endpoint may mutate immutable fields
- Errors must be normalized via Core error middleware

