# EXT-01 — Implementation Authorization

Extension: Supplier Onboarding  
Extension ID: EXT-01  
Status: AUTHORIZED FOR IMPLEMENTATION  
Governance Status: COMPLETE & FROZEN  

## Authorization Scope

This document authorizes implementation of EXT-01 strictly within the bounds of the approved governance artefacts.

Authorized implementation areas:
- Supplier lifecycle state machine
- Supplier profile persistence
- Document submission and review flows
- Audit event emission per governance
- Authorization enforcement via Core
- API handlers conforming to locked contracts

## Prohibited Actions

The following are explicitly prohibited without an approved Change Control Record (CCR):

- Modifying supplier lifecycle states
- Introducing new roles or permissions
- Emitting undocumented audit events
- Bypassing Core authorization or audit layers
- Altering API contracts
- Adding UI components

## Core Dependencies

EXT-01 implementation MUST use:
- Core audit logger
- Core authorization middleware
- Core request / actor context
- Core error normalization
- Core immutability guarantees

EXT-01 MUST NOT:
- Import from other extensions
- Modify Core code
- Introduce direct process.env access

## Versioning

Initial implementation version:
- EXT-01 v1.0.0 (implementation)

Any subsequent change requires:
- CCR approval
- Version increment
- Registry update

## Effective Date

Effective immediately upon save.
