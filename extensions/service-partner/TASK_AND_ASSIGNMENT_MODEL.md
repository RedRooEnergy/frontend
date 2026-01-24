# EXT-08 — Task & Assignment Model (Conceptual)

Status: GOVERNANCE DRAFT
Extension: EXT-08 — Service Partner Experience & Workflow
Implementation: NOT AUTHORIZED

## Purpose

This document defines the conceptual model for tasks and assignments
that are delegated to Service Partners by the Core platform.

It describes *what exists* and *how it is related*, not how it is implemented.

## Core Principles

- Tasks are created and owned by Core
- Service Partners never create tasks
- Assignments are explicit and scoped
- Tasks are immutable once completed
- Evidence is append-only
- All state transitions are auditable

## Task (Conceptual Entity)

A Task represents a unit of delegated operational work.

Conceptual attributes:
- Task ID
- Task Type (e.g. Install, Inspect, Deliver, Verify)
- Related Entity (Order, Shipment, Compliance Case)
- Required Evidence Types
- Current Task State
- Created Timestamp
- Closed Timestamp (if completed)

Tasks do not contain pricing, payments, or compliance decisions.

## Assignment (Conceptual Entity)

An Assignment represents the delegation of a Task to a specific Service Partner.

Conceptual attributes:
- Assignment ID
- Task ID (reference)
- Service Partner ID
- Assignment Scope
- Assignment State
- Assigned Timestamp
- Acknowledged Timestamp
- Completed Timestamp

Assignments do not alter the Task itself.
They represent responsibility, not authority.

## Task States (Conceptual)

Example task lifecycle states:
- CREATED
- ASSIGNED
- ACKNOWLEDGED
- IN_PROGRESS
- EVIDENCE_SUBMITTED
- COMPLETED
- CANCELLED

State transitions are controlled by Core.

## Assignment States (Conceptual)

Example assignment states:
- ASSIGNED
- ACKNOWLEDGED
- ACTIVE
- COMPLETED
- REVOKED

Service Partners may acknowledge or complete assignments
but may not force task completion.

## Evidence Relationship

Evidence is always:
- Linked to a Task
- Submitted by a Service Partner
- Timestamped and attributed
- Immutable once stored

Evidence does not imply approval or acceptance.

## Out of Scope

- Task creation logic
- Assignment algorithms
- Scheduling optimisation
- Compliance approval logic
- Payment or settlement triggers

These remain Core responsibilities.



Validation Checklist:

Model is conceptual only

No implementation detail included

Core ownership explicit

Service Partner authority constrained

Audit and immutability preserved

