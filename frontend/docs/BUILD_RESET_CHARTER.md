BUILD_RESET_CHARTER.md
----------------------

### 1. Purpose of Reset
- Halt the current build to eliminate repeated technical dead-loops around deployment and tooling.
- Preserve all governance and design artefacts to maintain institutional knowledge and audit continuity.
- Initiate a clean technical rebuild to restore determinism, clarity, and alignment with approved intent.

### 2. Scope of Preservation (LOCKED)
The following are preserved and frozen without alteration:
- Governance documents.
- Extension registry and specifications.
- Compliance frameworks.
- Design intent, wireframes, and supplied screenshots.
- Architectural decisions and rationale.
No existing governance artefact is invalidated.

### 3. Scope of Termination
The following are formally terminated:
- Current frontend code implementation.
- Current hosting configuration.
- Current deployment pipeline.
- Any incomplete or unstable technical artefacts produced during the terminated build.

### 4. Principles for the New Build
- Governance-first decision-making.
- Single, consistent routing strategy.
- No experimental or unstable framework flags.
- Deterministic build and deployment processes.
- Visual implementation must follow the approved wireframes exactly.

### 5. Explicit Exclusions
The new build will NOT:
- Mix router modes.
- Perform silent dependency or framework version changes.
- Assume hosting choices prior to explicit approval in late phase.
- Allow scope creep during foundational build execution.

### 6. Success Criteria for the New Build
- Deterministic local build reproducibility.
- Deterministic production deployment.
- Homepage rendering matches the approved wireframes and design intent.
- Stable foundation established before any feature expansion.

### 7. Authority & Change Control
- This charter governs the reset and is authoritative.
- Any deviation requires explicit written approval.
- No technical work proceeds without formal written instruction under this charter.
