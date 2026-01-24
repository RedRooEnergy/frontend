# Application Structure Declaration

Version: v0.1 DRAFT
Status: Draft
Governance State: PAUSED

Purpose:
This document formally declares the actual application and repository
structure of the project as-built, replacing any assumed or implied
backend/frontend layouts.

Authoritative Structure:
The project uses a modular, governance-first structure rather than a
traditional frontend/backend split.

Top-Level Directories:

/core
- Core platform logic, shared services, and foundational components
- No direct UI or deployment coupling

/extensions
- Extension-specific logic and integration points
- Each extension operates within Immutable Core constraints

/governance
- Governance enforcement logic, policies, and controls
- Non-runtime governance artefacts where applicable

/infrastructure
- Deployment, environment, and infrastructure-related definitions
- No application business logic

/docs
- Authoritative documentation, governance artefacts, and audit records

Structure Notes:
- There is no standalone /backend or /frontend directory by design
- UI and API concerns are encapsulated within governed modules where applicable
- Any future structural changes require formal change control

Precedence:
This declaration supersedes any assumed structure referenced in health checks,
procedures, or prior documentation.
