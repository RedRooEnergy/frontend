/**
 * FinanceAuthorityShell
 * Read-only UI wired to EXT-11 finance routes.
 * No decisions, no mutations, no inferred state.
 */

import { useEffect, useState } from "react";
import {
  emitFinancialCaseListView
} from "../events/finance.events";

type FinancialCaseProjection = {
  case: {
    caseId: string;
    caseType: string;
    state: string;
    pricingSnapshotRef: string;
  };
  escrow: {
    escrowId: string;
    amount: number;
    currency: string;
    state: string;
  } | null;
  settlement: {
    settlementId: string;
    amount: number;
    currency: string;
    state: string;
  } | null;
};

export default function FinanceAuthorityShell() {
  const [cases, setCases] = useState<FinancialCaseProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCases() {
      try {
        const res = await fetch("/finance/cases");
        const data = await res.json();
        setCases(data.cases || []);
        emitFinancialCaseListView();
      } catch {
        setCases([]);
      } finally {
        setLoading(false);
      }
    }

    loadCases();
  }, []);

  if (loading) {
    return <p>Loading financial cases…</p>;
  }

  if (!cases.length) {
    return <p>No financial cases available.</p>;
  }

  return (
    <div>
      <h1>Financial Cases</h1>

      <ul>
        {cases.map((item, index) => (
          <li key={index}>
            <strong>Case:</strong> {item.case.caseType}  
            <br />
            <strong>Status:</strong> {item.case.state}  
            <br />
            <strong>Pricing Snapshot:</strong> {item.case.pricingSnapshotRef}
            <br />
            <strong>Escrow:</strong>{" "}
            {item.escrow ? `${item.escrow.amount} ${item.escrow.currency} (${item.escrow.state})` : "—"}
            <br />
            <strong>Settlement:</strong>{" "}
            {item.settlement ? `${item.settlement.amount} ${item.settlement.currency} (${item.settlement.state})` : "—"}
          </li>
        ))}
      </ul>
    </div>
  );
}
