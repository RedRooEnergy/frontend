# EXT-05 — Product Lifecycle States

Status: GOVERNANCE DRAFT

Lifecycle States:
- DRAFT
- SUBMITTED
- COMPLIANCE_REQUIRED
- COMPLIANT
- PUBLISHED
- SUSPENDED
- WITHDRAWN

State Rules:
- DRAFT → editable by supplier
- SUBMITTED → locked pending checks
- COMPLIANCE_REQUIRED → supplier must attach evidence
- COMPLIANT → eligible for publication
- PUBLISHED → immutable commercial data
- SUSPENDED → admin or compliance authority action
- WITHDRAWN → supplier-initiated removal

Transition Constraints:
- No direct transition from DRAFT to PUBLISHED
- PUBLISHED cannot return to DRAFT
- SUSPENDED overrides all states except WITHDRAWN

Audit Requirements:
- All state transitions emit GOVERNANCE audit events
- Actor, reason, and timestamp required

