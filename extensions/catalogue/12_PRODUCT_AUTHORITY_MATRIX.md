# EXT-05 — Product Authority & Role Matrix

Status: GOVERNANCE DRAFT

Roles:
- Supplier
- Compliance Authority
- Administrator
- System

Permissions by Role:

Supplier
- Create product draft
- Edit product in DRAFT
- Submit product for compliance
- Append compliance evidence when requested
- Withdraw product prior to publication

Compliance Authority
- Review submitted products
- Request additional evidence
- Approve or reject compliance
- Suspend published products for compliance breach

Administrator
- Override publication visibility (never compliance outcome)
- Suspend or withdraw products for policy or legal reasons
- View all audit trails (read-only)

System
- Enforce state transitions
- Emit audit events
- Prevent unauthorized mutations
- Enforce immutability post-publication

Prohibited Actions:
- Supplier approving own compliance
- Administrator bypassing compliance approval
- Any role editing product after PUBLISHED except System suspension
- Any role modifying pricing snapshot after publication

Audit Rules:
- All authority actions emit audit events
- Manual actions require justification field

