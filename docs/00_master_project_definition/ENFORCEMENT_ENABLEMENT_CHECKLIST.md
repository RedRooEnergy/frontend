# Enforcement Enablement Checklist

Version: v0.1 DRAFT
Governance State: CORE + EXTENSIONS LOCKED
Activation State: NOT ACTIVATED

Purpose:
Provide a mandatory checklist to be completed before any enforcement
is enabled in any environment.

---

## Pre-Enablement Checklist (Mandatory)

- [ ] Explicit activation authorisation recorded
- [ ] Target environment identified (Staging / Production)
- [ ] Activation phase confirmed (B or C)
- [ ] Enforcement scope defined
- [ ] Rollback plan prepared
- [ ] Monitoring enabled
- [ ] Incident response contacts confirmed

---

## Enforcement Domains

Identity & Roles:
- [ ] Auth middleware ready
- [ ] Role checks verified
- [ ] Bypass paths confirmed absent

Pricing Snapshot:
- [ ] Snapshot creation enforced
- [ ] Mutation paths blocked
- [ ] Reconciliation tests passed

Audit Immutability:
- [ ] Append-only logging verified
- [ ] Destructive operations blocked
- [ ] Evidence retention confirmed

Extension Boundaries:
- [ ] Core non-interference enforced
- [ ] Disabled EXTs remain inactive
- [ ] Superseded EXTs blocked

---

## Post-Enablement Verification

- [ ] Runtime validation complete
- [ ] Audit logs reviewed
- [ ] No unexpected enforcement failures
- [ ] Rollback not required

Declaration:
No enforcement is considered active until this checklist is fully
completed and signed off.
