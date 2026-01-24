# EXT-10 — Audit Events & Observability

Status: GOVERNANCE DRAFT
Extension: EXT-10 — Freight & Logistics Operator Experience
Implementation: NOT AUTHORIZED

## Purpose

This document defines mandatory audit and observability requirements
for all Freight & Logistics Operator actions and signals under EXT-10.

Audit integrity and operational traceability are non-negotiable.

## Core Principles

- Every logistics action is auditable
- No signal is silent or implicit
- Audit records are immutable
- Observability enables full operational reconstruction
- Signals are traceable to physical events

## Audit Event Categories

The following audit event categories MUST be emitted:

### Identity & Access
- LOGISTICS_OPERATOR_AUTHENTICATED
- LOGISTICS_OPERATOR_SESSION_STARTED
- LOGISTICS_OPERATOR_SESSION_ENDED
- LOGISTICS_OPERATOR_ACCESS_DENIED

### Shipment Visibility
- SHIPMENT_LIST_VIEWED
- SHIPMENT_VIEWED
- CONSIGNMENT_VIEWED
- SHIPPING_DOCUMENT_VIEWED

### Status Signalling
- SHIPMENT_STATUS_SIGNALLED
- CONSIGNMENT_STATUS_SIGNALLED
- SHIPMENT_EXCEPTION_REPORTED
- DELIVERY_SIGNALLED

### Failure & Exception
- LOGISTICS_SIGNAL_REJECTED
- LOGISTICS_SIGNAL_FAILED

## Mandatory Audit Fields

Every audit event MUST include:
- Event ID
- Event Type
- Timestamp (UTC)
- Logistics Operator ID
- Shipment ID (if applicable)
- Consignment ID (if applicable)
- Signal Type (if applicable)
- Outcome (ACCEPTED / REJECTED)
- Source (UI / API)

## Observability Requirements

The system MUST support:
- Chronological reconstruction of logistics actions
- Correlation of signals to shipments and consignments
- Identification of rejected or conflicting signals
- Clear separation between signalled vs applied state

## Prohibited Behaviour

Audit events MUST NOT:
- Trigger state changes directly
- Be suppressed or delayed
- Be altered after emission
- Imply outcomes not validated by Core

## Failure Handling

- Signal attempts without audit emission are invalid
- Partial audit records are not permitted
- Failed or rejected signals must emit failure events
- System errors fail closed

## Retention & Access

- Audit records retained per Core policy
- Regulator and operator audit access supported
- Logistics operators cannot modify or delete audit records
- Audit access is role-restricted

## Out of Scope

- Logging infrastructure
- SIEM integration
- Alerting thresholds
- Monitoring dashboards

These remain Core responsibilities.



Validation Checklist:

Logistics audit events enumerated

Mandatory audit fields explicit

Signal vs applied state distinction clear

No workflow coupling introduced

Core authority preserved

