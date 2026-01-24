# EXT-15 — Return & Refund Policy Enforcement Rules

Status: GOVERNANCE DRAFT
Extension: EXT-15 — Returns, Refunds & Dispute Management
Implementation: NOT AUTHORIZED

## Purpose

This document defines how return and refund policies are enforced
within EXT-15, without granting financial execution authority.

Policy enforcement ensures consistent, fair, and auditable handling
of post-order outcomes.

## Core Principles

- Policies are defined and owned by Core
- EXT-15 enforces policy gates, not outcomes
- No refund or return is executed without authority approval
- Policy evaluation is explicit and auditable
- Default deny applies where policy conditions are not met

## Return Policy Enforcement

Return requests MUST be evaluated against:
- Applicable return window
- Product eligibility rules
- Condition and usage requirements
- Evidence sufficiency
- Jurisdictional constraints

EXT-15 MAY:
- Accept or reject a return request at the policy-gate level
- Transition case state to RETURN_AUTHORISED or RETURN_DENIED
- Request additional evidence

EXT-15 MUST NOT:
- Override Core-defined return policies
- Authorise refunds or settlement
- Bypass evidence requirements
- Alter product eligibility rules

## Refund Policy Enforcement

Refund requests MUST be evaluated against:
- Approved return or non-delivery conditions
- Escrow or settlement state
- Pricing snapshot integrity
- Evidence sufficiency
- Applicable refund policies

EXT-15 MAY:
- Accept or reject a refund request at the policy-gate level
- Transition case state to REFUND_REQUESTED or REFUND_DENIED
- Escalate to Finance Authority for decision

EXT-15 MUST NOT:
- Execute refunds
- Release escrow
- Modify pricing snapshots
- Bypass Finance Authority approval

## Escalation & Authority Handover

Where policy conditions are met:
- EXT-15 escalates cases to the appropriate authority
- Finance Authority handles monetary outcomes
- Compliance Authority handles compliance-related outcomes

EXT-15 records escalation as an auditable state transition.

## Policy Overrides

Policy overrides:
- Are not permitted within EXT-15
- Require formal Change Control at Core level
- Must never be implied or automated

## Failure Handling

- Policy evaluation failures fail closed
- Ambiguous cases default to denial or escalation
- Errors must be explicit and logged

## Audit & Traceability

All policy enforcement actions MUST emit audit events:
- RETURN_POLICY_EVALUATED
- RETURN_POLICY_DENIED
- REFUND_POLICY_EVALUATED
- REFUND_POLICY_DENIED
- CASE_ESCALATED_TO_AUTHORITY

Audit records include:
- Case ID
- Policy reference
- Evaluation outcome
- Actor (system or role)
- Timestamp

## Out of Scope

- Policy rule definition
- Refund amount calculation
- Currency handling
- Tax or GST treatment

These remain Core or EXT-11 responsibilities.



Validation Checklist:

Policy enforcement clearly bounded

No financial execution authority implied

Escalation to authorities explicit

Default-deny behaviour enforced

Audit events enumerated
