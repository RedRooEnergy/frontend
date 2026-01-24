# EXT-12 — Auth Boundaries & Scope Enforcement

Status: GOVERNANCE DRAFT
Extension: EXT-12 — Platform Analytics, Reporting & Oversight
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory authentication and authorisation
boundaries governing analytics and reporting access under EXT-12.

Analytics access is supervisory and must be tightly controlled.

## Core Principles

- Default deny
- Explicit role assignment
- Least-privilege scope enforcement
- Read-only access only
- No implicit permissions

## Identity Requirements

All analytics access requires:
- Authenticated identity
- Role explicitly set and recognised by Core
- Active account status
- Valid session context

Unauthenticated access is denied.

## Role Enforcement

Only the following roles may access EXT-12 analytics, subject to scope:

- Administrator
- ComplianceAuthority
- FinanceAuthority
- Executive (Read-Only)

All other roles are denied by default.

## Scope Enforcement

Analytics access is further restricted by explicit scopes.

Scopes may include (non-exhaustive):
- ANALYTICS_PLATFORM_OVERVIEW
- ANALYTICS_FINANCIAL_SUMMARY
- ANALYTICS_COMPLIANCE
- ANALYTICS_LOGISTICS
- ANALYTICS_EXECUTIVE
- REPORT_GENERATE
- REPORT_VIEW
- REPORT_EXPORT

Scopes are:
- Explicitly assigned
- Non-transferable
- Time-bound where applicable

Absence of required scope results in denial.

## Data Sensitivity Controls

- Sensitive dashboards require elevated scope
- Regulator-facing reports require explicit regulator scope
- Export permissions are separate from view permissions
- No scope grants raw data access

## Prohibited Behaviour

Analytics users MUST NOT:
- Access dashboards outside assigned scope
- Export reports without explicit export scope
- Combine views to infer restricted information
- Share access credentials or sessions

## Failure Handling

- Auth failures return explicit denial
- Scope failures return explicit denial
- Access attempts fail closed
- No silent fallback

## Audit Requirements

All auth and scope checks MUST emit audit events:
- ANALYTICS_ACCESS_GRANTED
- ANALYTICS_ACCESS_DENIED
- ANALYTICS_SCOPE_MISMATCH

Audit records are immutable.

## Out of Scope

- Role provisioning workflows
- Scope assignment logic
- Session lifecycle management
- Credential issuance

These remain Core responsibilities.



Validation Checklist:

Default deny explicitly enforced

Role and scope separation clear

Sensitive data access controlled

Export permissions explicitly gated

Audit requirements defined

