# EXT-13 — Delivery Channels, Consent & Preference Rules

Status: GOVERNANCE DRAFT
Extension: EXT-13 — Platform Notifications, Alerting & Communications
Implementation: NOT AUTHORIZED

## Purpose

This document defines the rules governing notification delivery channels,
user consent, and preference handling under EXT-13.

Delivery must comply with legal, regulatory, and user-consent obligations.

## Permitted Delivery Channels

Notifications MAY be delivered via the following channels,
subject to consent and scope:

- In-app notifications (platform UI)
- Email
- SMS (where legally permitted)
- System-to-system notifications (regulator or partner endpoints)

No other delivery channels are permitted without formal Change Control.

## Channel Characteristics

- In-app notifications are the default channel
- Email and SMS are secondary channels
- Regulatory and system notices may override opt-out where legally required
- Delivery channel selection is template-driven

## Consent Requirements

- User consent is required for non-essential notifications
- Consent is captured and stored by Core
- Consent records are immutable and auditable
- Withdrawal of consent is effective immediately, except where overridden by law

## Preference Handling

Users MAY:
- Opt in or out of optional notification categories
- Select preferred delivery channels
- Set frequency preferences (where supported)

Users MAY NOT:
- Disable mandatory system or regulatory notices
- Modify notification content
- Override delivery rules defined by governance

Preference changes:
- Are validated by Core
- Are audited
- Do not affect historical notifications

## Regulatory Overrides

The following notifications override user preferences:
- Legal notices
- Regulatory communications
- Security and breach notifications
- Critical system availability alerts

Overrides are:
- Explicitly labelled
- Minimised to required scope
- Fully auditable

## Prohibited Behaviour

Notification delivery MUST NOT:
- Ignore consent records
- Circumvent opt-out without legal basis
- Deliver duplicate notifications across channels unnecessarily
- Escalate delivery frequency without approval

## Audit & Traceability

Delivery lifecycle events MUST emit audit events:
- NOTIFICATION_DISPATCH_ATTEMPTED
- NOTIFICATION_DELIVERED
- NOTIFICATION_DELIVERY_FAILED
- NOTIFICATION_SUPPRESSED_BY_CONSENT

Audit records include:
- Notification ID
- Channel
- Consent status
- Timestamp
- Outcome

## Out of Scope

- Channel provider selection
- Message retry strategies
- Throttling and rate limiting
- Delivery performance optimisation

These are addressed in implementation phases or Core standards.



Validation Checklist:

Delivery channels explicitly enumerated

Consent and preference rules clearly defined

Regulatory override conditions explicit

Prohibited behaviours stated

Audit lifecycle requirements defined

