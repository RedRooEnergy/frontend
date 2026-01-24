# EXT-13 — Notification Content, Templates & Versioning Rules

Status: GOVERNANCE DRAFT
Extension: EXT-13 — Platform Notifications, Alerting & Communications
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory rules governing notification content,
template structure, versioning, and change control under EXT-13.

Notification templates are governance artefacts and must be controlled
to ensure consistency, accuracy, and regulatory defensibility.

## Core Principles

- All notifications are template-driven
- No free-form or ad-hoc messaging
- Templates reflect Core truth only
- Templates are versioned and immutable once published
- Content changes require governance approval

## Template Definition

A notification template defines:
- Notification category
- Intended audience role(s)
- Triggering Core event type
- Content structure (subject, body, placeholders)
- Supported delivery channels
- Template version identifier

Templates do not contain business logic.

## Content Rules

Notification content MUST:
- Be factual and non-inferential
- Reflect the Core event that triggered it
- Avoid speculative or advisory language
- Avoid instructions that imply authority or action
- Use neutral, professional tone

Notification content MUST NOT:
- Approve or reject decisions
- Override system state
- Include commercial persuasion or marketing
- Include user-generated free text
- Expose sensitive data beyond necessity

## Placeholders & Data Binding

- Templates use approved placeholders only
- Placeholders map directly to Core event fields
- No derived or calculated fields permitted
- Missing placeholder data results in notification suppression

## Versioning Rules

- Every template has a unique version identifier
- Published templates are immutable
- Template updates require a new version
- Historical notifications reference the template version used
- Deprecated templates remain retained for audit

## Change Control

Template changes require:
- Documented change rationale
- Impact assessment
- Approval under formal Change Control (CCR)
- Version increment

No silent template changes are permitted.

## Audit & Traceability

Template lifecycle events MUST emit audit events:
- TEMPLATE_CREATED
- TEMPLATE_PUBLISHED
- TEMPLATE_SUPERSEDED
- TEMPLATE_DEPRECATED

Audit records include:
- Template ID
- Template version
- Actor identity
- Timestamp

## Out of Scope

- Template rendering engines
- Internationalisation / localisation rules
- Visual design standards
- Delivery formatting per channel

These are addressed in implementation phases or Core standards.



Validation Checklist:

Template governance explicitly defined

Versioning and immutability enforced

Content rules clearly bounded

Change control requirements explicit

Audit lifecycle events defined

