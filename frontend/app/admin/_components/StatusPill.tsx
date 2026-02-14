type StatusPillTone = "green" | "red" | "amber" | "slate";

type StatusPillProps = {
  label: string;
  tone?: StatusPillTone;
};

const TONE_CLASS: Record<StatusPillTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

export default function StatusPill({ label, tone = "slate" }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]}`}>
      {label}
    </span>
  );
}
