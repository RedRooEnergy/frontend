# EXT-06 — Logistics Authorization Rules

Status: GOVERNANCE DRAFT

This document defines who may act on logistics entities and under what conditions.

Roles:
- SYSTEM
- SUPPLIER
- CARRIER
- ADMIN
- COMPLIANCE

Permissions:
- SYSTEM: create shipments, emit system tracking events
- SUPPLIER: view shipment status for own orders
- CARRIER: append tracking events only
- ADMIN: view all shipments, no mutation
- COMPLIANCE: read-only access for audit and review

Rules:
- Default-deny applies to all actions
- No role may bypass audit emission
- Mutations without requestId are forbidden

