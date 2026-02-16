interface Section {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

interface Meta {
  lastUpdated: string;
  version: string;
}

import type { ReactNode } from "react";

interface DocumentPageLayoutProps {
  title: string;
  subtitle: string;
  meta: Meta;
  sections: Section[];
  children?: ReactNode;
}

export default function DocumentPageLayout({ title, subtitle, meta, sections, children }: DocumentPageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="bg-brand-100 text-strong">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-3">
          <h1 className="text-2xl font-bold text-strong">{title}</h1>
          <p className="text-base text-muted">{subtitle}</p>
          <div className="text-sm text-muted">
            <span className="mr-4">Last Updated: {meta.lastUpdated}</span>
            <span>Version: {meta.version}</span>
          </div>
        </div>
      </section>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {sections.map((section) => (
          <article key={section.heading} className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
            <h2 className="text-xl font-semibold text-strong leading-tight">{section.heading}</h2>
            {section.paragraphs.map((p, idx) => (
              <p key={idx} className="text-base text-muted">
                {p}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-base text-muted">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
        {children}
      </main>
      <div className="h-8" aria-hidden />
    </div>
  );
}
