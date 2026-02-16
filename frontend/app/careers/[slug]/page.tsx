import { notFound } from "next/navigation";
import JobDetail from "../../../components/careers/JobDetail";
import ApplicationForm from "../../../components/careers/ApplicationForm";
import { getJobBySlug } from "../../../lib/careers/store";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

export default async function JobDetailPage({ params }: { params: { slug: string } }) {
  const job = await getJobBySlug(params.slug);
  if (!job || job.status !== "published") return notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3001";
  const shareUrl = `${baseUrl}/careers/${job.slug}`;

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <a href="/careers" className="text-sm text-muted">
            ← Back to careers
          </a>
          <a href="#apply" className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
            Apply now
          </a>
        </div>

        <div className="careers-detail-layout">
          <div className="space-y-6">
            <JobDetail job={job} />
            <section id="apply" className="space-y-4">
              <ApplicationForm mode="job" jobId={job.id} jobSlug={job.slug} jobTitle={job.title} />
            </section>
          </div>
          <aside className="careers-detail-sidebar">
            <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-4">
              <div className="text-sm text-muted">Role summary</div>
              <div className="text-base font-semibold text-strong">{job.title}</div>
              <div className="text-sm text-muted">{job.locations.join(" · ")}</div>
              <div className="text-sm text-muted">{job.workType}</div>
              <div className="text-sm text-muted">{job.team}</div>
              <div className="text-sm text-muted">Ref code: {job.refCode}</div>
              <div className="text-sm text-muted">Posted {formatDate(job.postedAt)}</div>
              {job.compensationMin && job.compensationMax && (
                <div className="text-sm text-muted">
                  {job.currency || "AUD"} {job.compensationMin}–{job.compensationMax}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-4">
              <div className="text-sm text-muted">Share</div>
              <div className="careers-stack-sm">
                <a
                  className="text-sm text-brand-700"
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
                <a
                  className="text-sm text-brand-700"
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  X (Twitter)
                </a>
                <a className="text-sm text-brand-700" href={`mailto:?subject=${job.title}&body=${shareUrl}`}>
                  Email
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <div className="h-8" aria-hidden />
    </div>
  );
}
