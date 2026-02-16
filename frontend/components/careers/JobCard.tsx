import Link from "next/link";
import type { CareerJob } from "../../lib/careers/types";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

export default function JobCard({ job }: { job: CareerJob }) {
  return (
    <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-4">
      <div className="space-y-4">
        <div className="text-lg font-semibold text-strong">{job.title}</div>
        <div className="text-sm text-muted">
          {job.locations.join(" · ")} · {job.workType}
        </div>
        <div className="text-sm text-muted">
          {job.team} · Posted {formatDate(job.postedAt)}
        </div>
        <p className="text-sm text-muted">{job.summary}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wide">{job.seniority}</span>
        <Link
          href={`/careers/${job.slug}`}
          className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold"
        >
          View role
        </Link>
      </div>
    </div>
  );
}
