import type { FinancialConfigResponse } from "../../../../types/adminDashboard";
import StatusPill from "../../_components/StatusPill";

type FinancialConfigCardsProps = {
  config: FinancialConfigResponse;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-b-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function ConfigCard({
  title,
  item,
}: {
  title: string;
  item: FinancialConfigResponse["feeConfig"];
}) {
  if (!item) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <StatusPill label="NOT CONFIGURED" tone="amber" />
        </div>
        <p className="text-sm text-slate-600">No active version detected.</p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <StatusPill label={item.status} tone={item.status === "ACTIVE" ? "green" : "slate"} />
      </div>
      <Row label="Active version" value={String(item.version)} />
      <Row label="Effective from" value={new Date(item.effectiveFrom).toLocaleString()} />
      <Row label="Created" value={new Date(item.createdAt).toLocaleString()} />
      <Row label="Canonical hash" value={item.canonicalHash} />
      <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-600">
        Previous versions: endpoint not wired in Phase B1. Read-only placeholder retained by governance design.
      </div>
    </article>
  );
}

export default function FinancialConfigCards({ config }: FinancialConfigCardsProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <ConfigCard title="Platform Fee Configuration" item={config.feeConfig} />
      <ConfigCard title="FX Policy" item={config.fxPolicy} />
      <ConfigCard title="Escrow Policy" item={config.escrowPolicy} />
    </section>
  );
}
