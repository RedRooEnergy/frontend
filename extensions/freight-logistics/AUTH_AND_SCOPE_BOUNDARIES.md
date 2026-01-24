# EXT-10 — Auth Boundaries & Scope Enforcement

Status: GOVERNANCE DRAFT
Extension: EXT-10 — Freight & Logistics Operator Experience
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory authentication and authorisation
boundaries governing Freight & Logistics Operator access under EXT-10.

These controls are enforced by Core and consumed by this extension.

## Core Principles

- Default deny
- Explicit role assignment
- Least-privilege scope enforcement
- No implicit permissions
- No privilege escalation

## Identity Requirements

All Freight & Logistics Operator access requires:
- Authenticated identity
- Role explicitly set to LogisticsOperator
- Active operator status
- Valid session context

Unauthenticated access is denied.

## Role Enforcement

Only identities with role:
- LogisticsOperator

are permitted to access EXT-10 functionality.

No other roles (Buyer, Supplier, Service Partner,
Compliance Authority, Administrator) may assume logistics capabilities.

## Scope Enforcement

Logistics access is further restricted by explicit scopes.

Scopes may include (non-exhaustive):
- SHIPMENT_VIEW
- CONSIGNMENT_VIEW
- STATUS_SIGNAL
- EXCEPTION_REPORT

Scopes are:
- Explicitly assigned
- Shipment- or consignment-bound
- Non-transferable
- Time-bound where applicable

Absence of scope results in denial.

## Assignment & Binding

All Logistics Operator actions MUST be:
- Bound to an assigned shipment or consignment
- Verified against operator assignment
- Rejected if assignment is revoked or expired

No global logistics access is permitted.

## Prohibited Behaviour

Logistics Operators MUST NOT:
- Access shipments not assigned to them
- Signal status outside granted scope
- Chain actions to infer authority
- Bypass Core enforcement layers

## Failure Handling

- Auth failures return explicit denial
- Scope failures return explicit denial
- Actions fail closed
- No silent fallback

## Audit Requirements

All auth and scope checks MUST emit audit events:
- LOGISTICS_OPERATOR_ACCESS_GRANTED
- LOGISTICS_OPERATOR_ACCESS_DENIED

Audit records are immutable and mandatory.

## Out of Scope

- Token issuance
- Session lifecycle management
- Role provisioning workflows
- Scope assignment algorithms

These remain Core responsibilities.



Validation Checklist:

Default deny explicitly enforced

Role and scope clearly separated

Assignment binding mandatory

No implicit authority paths

Audit requirements defined

