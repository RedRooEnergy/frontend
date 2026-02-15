# GOVERNANCE ACTIVATION REGISTER
Document ID: RRE-GOV-ACTIVATION-REGISTER-v1.0  
Version: v1.0  
Status: ACTIVE REGISTER  
Classification: Governance State Register  
Primary Series: 00 – Project Definition & Governance

## Register Rules

- This register is the authoritative state ledger for governance surface activation status.
- New rows are append-only. Existing rows are not deleted.
- State changes require supporting evidence and DMS row linkage.
- A surface is not activated unless listed here with state `ACTIVATED`.

## Columns

- `surfaceName`
- `state`
- `stateEffectiveAtUTC`
- `activatedAtCommit`
- `ciArtefactHash`
- `manifestHash`
- `ratifiedBy`
- `dmsRow`
- `notes`

## Entries

| surfaceName | state | stateEffectiveAtUTC | activatedAtCommit | ciArtefactHash | manifestHash | ratifiedBy | dmsRow | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MASTER_DASHBOARD_GOVERNANCE_CONTROL_SURFACE | LOCK-READY | 2026-02-15T06:36:30Z | N/A | N/A | N/A | Governance Lead + Domain Lead | 00.XX.10 | Baseline anchored by tag `governance-dashboard-control-surface-v1.1-baseline` at commit `33c3c70`. |
