/**
 * ComplianceAuthorityShell
 * Read-only UI wired to EXT-09 case routes.
 * No decisions, no mutations, no inferred state.
 */

import { useEffect, useState } from "react";
import {
  emitComplianceCaseListView
} from "../events/complianceAuthority.events";

type CaseProjection = {
  case: {
    caseId: string;
    caseType: string;
    state: string;
    triggerReason?: string;
  };
  decisions: {
    decisionId: string;
    decisionType: string;
    outcome: string;
    issuedBy: string;
    issuedAt: string;
  }[];
};

export default function ComplianceAuthorityShell() {
  const [cases, setCases] = useState<CaseProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCases() {
      try {
        const res = await fetch("/compliance-authority/cases");
        const data = await res.json();
        setCases(data.cases || []);
        emitComplianceCaseListView();
      } catch {
        setCases([]);
      } finally {
        setLoading(false);
      }
    }

    loadCases();
  }, []);

  if (loading) {
    return <p>Loading compliance cases…</p>;
  }

  if (!cases.length) {
    return <p>No compliance cases available.</p>;
  }

  return (
    <div>
      <h1>Compliance Cases</h1>

      <ul>
        {cases.map((item, index) => (
          <li key={index}>
            <strong>Case:</strong> {item.case.caseType}  
            <br />
            <strong>Status:</strong> {item.case.state}  
            <br />
            <strong>Trigger:</strong> {item.case.triggerReason}
            <br />
            <strong>Decisions:</strong> {item.decisions.length}
          </li>
        ))}
      </ul>
    </div>
  );
}
