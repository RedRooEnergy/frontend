# Publish Flow Diagram

1. Participant/Admin edits draft (`DRAFT`) via governed schema fields.
2. Admin updates profile statuses (`APPROVED` and verification states).
3. Publish call validates eligibility:
   - `approvalStatus=APPROVED`
   - no auto-unpublish blockers (`insurance/certification` rules)
4. Deterministic render payload is generated.
5. `SHA-256` hash computed and stored as `renderedHash`.
6. Previous `PUBLISHED` snapshot is transitioned to `SUSPENDED`.
7. Current `DRAFT` transitions to `PUBLISHED` with `publishedAt/publishedBy`.
8. `slugLocked` is set on first publish.

Suspension path:
- Any status change to suspended/revoked/expired state triggers unpublish and returns `410 Gone` for public route.

