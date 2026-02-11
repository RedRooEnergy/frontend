import { buildCheck, fileContains, fileExists, writeScorecard } from "../governance/auditRunner";

const checks = [
  buildCheck(
    "BUYER-01",
    "Public entry exposes buyer onboarding start",
    fileExists("frontend/app/page.tsx") && fileContains("frontend/app/page.tsx", "Buyers"),
    "Homepage includes explicit buyer entry content.",
    "Buyer entry content is missing from homepage.",
    ["frontend/app/page.tsx"]
  ),
  buildCheck(
    "BUYER-02",
    "Account/session bootstrap yields buyer workspace access",
    fileExists("frontend/app/buyer/dashboard/page.tsx") && fileExists("frontend/app/buyer/orders/page.tsx"),
    "Buyer dashboard and orders workspace surfaces are present.",
    "Buyer workspace routes are incomplete.",
    ["frontend/app/buyer/dashboard/page.tsx", "frontend/app/buyer/orders/page.tsx"]
  ),
  buildCheck(
    "BUYER-03",
    "Buyer terms/governance controls are explicitly documented",
    fileExists("extensions/buyer/governance/05_BUYER_AUTHORIZATION_RULES.md") &&
      fileExists("extensions/buyer/governance/07_BUYER_API_CONTRACTS.md"),
    "Buyer authorization and API governance docs are present.",
    "Buyer governance docs for authorization/API contracts are missing.",
    ["extensions/buyer/governance/05_BUYER_AUTHORIZATION_RULES.md", "extensions/buyer/governance/07_BUYER_API_CONTRACTS.md"]
  ),
  buildCheck(
    "BUYER-04",
    "Checkout progression remains enforcement-controlled",
    fileContains("frontend/app/buyer/orders/page.tsx", "Actions controlled by backend") &&
      fileContains("frontend/app/buyer/order/[id]/page.tsx", "Status is read-only from enforcement"),
    "Buyer order surfaces explicitly reflect backend-enforced progression.",
    "Buyer order surfaces do not reflect backend-enforced progression.",
    ["frontend/app/buyer/orders/page.tsx", "frontend/app/buyer/order/[id]/page.tsx"]
  ),
  buildCheck(
    "BUYER-05",
    "Order projection invariants are modelled deterministically",
    fileExists("extensions/buyer/adapters/orderProjection.adapter.ts") &&
      fileContains("extensions/buyer/adapters/orderProjection.adapter.ts", "projectOrderForBuyer"),
    "Buyer order projection adapter exists with deterministic mapping.",
    "Buyer order projection adapter is missing or incomplete.",
    ["extensions/buyer/adapters/orderProjection.adapter.ts"]
  ),
  buildCheck(
    "BUYER-06",
    "Payment and escrow governance contracts exist",
    fileExists("extensions/payments-escrow/02_LIFECYCLE_STATES.md") &&
      fileExists("extensions/payments-escrow/05_DATA_MODEL.md") &&
      fileExists("extensions/finance-settlement/FINANCIAL_CASE_ESCROW_AND_SETTLEMENT_MODEL.md"),
    "Payment and escrow lifecycle documentation is present across payment and settlement extensions.",
    "Payment and escrow governance contracts are incomplete.",
    [
      "extensions/payments-escrow/02_LIFECYCLE_STATES.md",
      "extensions/payments-escrow/05_DATA_MODEL.md",
      "extensions/finance-settlement/FINANCIAL_CASE_ESCROW_AND_SETTLEMENT_MODEL.md",
    ]
  ),
  buildCheck(
    "BUYER-07",
    "Buyer evidence projection and isolation contracts exist",
    fileExists("extensions/buyer/adapters/documentProjection.adapter.ts") &&
      fileContains("frontend/app/buyer/documents/page.tsx", "Documents are read-only"),
    "Buyer document projection adapter and read-only evidence UI are present.",
    "Buyer document projection or read-only evidence surface is missing.",
    ["extensions/buyer/adapters/documentProjection.adapter.ts", "frontend/app/buyer/documents/page.tsx"]
  ),
  buildCheck(
    "BUYER-08",
    "Admin replay and immutable audit visibility are present",
    fileContains("frontend/app/admin/audit/page.tsx", "append-only and immutable") &&
      fileContains("frontend/app/admin/dashboard/page.tsx", "Read-only indicator"),
    "Admin oversight surfaces expose immutable audit visibility controls.",
    "Admin oversight surfaces do not demonstrate immutable audit visibility controls.",
    ["frontend/app/admin/audit/page.tsx", "frontend/app/admin/dashboard/page.tsx"]
  ),
];

writeScorecard({
  auditId: "buyer-onboarding",
  slug: "buyer-onboarding",
  checks,
});
