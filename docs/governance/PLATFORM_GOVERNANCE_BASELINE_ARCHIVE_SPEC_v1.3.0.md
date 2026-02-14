# PLATFORM_GOVERNANCE_BASELINE_ARCHIVE_SPEC_v1.3.0
Document ID: RRE-GOV-ARCHIVE-SPEC-v1.3.0
Version: v1.3.0
Status: LOCK-READY
Classification: Governance Baseline Archive Specification
Authority Impact: NONE
Runtime Mutation Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Archive Directory Layout

Authoritative baseline archive root:

```text
artefacts/governance/v1.3.0/
  governance_status_snapshot.json
  governance_index_delta.json
  rule_matrix_snapshot.json
  badge_snapshot.svg
  scorecards/
    chatbot.scorecard.json
  manifest.json
  manifest.sha256.txt
  README.txt
```

Layout rules:

- Exact file names required.
- Additional files must be documented in `manifest.json`.
- Relative paths in manifest must match archive paths exactly.

## 2) Manifest Format

`manifest.json` required structure:

```json
{
  "manifestVersion": "pga-reeval-manifest.v1",
  "baselineVersion": "v1.3.0",
  "generatedAtUtc": "ISO-8601 UTC",
  "commitHash": "git SHA",
  "files": [
    {
      "name": "governance_status_snapshot.json",
      "bytes": 0,
      "sha256": "64-char lowercase hex"
    }
  ]
}
```

Field requirements:

- `name`: relative file path from archive root
- `bytes`: exact byte length of file content
- `sha256`: SHA-256 digest, lowercase hex, length 64
- `generatedAtUtc`: ISO-8601 UTC timestamp
- `commitHash`: exact source commit SHA used for snapshot
- `baselineVersion`: MUST equal `v1.3.0`

`manifest.sha256.txt` format:

```text
<sha256(manifest.json)>  manifest.json
```

## 3) Immutability Rules

- Overwrite is prohibited for `artefacts/governance/v1.3.0/` once baseline is declared authoritative.
- Retroactive edit is prohibited for any file under this baseline folder.
- Corrections require creation of a new version folder (example: `v1.3.1`).
- Invalidation of baseline requires formal change control and board amendment.

Prohibited actions:

- Modify existing snapshot JSON files in-place.
- Regenerate `manifest.json` in-place after lock.
- Replace `manifest.sha256.txt` in-place after lock.

## 4) Retention Policy

Retention class:

- Permanent retention.

Surface classification:

- Investor due diligence surface.
- Regulator audit surface.
- Board attestation surface.

Storage policy:

- Keep baseline archive in immutable storage tier where available.
- Preserve hash manifest and attestation block with baseline payload.

## 5) Cross-Reference Requirements

Baseline archive MUST cross-reference:

- PGA close pack:
  - `docs/governance/PLATFORM_GOVERNANCE_AGGREGATOR_CLOSE_PACK_v1.3.0.md`
- Board ratification:
  - `docs/governance/BOARD_RESOLUTION_PLATFORM_GOVERNANCE_AGGREGATOR_v1.3.0.md`
- Rule registry version:
  - `docs/governance/PLATFORM_GOVERNANCE_RULE_REGISTRY.md` (v1.3.0)

Optional supporting references:

- `docs/governance/PLATFORM_GOVERNANCE_INDEX_SUMMARY.md` (v1.3.0)
- `docs/governance/GOV-CHAT-01_PGA_RULE_CONTRACT.md`

## 6) Verification Requirements

Archive verification minimum set:

1. Verify `manifest.sha256.txt` against `manifest.json`.
2. Verify each file hash listed in `manifest.json`.
3. Verify file byte counts listed in `manifest.json`.
4. Verify `baselineVersion = v1.3.0`.
5. Verify `commitHash` matches recorded baseline commit.

Any mismatch result:

- Archive integrity status = `INVALID`
- Baseline publication blocked
- Change-control incident required

## 7) Non-Implementation Clause

This specification defines archive structure and controls only.

It does NOT authorize:

- Runtime code changes
- Governance scoring changes
- CI workflow changes
- Rule semantics changes

Any implementation action must be separately authorized.
