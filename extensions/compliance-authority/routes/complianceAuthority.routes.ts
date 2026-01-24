/**
 * Compliance Authority Routes
 * Case visibility only. No decisions permitted.
 */

import {
  projectComplianceCase
} from "../adapters/caseProjection.adapter";

import {
  projectDecisionHistory
} from "../adapters/decisionHistoryProjection.adapter";

import {
  issueComplianceDecisionSkeleton
} from "../decisions/decisionSkeleton";

function assertComplianceDecisionAuthority(
  req: any,
  res: any,
  requiredLevel: string
): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (auth.role !== "ComplianceAuthority") {
    res.status(403).json({ error: "COMPLIANCE_AUTHORITY_ROLE_REQUIRED" });
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

function assertComplianceAuthorityReadOnly(req: any, res: any): boolean {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return false;
  }

  if (auth.role !== "ComplianceAuthority") {
    res.status(403).json({ error: "COMPLIANCE_AUTHORITY_ROLE_REQUIRED" });
    return false;
  }

  return true;
}

export function registerComplianceAuthorityRoutes(app: any) {
  app.get("/compliance-authority/health", (_req: any, res: any) => {
    res.json({
      extension: "EXT-09",
      status: "READ_ONLY_ACTIVE"
    });
  });

  app.get("/compliance-authority/cases", (req: any, res: any) => {
    if (!assertComplianceAuthorityReadOnly(req, res)) return;

    const coreCases: any[] = []; // Core injection point (not implemented)

    const projections = coreCases.map(coreCase => ({
      case: projectComplianceCase(coreCase),
      decisions: projectDecisionHistory(coreCase.decisions)
    }));

    res.status(200).json({
      source: "CORE",
      cases: projections
    });
  });

  app.get("/compliance-authority/cases/:caseId", (req: any, res: any) => {
    if (!assertComplianceAuthorityReadOnly(req, res)) return;

    const coreCase = null; // Core injection point (not implemented)

    const projection = coreCase
      ? {
          case: projectComplianceCase(coreCase),
          decisions: projectDecisionHistory(coreCase.decisions)
        }
      : null;

    res.status(200).json({
      source: "CORE",
      case: projection
    });
  });

  app.post("/compliance-authority/cases/:caseId/decisions/approve", (req: any, res: any) => {
    if (!assertComplianceDecisionAuthority(req, res, "CA_L2")) return;

    const result = issueComplianceDecisionSkeleton({
      caseId: req.params.caseId,
      decisionType: "APPROVE",
      authorityLevel: req.auth.authorityLevel,
      rationale: req.body?.rationale
    });

    if (!result.accepted) {
      return res.status(400).json({ error: result.reason });
    }

    res.status(202).json({
      status: "DECISION_ACCEPTED",
      decisionType: "APPROVE",
      source: "COMPLIANCE_AUTHORITY"
    });
  });

  app.post("/compliance-authority/cases/:caseId/decisions/reject", (req: any, res: any) => {
    if (!assertComplianceDecisionAuthority(req, res, "CA_L2")) return;

    const result = issueComplianceDecisionSkeleton({
      caseId: req.params.caseId,
      decisionType: "REJECT",
      authorityLevel: req.auth.authorityLevel,
      rationale: req.body?.rationale
    });

    if (!result.accepted) {
      return res.status(400).json({ error: result.reason });
    }

    res.status(202).json({
      status: "DECISION_ACCEPTED",
      decisionType: "REJECT",
      source: "COMPLIANCE_AUTHORITY"
    });
  });

  app.post("/compliance-authority/cases/:caseId/decisions/suspend", (req: any, res: any) => {
    if (!assertComplianceDecisionAuthority(req, res, "CA_L3")) return;

    const result = issueComplianceDecisionSkeleton({
      caseId: req.params.caseId,
      decisionType: "SUSPEND",
      authorityLevel: req.auth.authorityLevel,
      rationale: req.body?.rationale
    });

    if (!result.accepted) {
      return res.status(400).json({ error: result.reason });
    }

    res.status(202).json({
      status: "DECISION_ACCEPTED",
      decisionType: "SUSPEND",
      source: "COMPLIANCE_AUTHORITY"
    });
  });

  app.post("/compliance-authority/cases/:caseId/decisions/revoke", (req: any, res: any) => {
    if (!assertComplianceDecisionAuthority(req, res, "CA_L3")) return;

    const result = issueComplianceDecisionSkeleton({
      caseId: req.params.caseId,
      decisionType: "REVOKE",
      authorityLevel: req.auth.authorityLevel,
      rationale: req.body?.rationale
    });

    if (!result.accepted) {
      return res.status(400).json({ error: result.reason });
    }

    res.status(202).json({
      status: "DECISION_ACCEPTED",
      decisionType: "REVOKE",
      source: "COMPLIANCE_AUTHORITY"
    });
  });
}
