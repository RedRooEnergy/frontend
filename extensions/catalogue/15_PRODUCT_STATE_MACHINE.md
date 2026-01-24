# EXT-05 — Product State Machine

Status: GOVERNANCE DRAFT

States:
- DRAFT
- SUBMITTED
- UNDER_COMPLIANCE_REVIEW
- APPROVED
- PUBLISHED
- SUSPENDED
- RETIRED

Allowed Transitions:

DRAFT → SUBMITTED  
SUBMITTED → UNDER_COMPLIANCE_REVIEW  
UNDER_COMPLIANCE_REVIEW → APPROVED  
UNDER_COMPLIANCE_REVIEW → DRAFT (rework)  
APPROVED → PUBLISHED  

PUBLISHED → SUSPENDED  
SUSPENDED → PUBLISHED  
PUBLISHED → RETIRED  
SUSPENDED → RETIRED  

Rules:
- Only SUPPLIER may create or edit DRAFT
- SUBMITTED locks supplier edits
- Compliance Authority controls review outcomes
- PUBLISHED products are immutable except for SYSTEM state changes
- RETIRED is terminal; no transitions allowed
- All transitions emit audit events
- Invalid transitions must hard-fail

Terminal State:
- RETIRED

