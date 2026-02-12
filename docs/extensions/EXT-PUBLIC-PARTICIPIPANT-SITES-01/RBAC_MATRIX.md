# RBAC Matrix — EXT-PUBLIC-PARTICIPANT-SITES-01

## Entity Participant
- Allowed:
  - Draft edit
  - Draft preview
  - Submit draft update
- Denied:
  - Publish
  - Suspend
  - Placement contract approval

## Admin / Developer / CEO (governance roles)
- Allowed:
  - Upsert profile
  - Update verification statuses
  - Publish snapshot
  - Suspend public site
  - Create/update placement contracts
  - Lock weekly placements
  - View full version history

## Regulator
- Allowed:
  - Read-only verify endpoint
  - Hash validity checks
- Denied:
  - All mutations

## Public
- Allowed:
  - Read published microsites
  - Submit contact request via controlled bridge
- Denied:
  - Draft access
  - Internal metadata and direct contact addresses

