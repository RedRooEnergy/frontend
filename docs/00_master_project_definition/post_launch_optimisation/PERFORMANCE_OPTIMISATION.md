# Performance Optimisation

Version: v0.1
Governance State: LOCKED
Behaviour Change: NONE

Targets:
- LCP ≤ 2.5s
- CLS ≤ 0.1
- INP ≤ 200ms

Actions (Allowed):
- Code-splitting and lazy loading
- Image optimisation (sizes, formats)
- Font loading optimisation
- Reduce main-thread blocking

Forbidden:
- Changing data flows
- Altering enforcement timing
- Introducing optimistic UI

Evidence:
- Before/After metrics
- Affected routes/components
