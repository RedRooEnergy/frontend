# Public Participant Sites E2E Audit

This suite validates `EXT-PUBLIC-PARTICIPANT-SITES-01` governance checks (`PPS-01` to `PPS-12`) and emits deterministic scorecards.

## Governance URLs

- Badge: `/api/governance/public-participant-sites/badge`
- Status: `/api/governance/public-participant-sites/status`

In CI, these URLs are written to the workflow step summary by `.github/workflows/public-participant-sites-e2e.yml`.

## Artefacts

- `artefacts/public-participant-sites/scorecard.<RUN_ID>.json`
- `artefacts/public-participant-sites/history/scorecard.<RUN_ID>.json`

## Local Run

```bash
cd frontend
BASE_URL=http://127.0.0.1:3001 \
AUDIT_TOKEN_ADMIN=<token> \
AUDIT_TOKEN_REGULATOR=<token> \
npx tsx tests/public-participant-sites/runPublicParticipantSitesE2E.ts
```
