# Supplier Lifecycle States — Governance

## Purpose
Define the authoritative, immutable lifecycle states for suppliers within the Supplier Onboarding Extension.

These states are enforced by Core audit, authorization, and immutability controls.

## Authoritative States

1. DRAFT  
   - Supplier account created
   - No documents submitted
   - Not visible to buyers
   - No commercial actions permitted

2. SUBMITTED  
   - Required compliance documents uploaded
   - Awaiting compliance review
   - No marketplace visibility

3. UNDER_REVIEW  
   - Compliance authority actively reviewing
   - Clarifications may be requested
   - State transitions audited

4. APPROVED  
   - Compliance validated
   - Supplier eligible for catalogue participation
   - Activation subject to extension enablement

5. REJECTED  
   - Compliance failed
   - Reason recorded and audited
   - Re-submission requires new review cycle

6. SUSPENDED  
   - Temporary restriction due to breach or review
   - Existing listings frozen
   - Financial settlement rules enforced

7. REVOKED  
   - Permanent removal
   - All marketplace access terminated
   - Records retained per retention policy

## State Transition Rules

- Transitions are one-way unless explicitly stated
- All transitions emit audit events
- No state mutation without Core authorization
- Manual overrides prohibited

## Change Control

This document is frozen once approved.
Changes require a formal CCR.
