# EXT-09 — Compliance Case & Decision Model (Conceptual)

Status: GOVERNANCE DRAFT
Extension: EXT-09 — Compliance Authority Experience & Decision Workflows
Implementation: NOT AUTHORIZED

## Purpose

This document defines the conceptual model for compliance cases
and compliance decisions handled by Compliance Authorities.

It describes the logical entities and their relationships,
not how they are stored or processed.

## Core Principles

- Compliance cases are created and owned by Core
- Compliance Authorities do not create cases arbitrarily
- Decisions are explicit, intentional, and authoritative
- Decisions are immutable once issued
- All actions are auditable and attributable

## Compliance Case (Conceptual Entity)

A Compliance Case represents a formal review instance
for a product, supplier, shipment, installation, or system state.

Conceptual attributes:
- Case ID
- Case Type (Product, Supplier, Installation, Shipment, System)
- Related Entity Reference
- Trigger Reason
- Current Compliance State
- Opened Timestamp
- Closed Timestamp (if resolved)

Compliance Cases do not contain pricing or payment data.

## Compliance Case States (Conceptual)

Example case lifecycle states:
- OPEN
- UNDER_REVIEW
- DECISION_PENDING
- DECIDED
- SUSPENDED
- CLOSED

State transitions are controlled by Core
and driven by Compliance Authority decisions.

## Compliance Decision (Conceptual Entity)

A Compliance Decision represents a binding outcome
issued by a Compliance Authority.

Conceptual attributes:
- Decision ID
- Case ID
- Decision Type (APPROVE, REJECT, SUSPEND, REVOKE)
- Decision Outcome
- Rationale / Reason Code
- Issued By (Compliance Authority ID)
- Issued Timestamp
- Effective From
- Effective Until (if applicable)

Decisions do not modify history; they append outcomes.

## Decision Characteristics

All decisions:
- Are explicit and non-implicit
- Require rationale or reason codes
- Cannot be edited or deleted
- May trigger Core-managed state transitions
- Are regulator-visible

## Evidence Relationship

- Evidence is linked to Compliance Cases
- Evidence is reviewed, not altered
- Evidence submission is handled outside EXT-09
- Decisions reference evidence but do not mutate it

## Out of Scope

- Case creation logic
- Automated compliance scoring
- Evidence ingestion pipelines
- Notification or enforcement mechanisms

These remain Core responsibilities.



Validation Checklist:

Model is conceptual only

Case and decision separation clear

Authority and immutability explicit

No implementation detail introduced

Core ownership preserved

