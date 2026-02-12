# Suspension Enforcement Test Report

## Deterministic Conditions
Auto-unpublish when any applies:
- approvalStatus in `SUSPENDED | REVOKED`
- insuranceStatus in `EXPIRED | REVOKED` (entity-specific enforcement)
- certificationStatus in `EXPIRED | REVOKED` (entity-specific enforcement)

## Expected Runtime Behavior
- Public route returns `410 Gone` with controlled payload.
- Placement eligibility is denied.
- Weekly lock generation excludes ineligible entities.

## Control Validation Points
- Admin status update triggers suspend/unpublish.
- Public read API never returns suspended content.
- Publish API denies eligibility failures.

