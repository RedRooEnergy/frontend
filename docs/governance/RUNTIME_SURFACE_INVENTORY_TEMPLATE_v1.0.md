# Runtime Surface Inventory Template

Version: v1.0  
Phase: 10.5.10 — Runtime Inventory  
Status: DRAFT (Template)  
Date: 2026-02-16

## 1) Scope
This inventory documents where each required runtime contract currently lives and whether it is executable from one unified backend service.

Rules for this inventory:
- Evidence-first: every route claim must include source file path and a reproducible command.
- No assumptions: use `PRESENT`, `PARTIAL`, `MISSING`, or `DOC_ONLY`.
- No logic changes in this phase.

## 2) Authoritative Workspace Roots
| Label | Absolute Path | Git Remote | Role |
|---|---|---|---|
| Primary Runtime Candidate | `/Users/redroo/Documents/Feb-17-26-RedRooEnergy-Platform` | `https://github.com/RedRooEnergy/rre-frontend.git` | main integration workspace |
| Backend Partial Service | `/Volumes/External RAM 1TB/REDROO_Projects_backend` | `https://github.com/RedRooEnergy/backend.git` | refund/queue/settlement service |
| Governance Worktree | `/Volumes/External RAM 1TB/REDROO_Projects_mirror__gov_clean` | `https://github.com/RedRooEnergy/rre-frontend.git` | governance enforcement assets |

## 3) Required Runtime Contract Matrix
Use one row per required contract.

Status legend:
- `PRESENT`: executable route exists with handler.
- `PARTIAL`: related logic exists but route or mount contract differs.
- `MISSING`: no executable route found.
- `DOC_ONLY`: contract exists in docs only.

| Subsystem | Method | Required Contract | Status | Source Repo/Path | Source File | Mount/Prefix | Auth Guard | Deterministic Test Seam | Evidence Command |
|---|---|---|---|---|---|---|---|---|---|
| Core | GET | `/healthz` |  |  |  |  |  |  |  |
| Payments | POST | `/api/payments/checkout` |  |  |  |  |  |  |  |
| Payments | GET | `/api/payments/status/:id` |  |  |  |  |  |  |  |
| Shipping | POST | `/api/shipping/quote` |  |  |  |  |  |  |  |
| Shipping | POST | `/api/shipping/select` |  |  |  |  |  |  |  |
| Shipping | GET | `/api/shipping/shipments/:id` |  |  |  |  |  |  |  |
| Settlement | POST | `/api/settlement/holds` |  |  |  |  |  |  |  |
| Settlement | GET | `/api/settlement/holds/:id` |  |  |  |  |  |  |  |
| Settlement | POST | `/api/settlement/holds/:id/override` |  |  |  |  |  |  |  |
| CRM | GET | `/api/crm/cases` |  |  |  |  |  |  |  |
| CRM | GET | `/api/crm/cases/:id` |  |  |  |  |  |  |  |
| Email | POST | `/api/admin/email/preview-or-send` |  |  |  |  |  |  |  |
| Email | GET | `/api/admin/email/logs` |  |  |  |  |  |  |  |
| Compliance (optional) | POST | `/api/compliance/check` |  |  |  |  |  |  |  |
| Compliance (optional) | GET | `/api/compliance/cases/:id` |  |  |  |  |  |  |  |

## 4) Runtime Fragment Inventory
Document each currently runnable service/app and its exposed surface.

| Service Name | Start Command | Port | Health Path | Route Families Mounted | DB Layer | Notes |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |

## 5) Route Source Registry
Capture exact file-level route declarations for later extraction/mounting in 10.5.20.

| Method | Path in Code | File | Export Type | Depends On | Candidate Unified Mount |
|---|---|---|---|---|---|
|  |  |  | `router` / `app` / `handler` |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

## 6) Data/Model Registry
Identify model ownership and collision risk.

| Domain | Collection/Table | Current Owner File(s) | Duplicate Definition Risk (`LOW`/`MED`/`HIGH`) | Notes |
|---|---|---|---|---|
| Payments |  |  |  |  |
| Shipping |  |  |  |  |
| Settlement Holds |  |  |  |  |
| CRM Cases |  |  |  |  |
| Email Logs |  |  |  |  |

## 7) Middleware and Auth Registry
Inventory middleware stack differences across runtime fragments.

| Service | Request Context Middleware | Auth Middleware | Role Header Contract | Error Middleware | Risk |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
|  |  |  |  |  |  |

## 8) Gap Summary
Mark final gaps for 10.5.20 normalization.

| Contract | Gap Type (`MISSING_ROUTE`/`PATH_MISMATCH`/`AUTH_MISMATCH`/`MODEL_GAP`/`DOC_ONLY`) | Blocking for Phase 11 (`YES`/`NO`) | Planned Action |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## 9) Evidence Commands
Keep the exact command set used to build this inventory.

```bash
# Example patterns (replace as used)
rg -n "router\\.post|router\\.get|app\\.post|app\\.get" <path>
rg -n "checkout|shipping|crm|email|snapshot|hold" <path>
find <path> -type f -name "*route*.ts"
```

## 10) Inventory Sign-off
- Inventory Compiled By:
- Date:
- Baseline Commit SHA:
- Approved For 10.5.20 Extraction: `YES` / `NO`

