# Supplier Onboarding Extension — Charter

Extension ID: EXT-01  
Name: Supplier Onboarding  
Status: DRAFT  
Authority: Pre-Implementation  
Parent: Core Platform (LOCKED)

## Purpose

Provide a governed workflow for supplier identity verification, compliance submission, approval, suspension, and revocation.

## Non-Negotiables

- Must use Core identity, audit, authorization, and immutability
- No direct database access outside Core contracts
- No bypass of compliance or revocation rules
- All actions must emit audit events

## Scope (Initial)

- Supplier registration
- Document upload (certifications)
- Compliance validation states
- Approval / rejection
- Suspension / revocation

## Out of Scope (This Phase)

- Payments
- Catalogue publishing
- Orders

## Change Control

This extension is not active until:
- Governance approved
- CCR created
- Registered in EXTENSIONS_REGISTRY.md
