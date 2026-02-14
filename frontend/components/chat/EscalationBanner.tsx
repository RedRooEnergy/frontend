"use client";

type Props = {
  status: "OPEN" | "ESCALATED" | "LOCKED" | "ARCHIVED";
  caseId: string | null;
  lockReason?: string;
};

export default function EscalationBanner({ status, caseId }: Props) {
  if (status !== "ESCALATED" && status !== "LOCKED") return null;

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${status === "LOCKED" ? "bg-rose-100 border-rose-200 text-rose-800" : "bg-amber-100 border-amber-200 text-amber-800"}`}>
      <div className="font-semibold">
        {status === "LOCKED" ? "Thread locked by admin" : "Thread escalated"}
      </div>
      {caseId && <div className="text-xs mt-1">Linked case: {caseId}</div>}
    </div>
  );
}
