import type { SettlementHold } from "../../../../types/adminDashboard";
import HoldsTable from "../../financial/_components/HoldsTable";

type HoldsPanelProps = {
  holds: SettlementHold[];
};

export default function HoldsPanel({ holds }: HoldsPanelProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-slate-900">Operational Holds (Live)</h3>
      <p className="text-sm text-slate-600">Read-only hold visibility reused from financial control endpoint.</p>
      <HoldsTable holds={holds} />
    </section>
  );
}
