# EXT-13 — Notification Types, Triggers & Event Sources

Status: GOVERNANCE DRAFT
Extension: EXT-13 — Platform Notifications, Alerting & Communications
Implementation: NOT AUTHORIZED

## Purpose

This document defines the notification categories, triggering events,
and authorised event sources used by EXT-13.

Notifications are derived strictly from Core events.
No notification may be generated independently of a Core event.

## Core Principles

- Event-driven only
- No manual free-form notification creation
- Notifications reflect Core truth at the time of emission
- One-way communication (informational)
- All triggers are auditable

## Notification Categories

### Transactional Notifications
Examples:
- Order created
- Order confirmed
- Order shipped
- Order delivered
- Payment received
- Invoice issued

Audience: Buyer, Supplier  
Trigger Source: Core Order & Payment Events

### Operational Alerts
Examples:
- Task assigned
- Task overdue
- Shipment delayed
- Exception reported

Audience: Service Partner, Logistics Operator  
Trigger Source: Core Task & Logistics Events

### Compliance Notifications
Examples:
- Compliance case opened
- Evidence available for review
- Decision issued
- Certification expiring

Audience: Compliance Authority, Supplier  
Trigger Source: Core Compliance Events

### Financial Notifications
Examples:
- Escrow held
- Escrow release authorised
- Settlement completed
- Refund processed
- Dispute opened / resolved

Audience: Buyer, Supplier, Finance Authority  
Trigger Source: Core Finance & Settlement Events

### System & Governance Notices
Examples:
- Policy updates
- Scheduled maintenance
- Critical system alerts
- Regulatory notices

Audience: All affected roles  
Trigger Source: Core System & Governance Events

## Approved Event Sources (Core-Owned)

Notifications MAY be triggered only by:
- Order lifecycle events
- Payment and pricing snapshot events
- Compliance case and decision events
- Logistics and shipment events
- Task and assignment events
- Financial settlement events
- System health and governance events

External or third-party events are prohibited unless
explicitly approved via Change Control.

## Trigger Constraints

- Each notification must reference a specific Core event ID
- Duplicate notifications are prevented via idempotency
- Notification timing must preserve event order
- Suppressed or failed notifications are auditable

## Prohibited Triggers

Notifications MUST NOT be triggered by:
- UI interactions
- Manual admin messages
- Analytics or reporting events
- External marketing systems
- User-generated actions outside Core workflows

## Out of Scope

- Template design
- Delivery channel selection
- Retry logic
- Throttling or batching strategies

These are defined in later steps or Core.



Validation Checklist:

Notification types clearly categorised

Triggers strictly event-driven

Approved Core event sources enumerated

Prohibited triggers explicit

Governance-first constraints preserved

