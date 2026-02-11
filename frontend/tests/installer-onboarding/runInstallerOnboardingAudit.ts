import { buildCheck, fileContains, fileExists, writeScorecard } from "../governance/auditRunner";

const checks = [
  buildCheck(
    "INSTALLER-01",
    "Service-partner installer scope is explicitly declared",
    fileExists("extensions/service-partner/EXTENSION_DEFINITION.md") &&
      fileExists("extensions/service-partner/README.md"),
    "Service-partner extension definition and README are present.",
    "Service-partner extension definition artefacts are missing.",
    ["extensions/service-partner/EXTENSION_DEFINITION.md", "extensions/service-partner/README.md"]
  ),
  buildCheck(
    "INSTALLER-02",
    "Installer lifecycle and authority model is documented",
    fileExists("extensions/service-partner/contracts/servicePartner.states.md") &&
      fileExists("extensions/service-partner/contracts/servicePartner.events.md") &&
      fileExists("extensions/service-partner/GOVERNANCE_AND_ROLES.md"),
    "Service-partner lifecycle states, events, and governance docs are present.",
    "Installer lifecycle/authority governance artefacts are incomplete.",
    [
      "extensions/service-partner/contracts/servicePartner.states.md",
      "extensions/service-partner/contracts/servicePartner.events.md",
      "extensions/service-partner/GOVERNANCE_AND_ROLES.md",
    ]
  ),
  buildCheck(
    "INSTALLER-03",
    "Installer evidence submission rules are explicit and versioned",
    fileExists("extensions/service-partner/EVIDENCE_SUBMISSION_RULES.md") &&
      fileExists("extensions/service-partner/evidence/evidenceSubmission.ts"),
    "Evidence submission policy and handler contract are present.",
    "Evidence submission governance artefacts are missing.",
    ["extensions/service-partner/EVIDENCE_SUBMISSION_RULES.md", "extensions/service-partner/evidence/evidenceSubmission.ts"]
  ),
  buildCheck(
    "INSTALLER-04",
    "Installer authorization boundaries and routing contracts exist",
    fileExists("extensions/service-partner/AUTH_AND_SCOPE_BOUNDARIES.md") &&
      fileExists("extensions/service-partner/routes/servicePartner.routes.ts"),
    "Authorization boundaries and service-partner route contracts are present.",
    "Installer authorization boundaries or route contracts are missing.",
    ["extensions/service-partner/AUTH_AND_SCOPE_BOUNDARIES.md", "extensions/service-partner/routes/servicePartner.routes.ts"]
  ),
  buildCheck(
    "INSTALLER-05",
    "Installer verification checklist and lock doctrine are present",
    fileExists("extensions/service-partner/VERIFICATION_CHECKLIST.md") &&
      fileExists("extensions/service-partner/EXTENSION_LOCK.md") &&
      fileExists("extensions/service-partner/IMPLEMENTATION_AUTHORISED.md"),
    "Verification checklist, lock status, and implementation authorization are documented.",
    "Installer verification/lock governance artefacts are incomplete.",
    [
      "extensions/service-partner/VERIFICATION_CHECKLIST.md",
      "extensions/service-partner/EXTENSION_LOCK.md",
      "extensions/service-partner/IMPLEMENTATION_AUTHORISED.md",
    ]
  ),
  buildCheck(
    "INSTALLER-06",
    "Installer audit observability surface is defined",
    fileExists("extensions/service-partner/AUDIT_AND_OBSERVABILITY.md") &&
      fileExists("extensions/service-partner/events/servicePartner.events.ts"),
    "Service-partner audit observability docs and event definitions exist.",
    "Installer audit observability controls are incomplete.",
    ["extensions/service-partner/AUDIT_AND_OBSERVABILITY.md", "extensions/service-partner/events/servicePartner.events.ts"]
  ),
  buildCheck(
    "INSTALLER-07",
    "Installer task and assignment projection contracts are deterministic",
    fileExists("extensions/service-partner/adapters/taskProjection.adapter.ts") &&
      fileExists("extensions/service-partner/adapters/assignmentProjection.adapter.ts") &&
      fileExists("extensions/service-partner/TASK_AND_ASSIGNMENT_MODEL.md"),
    "Task/assignment projection adapters and model are present.",
    "Installer projection model for tasks/assignments is incomplete.",
    [
      "extensions/service-partner/adapters/taskProjection.adapter.ts",
      "extensions/service-partner/adapters/assignmentProjection.adapter.ts",
      "extensions/service-partner/TASK_AND_ASSIGNMENT_MODEL.md",
    ]
  ),
  buildCheck(
    "INSTALLER-08",
    "Installer onboarding integrates with supplier governance dependencies",
    fileExists("extensions/supplier-onboarding/governance/03_SUPPLIER_AUTHORITY_AND_STATE_TRANSITIONS.md") &&
      fileExists("extensions/supplier-onboarding/governance/07_SUPPLIER_API_CONTRACTS.md") &&
      fileContains("extensions/01_SUPPLIER_ONBOARDING_CHARTER.md", "Supplier"),
    "Supplier governance dependencies required for installer interaction are documented.",
    "Supplier dependency governance artefacts required by installer onboarding are incomplete.",
    [
      "extensions/supplier-onboarding/governance/03_SUPPLIER_AUTHORITY_AND_STATE_TRANSITIONS.md",
      "extensions/supplier-onboarding/governance/07_SUPPLIER_API_CONTRACTS.md",
      "extensions/01_SUPPLIER_ONBOARDING_CHARTER.md",
    ]
  ),
];

writeScorecard({
  auditId: "installer-onboarding",
  slug: "installer-onboarding",
  checks,
});
