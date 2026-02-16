BUILD_EXECUTION_RULES.md
------------------------

### 1. Operating Model (How Work Proceeds)
- Instruction Authority issues one instruction set at a time.
- Execution Agent performs only the instructed work and reports outcomes.
- Operator returns outcomes verbatim to the Instruction Authority.
- The next instruction set is then issued.
- No side work, parallel tasks, or unrequested changes are permitted.

### 2. Phase Definitions (Authoritative)
**Phase 1: Foundation Scaffold (no features)**
- Allowed: project scaffold, routing shell, global styles, baseline layout placeholders aligned to wireframes.
- Prohibited: feature logic, data integrations, visual reinterpretation, mixed routing modes.
- Required outputs: running local scaffold that builds deterministically and renders structural placeholders per wireframe hierarchy.

**Phase 2: Wireframe Visual Parity (spacing/typography only)**
- Allowed: spacing, typography, colour, component sizing to match wireframes and references exactly; hover/state visuals consistent with authority.
- Prohibited: new features, data wiring, routing changes, design deviations.
- Required outputs: visual match to wireframes/screenshots with evidence (screenshots, notes of exact matches).

**Phase 3: Functional Expansion (governed features)**
- Allowed: governed feature implementation, data flows, interactions explicitly instructed.
- Prohibited: altering established visual contract, introducing new tech surface without approval.
- Required outputs: feature increments demonstrated locally and in production with adherence to prior phase visuals.

### 3. Acceptance Gates (Hard Stops)
- Phase 1 gate: deterministic local build success and scaffold rendering per hierarchy; evidence via build logs and screenshots.
- Phase 2 gate: visual parity proven locally and in production; evidence via updated screenshots and deployment link.
- Phase 3 gate: each feature passes local tests and production verification; evidence via logs, screenshots, or recordings.
- No phase may proceed without meeting its gate; failures halt progression until resolved.

### 4. Hosting Lock Gate (Mandatory)
- Node version locked to 20.x; no auto-upgrade or drift.
- Build and runtime environments must use the locked Node version.
- Hosting project settings must match locked tech decisions before any deployment.
- Any change to Node version, build machine image, or framework version requires explicit written approval.
- Production deployment cannot start until this gate is satisfied and recorded.

### 5. Visual Authority Application Rules
- Wireframes and supplied screenshots are the binding visual authority.
- Layout mechanics and navigation patterns follow the Newegg AU reference.
- Colour, typography softness, and rounded shapes follow the First Option Bank reference.
- No creative deviation or reinterpretation is permitted.

### 6. Prohibited Failure Patterns (Lessons Learned)
- No acknowledgment chains without execution.
- No deployments without a prior local build pass.
- No silent hosting/runtime changes or Node drift.
- No debugging without capturing the first observable error artifact.

### 7. Versioning & Evidence
- Governance documents are versioned in-repo with explicit updates.
- Each phase sign-off is recorded with date, approver, and evidence artifacts.
- Once a phase is accepted, its artefacts (documents, visuals, configs) are locked; changes require explicit approval and new version notes.
