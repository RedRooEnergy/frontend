# EXT-07 — Buyer Authority Matrix

Status: GOVERNANCE DRAFT

Roles:
- BUYER
- SYSTEM
- ADMIN

Permissions:
- BUYER:
  - view catalogue
  - create orders (VERIFIED only)
  - view own orders and documents
- SYSTEM:
  - emit audit events
  - enforce lifecycle transitions
- ADMIN:
  - read-only oversight
  - suspend or close buyer accounts

Rules:
- default-deny applies
- no role may bypass lifecycle enforcement

