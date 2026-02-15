# REGULATOR TRANSPARENCY PACK

Document ID: RRE-GOV-REGULATOR-TRANSPARENCY-PACK-v1.0  
Version: v1.0  
Status: LOCK-READY  
Classification: External Regulator Transparency / Governance Evidence  
Authority Scope: Design Governance Only (Non-Operational)  
Runtime RBAC Impact: NONE

## 1) Purpose

Provide a consolidated, hash-linked regulator-facing evidence pack for the locked Platform Design Authority framework under `EXT-GOV-AUTH-01`.

This pack is informational only and does not disclose operational credentials, runtime permission internals, or transaction data.

## 2) Locked Authority Anchor

- Authority version: `v1.0`
- Extension ID: `EXT-GOV-AUTH-01`
- Board resolution ID: `RRE-BRD-RES-PLATFORM-DESIGN-AUTHORITY-LOCK-v1.0`
- Authority lock manifest SHA-256: `45edfccb03ae6642c95871e553f96c8d9990f754c42b53fa758c298809026e25`
- Lock timestamp (UTC): `2026-02-14T17:25:43.261Z`

## 3) Referenced Governance Artefacts (Hash-Linked)

| Artefact | Path | SHA-256 |
| --- | --- | --- |
| Authority hierarchy | `docs/00_master_project_definition/RRE-00-PLATFORM-AUTHORITY-HIERARCHY-v1.0.md` | `f7ee9c00f3d04a8466ebac56473c08e1b045474452a151af75be2ae2337730ae` |
| Extension spec | `docs/extensions/EXT-GOV-AUTH-01/EXT-GOV-AUTH-01_SPEC.md` | `a8b8863c68e8d0acb6cfc2c82e3ede0c86c41adadab383ad269ae8ba6383194b` |
| Authority close pack | `docs/governance/PLATFORM_DESIGN_AUTHORITY_LOCK_CLOSE_PACK_v1.0.md` | `5fa46d5d43ff34b6d0d91f9198a542c932680e6a2d3ef326eea896ae4b7b7937` |
| Board resolution | `docs/governance/BOARD_RESOLUTION_PLATFORM_DESIGN_AUTHORITY_LOCK_v1.0.md` | `5a67bb2c5818b749f3a5707dad6d7e654f07ecf09eb9c414aaf1de65078331c7` |
| Authority manifest | `docs/governance/PLATFORM_DESIGN_AUTHORITY_LOCK_MANIFEST_v1.0.json` | `45edfccb03ae6642c95871e553f96c8d9990f754c42b53fa758c298809026e25` |
| CODEOWNERS baseline | `.github/CODEOWNERS` | `8c1f1e437b06722931e2f364bbf9aef3b7cca3de57b3ed918873b12de137c622` |

## 4) DMS Hash Row Excerpt

Source file: `docs/00_master_document_inventory.md`

```text
| 00.XX.01 | PLATFORM_DESIGN_AUTHORITY_LOCK_CLOSE_PACK_v1.0 | v1.0 | LOCKED | docs/governance/PLATFORM_DESIGN_AUTHORITY_LOCK_CLOSE_PACK_v1.0.md | 5fa46d5d43ff34b6d0d91f9198a542c932680e6a2d3ef326eea896ae4b7b7937 | docs/governance/PLATFORM_DESIGN_AUTHORITY_LOCK_MANIFEST_v1.0.json | 45edfccb03ae6642c95871e553f96c8d9990f754c42b53fa758c298809026e25 | 2026-02-14T17:25:43.261Z |
```

## 5) Repository Enforcement Snapshot

Verification target: branch `main` on repository `RedRooEnergy/frontend`.

- Pull requests required: `true`
- Required approving reviews: `2`
- CODEOWNERS review required: `true`
- Strict status checks: `true`
- Conversation resolution required: `true`
- Linear history required: `true`
- Enforce admins: `true`
- Allow force pushes: `false`
- Allow deletions: `false`
- Required contexts:
  - `Buyer Onboarding Audit (Blocking) / buyer-onboarding-audit`
  - `Freight & Customs Audit (Blocking) / freight-customs-audit`
  - `Installer Onboarding Audit (Blocking) / installer-onboarding-audit`

## 6) CODEOWNERS Enforcement Summary

The repository CODEOWNERS baseline enforces governance review coverage for:

- Immutable Core paths
- Finance paths
- Compliance paths
- Commercial paths
- Governance document paths
- Authority extension path (`docs/extensions/EXT-GOV-AUTH-01/`)

Reference file: `.github/CODEOWNERS` (hash listed in Section 3).

## 7) Immutable Core Non-Bypass Statement

This transparency pack confirms governance controls are design-authority controls only and do not authorize:

- runtime RBAC role-key changes,
- backend enforcement modifications,
- transaction/escrow/settlement permission expansion,
- bypass of immutable audit logging,
- bypass of immutable Core constraints.

## 8) Integrity Statement

This document is a regulator evidence summary linked to immutable artefact hashes and branch governance settings at generation time.  
Any change requires change control, version increment, new SHA-256 manifest, and DMS index update.
