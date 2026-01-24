# EXT-05 — Product State Machine

Status: GOVERNANCE DRAFT

States:
- DRAFT
- SUBMITTED
- UNDER_REVIEW
- COMPLIANCE_FAILED
- APPROVED
- PUBLISHED
- SUSPENDED
- RETIRED

Allowed Transitions:

DRAFT → SUBMITTED  
SUBMITTED → UNDER_REVIEW  
UNDER_REVIEW → APPROVED  
UNDER_REVIEW → COMPLIANCE_FAILED  
COMPLIANCE_FAILED → DRAFT  
APPROVED → PUBLISHED  
PUBLISHED → SUSPENDED  
SUSPENDED → PUBLISHED  
PUBLISHED → RETIRED  
SUSPENDED → RETIRED  

Invalid Transitions:
- Any transition skipping compliance
- Direct DRAFT → PUBLISHED
- Any mutation after RETIRED

Rules:
- Only System may change states
- Human actions trigger state requests, not state changes
- Every transition emits an audit event
- State transitions are irreversible unless explicitly defined

Audit Requirements:
- Transition event
- Actor
- Previous state
- New state
- Timestamp

