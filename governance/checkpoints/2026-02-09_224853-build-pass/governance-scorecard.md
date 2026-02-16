# Governance Scorecard

- Run ID: audit-1770626439408
- Base URL: http://127.0.0.1:3001
- Overall: **PASS**
- Total checks: 11
- Passed: 11
- Failed: 0

## Clause Impact
- GOV-CORE-01: 0 failed / 2 total
- GOV-COMP-03: 0 failed / 3 total
- GOV-COMP-02: 0 failed / 3 total
- GOV-COMP-04: 0 failed / 1 total
- GOV-REG-01: 0 failed / 1 total
- GOV-AUD-01: 0 failed / 1 total

## Results
- rbac_supplier_admin_forbidden: PASS (GET http://127.0.0.1:3001/api/admin/compliance-partners → 403)
- rbac_admin_access: PASS (GET http://127.0.0.1:3001/api/admin/compliance-partners → 200)
- api_checklists: PASS (GET http://127.0.0.1:3001/api/compliance/checklists?productType=InverterBatteryEV → 200)
- supplier_create_application: PASS (POST http://127.0.0.1:3001/api/compliance/applications → 201)
- submit_blocked: PASS (POST http://127.0.0.1:3001/api/compliance/applications/APP-1770626440993-841ddb76/submit → 409)
- document_upload: PASS (POST http://127.0.0.1:3001/api/compliance/applications/APP-1770626440993-841ddb76/documents → 201)
- checklist_evaluation: PASS (GET http://127.0.0.1:3001/api/compliance/applications/APP-1770626440993-841ddb76/evaluation → 200)
- admin_review: PASS (POST http://127.0.0.1:3001/api/compliance/applications/APP-1770626440993-841ddb76/review → 200)
- evidence_export: PASS (POST http://127.0.0.1:3001/api/compliance/applications/APP-1770626440993-841ddb76/exports → 201)
- regulator_hash_verify: PASS (POST http://127.0.0.1:3001/api/compliance/regulator/verify-hash → 200)
- secure_manifest_download: PASS (GET http://127.0.0.1:3001/api/compliance/exports/EXP-1770626442950-33646ba5/download/manifest → 200)