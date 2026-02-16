import type { CareerJob } from "../../lib/careers/types";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

export default function JobDetail({ job }: { job: CareerJob }) {
  return (
    <section className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
      <div className="space-y-4">
        <div className="text-sm text-muted">{job.team}</div>
        <h1 className="text-2xl font-bold text-strong">{job.title}</h1>
        <div className="text-sm text-muted">
          {job.locations.join(" · ")} · {job.workType} · {job.seniority}
        </div>
        <div className="text-sm text-muted">Posted {formatDate(job.postedAt)}</div>
        <p className="text-base text-muted">{job.summary}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-strong">About the role</h2>
        <p className="text-base text-muted">{job.sections.aboutRole}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-strong">Responsibilities</h2>
        <ul className="careers-list text-base text-muted">
          {job.sections.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-strong">Required skills</h2>
        <ul className="careers-list text-base text-muted">
          {job.sections.requiredSkills.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-strong">Nice-to-have</h2>
        <ul className="careers-list text-base text-muted">
          {job.sections.niceToHave.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {job.sections.regionNotes && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-strong">Region / time-zone notes</h2>
          <p className="text-base text-muted">{job.sections.regionNotes}</p>
        </div>
      )}

      {job.sections.assessment && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-strong">How we assess applications</h2>
          <p className="text-base text-muted">{job.sections.assessment}</p>
        </div>
      )}
    </section>
  );
}
