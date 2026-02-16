CLEAN_BUILD_BLUEPRINT.md
------------------------

### 1. Build Objective
Establish a deterministic, governance-first frontend baseline for the RedRooEnergy Marketplace that renders the approved homepage wireframes exactly, using a minimal, locked technology stack to enable reliable local builds and production deployments before any feature expansion.

### 2. Locked Technology Decisions
- Framework: Next.js 14 (App Router).
- Rendering model: App Router with React Server Components; Client Components only where hooks or browser APIs are required.
- Node.js version: 20.11.1 (locked).
- Package manager: npm (lockfile enforced).
- Styling approach: Tailwind CSS utility classes (no inline styles, no CSS-in-JS).
- State management: Local React state only; no global state library in Phase 1.
These choices are fixed for the foundational build.

### 3. Repository Structure (Authoritative)
- Root: project root with `package.json`, `next.config.js`, `tsconfig.json`, `README.md`, `BUILD_RESET_CHARTER.md`, `CLEAN_BUILD_BLUEPRINT.md`.
- Application directory: `app/` (App Router entrypoints, route segments).
- Components directory: `components/` (shared UI components).
- Styles directory: `app/globals.css` (and Tailwind config if applicable).
- Assets: `public/` for images/icons referenced by the UI.
- Documentation: `/docs/` for governance and implementation-facing documents (includes the reset charter and blueprint).

### 4. Routing & Entry Point Rules
- Single routing model: App Router only.
- Single homepage entrypoint: `app/page.tsx` is the sole route served at `/`.
- No Pages Router files (`pages/` directory) and no alternative routing systems are permitted.

### 5. Build & Deployment Philosophy
- Local build must succeed deterministically (`npm run build`) before any remote deployment action.
- CI mirrors local build; no CI-only flags or behaviour.
- Production deployment must use the same build settings as local; no environment-specific deviations.
- No hosting/vendor assumptions until after a passing local build is demonstrated.

### 6. Visual Authority Rules
- Approved wireframes and supplied screenshots are binding visual specifications.
- No creative deviation or reinterpretation of layout, hierarchy, spacing, or styling.
- First Option Bank informs colour/typography softness; Newegg informs layout mechanics and navigation patterns.
- When in doubt, match the wireframes exactly; hierarchy follows the provided visual order.

### 7. Phase Boundaries
- Phase 1: Foundation — scaffold routing, layout shell, global styles, and exact homepage structure; no new features, integrations, or data flows.
- Phase 2: Visual parity — align spacing, typography, states, and interactions to match wireframes precisely.
- Phase 3: Functional expansion — add governed functionality only after Phase 2 acceptance.
Not allowed in Phase 1: mixed routing, global state libraries, backend integration, feature work beyond the baseline homepage render.

### 8. Explicit Non-Goals
- No mixed router modes or legacy Pages Router support.
- No silent dependency or framework version changes.
- No assumption of hosting or CDN specifics during Phase 1.
- No scope creep into payments, auth, or compliance engines during foundation.
- No design reinterpretation or alternative theming.

### 9. Readiness Gate to Start Coding
Coding may begin only when all conditions are met:
- BUILD_RESET_CHARTER.md and CLEAN_BUILD_BLUEPRINT.md are approved and in the repository.
- Locked tech decisions are accepted without exceptions.
- Repository structure is agreed and empty of conflicting legacy routing artefacts.
- Wireframes/screenshots are confirmed as the binding visual source.
- Node 20.11.1 and npm are available and verified for the team.
