interface Section {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  afterBullets?: string[];
}

import type { ReactNode } from "react";

interface FooterPageLayoutProps {
  title: string;
  subtitle: string;
  sections: Section[];
  intro?: string[];
  children?: ReactNode;
}

export default function FooterPageLayout({ title, subtitle, sections, intro, children }: FooterPageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="bg-brand-100 text-strong">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-3">
          <h1 className="text-2xl font-bold text-strong">{title}</h1>
          <p className="text-base text-muted">{subtitle}</p>
        </div>
      </section>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {intro && intro.length > 0 && (
          <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
            {intro.map((p, idx) => (
              <p key={idx} className="text-base text-muted">
                {p}
              </p>
            ))}
          </article>
        )}
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
            {section.afterBullets && section.afterBullets.length > 0 && (
              <div className="space-y-3">
                {section.afterBullets.map((p, idx) => (
                  <p key={idx} className="text-base text-muted">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
        {children}
      </main>
      <div className="h-8" aria-hidden />
    </div>
  );
}
