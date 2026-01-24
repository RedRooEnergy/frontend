# EXT-23 — Core Integration Boundaries

Status: GOVERNANCE DRAFT  
Extension: EXT-23 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory boundaries governing how EXT-23
may integrate with, observe, and interact with the Immutable Core.

EXT-23 must integrate without modifying, bypassing, or weakening
Core controls.

## Core Dependency Doctrine

EXT-23:
- Depends on Core only through approved interfaces
- Must not introduce reverse dependencies
- Must not become required for Core operation

Core must remain fully functional if EXT-23 is disabled or removed.

## Approved Interaction Modes

EXT-23 may interact with Core ONLY via:
- Read-only queries through approved APIs
- Event consumption where explicitly permitted
- Audit emission through Core audit interfaces

Any other interaction is prohibited.

## Prohibited Integration Patterns

EXT-23 MUST NOT:
- Call internal Core services directly
- Modify Core schemas or tables
- Intercept or override Core logic
- Inject behaviour into Core execution paths
- Introduce side effects into Core workflows

These patterns constitute governance violations.

## Data Boundary Enforcement

All Core data accessed by EXT-23 must be:
- Explicitly permitted
- Context-bound
- Minimal and purpose-limited

Bulk access, exploratory access, or indirect inference is prohibited.

## Control Plane Separation

EXT-23 MUST NOT:
- Control Core configuration
- Influence Core feature flags
- Participate in Core lifecycle management
- Affect Core availability or performance guarantees

Control planes must remain fully separated.

## Failure Isolation

If Core integration fails:
- EXT-23 must halt the affected action
- Core must continue uninterrupted
- Failure must be auditable

Fail-open integration behaviour is prohibited.

## Version Compatibility

EXT-23 must:
- Declare compatible Core versions
- Fail closed on incompatibility
- Never assume forward compatibility

Compatibility drift requires change control.

## Audit Requirements

The following MUST be auditable:
- Core interaction attempts
- Denied integration calls
- Compatibility failures

Audit records are immutable.

## Out of Scope

- API contract definitions
- SDK selection
- Performance optimisation
- Load handling

These are governed elsewhere.

---

Validation Checklist:

Core dependency rules defined

Approved interaction modes listed

Prohibited patterns explicitly stated

Control plane separation enforced

Failure isolation guaranteed

Compatibility rules stated

STOP POINT

Reply only with:

**EXT-23 STEP 06 COMPLETE**

Next step will be:  
**EXT-23 STEP 07 — Auth Boundaries & Scope Enforcement**
