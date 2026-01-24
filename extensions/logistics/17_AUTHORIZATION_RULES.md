# EXT-06 — Logistics Authorization Rules

Status: GOVERNANCE DRAFT

Roles:
- SYSTEM
- SUPPLIER
- COMPLIANCE_AUTHORITY
- ADMIN

Permissions:
- SYSTEM: create LogisticsRecord, emit audit events
- SUPPLIER: view own LogisticsRecord, append tracking events
- COMPLIANCE_AUTHORITY: verify logistics, set VERIFIED status
- ADMIN: read-only oversight access

Rules:
- default-deny applies
- suppliers may not modify duty, GST, or verification fields
- verification requires COMPLIANCE_AUTHORITY role
- all actions must include requestId and actor context

