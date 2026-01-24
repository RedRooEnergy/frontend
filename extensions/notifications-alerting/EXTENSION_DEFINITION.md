# EXT-13 — Platform Notifications, Alerting & Communications

Status: GOVERNANCE DRAFT
Governance Phase: DEFINITION
Implementation: NOT AUTHORIZED

## Purpose
EXT-13 defines the platform-wide notifications, alerting, and communications
capabilities for the RedRooEnergy marketplace. It governs how system-generated
messages, alerts, and notices are produced, routed, audited, and delivered
to users and external parties.

This extension is delivery-focused and non-authoritative.

## In Scope
- System notifications (in-app, email, SMS where applicable)
- Event-driven alerts (status changes, exceptions, reminders)
- Role-based notification routing
- Template-driven communications
- Delivery status tracking (sent / failed)
- Audit event emission for all notifications

## Out of Scope
- Core modifications
- Business decision-making
- Pricing, payments, escrow, or settlement actions
- Compliance approvals or rejections
- Marketing campaigns or promotional messaging
- User-generated free-form messaging

## Governance Rules
- Notifications reflect Core truth only
- No notification may create or alter system state
- Delivery does not imply action or approval
- Templates are governed and versioned
- Default deny applies to notification access and dispatch

## Dependencies
- Immutable Core (Identity, Auth, Audit, Event Bus)
- Orders, payments, compliance, logistics, and system events (Core-owned)
- User contact preferences and consent records (Core-owned)

## Change Control
Once authorised, all changes require a formal Change Control Request (CCR).



Validation Checklist:

Extension purpose clearly delivery-focused

No decision or execution authority implied

Scope boundaries clearly defined

No implementation detail introduced

Governance-first positioning preserved

