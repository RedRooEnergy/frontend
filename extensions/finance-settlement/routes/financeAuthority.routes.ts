/**
 * Finance & Settlement Authority Routes
 * Financial case and escrow visibility only.
 */

import {
  projectFinancialCase
} from "../adapters/financialCaseProjection.adapter";

import {
  projectEscrow
} from "../adapters/escrowProjection.adapter";

import {
  projectSettlement
} from "../adapters/settlementProjection.adapter";

import {
  issueFinancialDecisionSkeleton
} from "../decisions/financialDecisionSkeleton";

function assertFinanceDecisionAuthority(
  req: any,
  res: any,
  requiredLevel: string
): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (auth.role !== "FinanceAuthority") {
    res.status(403).json({ error: "FINANCE_AUTHORITY_ROLE_REQUIRED" });
    return false;
  }

  if (!auth.authorityLevel) {
    res.status(403).json({ error: "AUTHORITY_LEVEL_REQUIRED" });
    return false;
  }

  if (auth.authorityLevel !== requiredLevel) {
    res.status(403).json({ error: "INSUFFICIENT_AUTHORITY_LEVEL" });
    return false;
  }

  return true;
}

function assertFinanceAuthorityReadOnly(req: any, res: any): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (auth.role !== "FinanceAuthority") {
    res.status(403).json({ error: "FINANCE_AUTHORITY_ROLE_REQUIRED" });
    return false;
  }

  return true;
}

export function registerFinanceAuthorityRoutes(app: any) {
  app.get("/finance/health", (_req: any, res: any) => {
    res.json({
      extension: "EXT-11",
      status: "READ_ONLY_ACTIVE"
    });
  });

  app.get("/finance/cases", (req: any, res: any) => {
    if (!assertFinanceAuthorityReadOnly(req, res)) return;

    const coreFinancialCases: any[] = []; // Core injection point (not implemented)

    const projections = coreFinancialCases.map(coreCase => ({
      case: projectFinancialCase(coreCase),
      escrow: projectEscrow(coreCase.escrow),
      settlement: projectSettlement(coreCase.settlement)
    }));

    res.status(200).json({
      source: "CORE",
      cases: projections
    });
  });

  app.get("/finance/cases/:caseId", (req: any, res: any) => {
    if (!assertFinanceAuthorityReadOnly(req, res)) return;

    const coreFinancialCase = null; // Core injection point (not implemented)

    const projection = coreFinancialCase
      ? {
          case: projectFinancialCase(coreFinancialCase),
          escrow: projectEscrow(coreFinancialCase.escrow),
          settlement: projectSettlement(coreFinancialCase.settlement)
        }
      : null;

    res.status(200).json({
      source: "CORE",
      case: projection
    });
  });

  app.post("/finance/cases/:caseId/decisions/escrow-release", (req: any, res: any) => {
    if (!assertFinanceDecisionAuthority(req, res, "FSA_L2")) return;

    const result = issueFinancialDecisionSkeleton({
      caseId: req.params.caseId,
      decisionType: "ESCROW_RELEASE",
      authorityLevel: req.auth.authorityLevel,
      rationale: req.body?.rationale
    });

    if (!result.accepted) {
      return res.status(400).json({ error: result.reason });
    }

    res.status(202).json({
      status: "DECISION_ACCEPTED",
      decisionType: "ESCROW_RELEASE",
      source: "FINANCE_AUTHORITY"
    });
  });

  app.post("/finance/cases/:caseId/decisions/refund", (req: any, res: any) => {
    if (!assertFinanceDecisionAuthority(req, res, "FSA_L2")) return;

    const result = issueFinancialDecisionSkeleton({
      caseId: req.params.caseId,
      decisionType: "REFUND",
      authorityLevel: req.auth.authorityLevel,
      rationale: req.body?.rationale
    });

    if (!result.accepted) {
      return res.status(400).json({ error: result.reason });
    }

    res.status(202).json({
      status: "DECISION_ACCEPTED",
      decisionType: "REFUND",
      source: "FINANCE_AUTHORITY"
    });
  });

  app.post("/finance/cases/:caseId/decisions/settlement-finalise", (req: any, res: any) => {
    if (!assertFinanceDecisionAuthority(req, res, "FSA_L3")) return;

    const result = issueFinancialDecisionSkeleton({
      caseId: req.params.caseId,
      decisionType: "SETTLEMENT_FINALISE",
      authorityLevel: req.auth.authorityLevel,
      rationale: req.body?.rationale
    });

    if (!result.accepted) {
      return res.status(400).json({ error: result.reason });
    }

    res.status(202).json({
      status: "DECISION_ACCEPTED",
      decisionType: "SETTLEMENT_FINALISE",
      source: "FINANCE_AUTHORITY"
    });
  });

  app.post("/finance/cases/:caseId/decisions/dispute-resolve", (req: any, res: any) => {
    if (!assertFinanceDecisionAuthority(req, res, "FSA_L3")) return;

    const result = issueFinancialDecisionSkeleton({
      caseId: req.params.caseId,
      decisionType: "DISPUTE_RESOLVE",
      authorityLevel: req.auth.authorityLevel,
      rationale: req.body?.rationale
    });

    if (!result.accepted) {
      return res.status(400).json({ error: result.reason });
    }

    res.status(202).json({
      status: "DECISION_ACCEPTED",
      decisionType: "DISPUTE_RESOLVE",
      source: "FINANCE_AUTHORITY"
    });
  });
}
