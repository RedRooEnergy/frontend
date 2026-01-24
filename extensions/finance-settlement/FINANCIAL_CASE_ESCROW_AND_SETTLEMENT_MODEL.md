# EXT-11 — Financial Case, Escrow & Settlement Model (Conceptual)

Status: GOVERNANCE DRAFT
Extension: EXT-11 — Finance & Settlement Authority Experience
Implementation: NOT AUTHORIZED

## Purpose

This document defines the conceptual model for financial cases,
escrow handling, and settlement outcomes governed under EXT-11.

It describes financial entities and decision relationships,
not how payments are processed or stored.

## Core Principles

- All payments are governed by locked pricing snapshots
- Escrow protects buyers and suppliers until authorised release
- Financial cases are created and owned by Core
- Finance Authorities issue explicit, binding decisions
- Financial history is immutable and auditable

## Financial Case (Conceptual Entity)

A Financial Case represents a controlled review or action
related to a payment, escrow, settlement, refund, or dispute.

Conceptual attributes:
- Financial Case ID
- Case Type (Escrow Release, Refund, Adjustment, Dispute)
- Related Order / Transaction Reference
- Pricing Snapshot Reference
- Current Financial State
- Opened Timestamp
- Closed Timestamp (if resolved)

Financial cases do not alter pricing snapshots.

## Escrow (Conceptual Entity)

Escrow represents funds held pending authorised release.

Conceptual attributes:
- Escrow ID
- Related Order / Transaction
- Amount Held
- Currency
- Escrow State
- Hold Reason
- Created Timestamp
- Released Timestamp (if applicable)

Escrow state transitions are enforced by Core
based on Finance Authority decisions.

## Settlement (Conceptual Entity)

Settlement represents the final financial disposition
of a transaction following escrow release.

Conceptual attributes:
- Settlement ID
- Escrow ID
- Settlement Amount
- Settlement Date
- Recipient(s)
- Settlement State

Settlements are final and immutable once completed.

## Financial States (Conceptual)

Example financial lifecycle states:
- PAYMENT_RECEIVED
- ESCROW_HELD
- ESCROW_RELEASE_REQUESTED
- ESCROW_RELEASE_AUTHORISED
- SETTLEMENT_IN_PROGRESS
- SETTLEMENT_COMPLETED
- REFUND_AUTHORISED
- REFUND_COMPLETED
- DISPUTE_OPEN
- DISPUTE_RESOLVED

State transitions are validated and applied by Core.

## Decision Characteristics

Financial decisions:
- Reference a financial case
- Require authority level validation
- Require rationale or reason codes
- Append outcomes; do not overwrite history
- May trigger Core-managed state transitions

## Out of Scope

- Payment provider APIs
- Pricing calculation logic
- Tax or GST calculation
- Ledger or accounting system integration
- Automated settlement logic

These remain Core responsibilities.



Validation Checklist:

Model is conceptual only

Escrow, settlement, and cases clearly separated

Pricing snapshot immutability preserved

Authority and auditability explicit

No implementation detail introduced

