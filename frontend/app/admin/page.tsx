import MetricCard from "./_components/MetricCard";

const cards = [
  {
    label: "Control Surface",
    value: "Locked",
    helper: "RRE-BR-ADMIN-LOCK-v1.0",
  },
  {
    label: "Core Boundary",
    value: "Enforced",
    helper: "No immutable-core bypass",
  },
  {
    label: "Mutation Protocol",
    value: "Reason + Audit",
    helper: "Server-side RBAC required",
  },
  {
    label: "UI Rollout",
    value: "Phase B",
    helper: "Financial -> Governance -> Supply -> Risk -> Reports",
  },
];

export default function AdminOverviewPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <MetricCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
      ))}
    </div>
  );
}
