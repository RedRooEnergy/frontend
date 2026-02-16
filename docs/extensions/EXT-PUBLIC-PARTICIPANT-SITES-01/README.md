# EXT-PUBLIC-PARTICIPANT-SITES-01

Operational reference for public participant microsites and placement governance.

## Governance Endpoints

- Badge endpoint: `/api/governance/public-participant-sites/badge`
- Status endpoint: `/api/governance/public-participant-sites/status`

These endpoints expose the latest PASS-2 state from `artefacts/public-participant-sites/history/`.

## CI Wiring

Workflow: `.github/workflows/public-participant-sites-e2e.yml`

The workflow step summary publishes the badge URL, status URL, and scorecard artefact paths for each run.
