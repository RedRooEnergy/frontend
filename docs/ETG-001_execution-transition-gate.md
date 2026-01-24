# ETG-001 — Execution Transition Gate (Authorisation to Code)

Project: RedRooEnergy Multi-Vendor Marketplace  
Status: GOVERNANCE COMPLETE — IMPLEMENTATION AUTHORISED  
Authority Level: EXECUTION ENABLED

---

## Purpose

This document formally closes the governance-writing phase and authorises the
start of implementation under strict constraints.

No functional code may exist before this gate.

---

## Preconditions (All Must Be True)

- Master Governance Document Inventory exists and is complete
- All Phases 01–20 documents are written and frozen
- Change Control system (Phase 21) is in place
- No unresolved governance gaps remain

All preconditions are satisfied.

---

## Authorised Repository Model (LOCKED)

Repository root:

REDROO_Marketplace/
├─ docs/        (READ-ONLY GOVERNANCE)
├─ core/        (IMMUTABLE CORE — FIRST TO BE BUILT)
├─ extensions/  (GOVERNED EXTENSIONS — LATER)
├─ frontend/    (UI — MUCH LATER)
├─ infra/
├─ .github/
├─ .vscode/

Rules:
- core/ MUST NOT import from extensions/
- frontend/ MUST NOT bypass backend APIs
- docs/ is reference-only and never read at runtime

---

## Authorised Runtime Stack (LOCKED)

Backend:
- Node.js 20 LTS
- TypeScript (strict)
- Express
- MongoDB
- SHA-256 hashing minimum

Frontend (later):
- Next.js (App Router)
- Vercel hosting

Infrastructure:
- DigitalOcean (backend)
- Docker + Docker Compose
- GitHub Actions CI/CD

---

## Environment Model (LOCKED)

Three environments are mandatory:
- local
- staging
- production

No code may assume production defaults.

---

## Governance Integration Rule

Governance documents:
- Guide reasoning
- Constrain design
- Are NOT runtime dependencies

---

## Authorisation Statement

ETG-001 is now CLOSED.

Implementation is authorised under the above constraints.

Any deviation requires formal Change Control (Phase 21).

---

Signed: Governance Authority  
Date: [insert today’s date]
