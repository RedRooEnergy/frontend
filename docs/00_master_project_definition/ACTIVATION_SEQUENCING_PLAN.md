# Activation Sequencing Plan

Version: v0.1 DRAFT
Governance State: CORE + EXTENSIONS LOCKED
Activation State: NOT ACTIVATED

Purpose:
Define the controlled, phased sequence for enabling enforcement and
runtime governance once authorisation is granted.

Principles:
- No activation without explicit authorisation
- One enforcement domain per phase
- Evidence and rollback required at every step

---

## Phase A — Dry Activation Design (No Enablement)

Scope:
- Define toggles, flags, and enforcement points
- Define validation criteria
- Define rollback procedures

Deliverables:
- Enforcement mapping (complete)
- CI/CD gate definitions (complete)
- Enablement checklist (defined)
- Rollback checklist (defined)

Exit Criteria:
- No open risks
- Checklists approved
- No code paths enabled

---

## Phase B — Staging Activation

Scope:
- Enable enforcement in STAGING only
- No production impact

Order:
1. Identity & Role Enforcement
2. Pricing Snapshot Enforcement
3. Audit Immutability Validation
4. Extension Boundary Enforcement

Validation:
- Automated tests pass
- Manual governance review
- Audit logs verified

Rollback:
- Disable toggles
- Revert configuration
- Preserve audit trail

Exit Criteria:
- Staging validation complete
- No critical defects

---

## Phase C — Production Activation

Scope:
- Enable enforcement in PRODUCTION

Order:
- Same sequence as Phase B

Validation:
- Live monitoring
- Audit trail confirmation
- Stakeholder sign-off

Rollback:
- Immediate toggle disablement
- Incident escalation if required

Exit Criteria:
- Enforcement stable
- Governance activation declared
