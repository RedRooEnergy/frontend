# GOVERNANCE WEEKLY SNAPSHOT INDEX
Document ID: RRE-GOV-WEEKLY-SNAPSHOT-INDEX-v1.0  
Version: v1.0  
Status: ACTIVE LEDGER  
Classification: Governance Snapshot Ledger  
Primary Series: 00 – Project Definition & Governance

## Ledger Rules

- This index is append-only. Existing rows are not edited or removed.
- Each row references a snapshot artifact under `docs/governance/snapshots/`.
- `overall` reflects governance scorecard outcome at generation time.
- `workflowRunId` must reference the automation run that produced the snapshot.

## Columns

- `snapshotId`
- `generatedAtUtc`
- `commitSha`
- `branch`
- `overall`
- `scorecardSha256`
- `artifactPath`
- `workflowRunId`
- `notes`

## Entries

| snapshotId | generatedAtUtc | commitSha | branch | overall | scorecardSha256 | artifactPath | workflowRunId | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| weekly-2026-02-15T07-19-49Z | 2026-02-15T07:19:49.140Z | e8c15ebd0e2c3808056a0ae7388e6be260e028be | governance-activation-protocol-v1.0 | PASS | a7b704890645cd0557e44807cada6da77504b16ea64f415b32cdc1b4d44f400a | docs/governance/snapshots/governance-snapshot-2026-02-15T07-19-49Z.json | LOCAL | Weekly governance snapshot recorded. |
