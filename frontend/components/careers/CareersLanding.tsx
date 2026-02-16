"use client";

import { useMemo, useState } from "react";
import type { CareerJob } from "../../lib/careers/types";
import { careersCopy, careersFaq } from "../../data/careersConstants";
import CareersFilters, { CareerFilters } from "./CareersFilters";
import JobCard from "./JobCard";
import ApplicationForm from "./ApplicationForm";
import CareersFAQAccordion from "./CareersFAQAccordion";

interface CareersLandingProps {
  jobs: CareerJob[];
}

export default function CareersLanding({ jobs }: CareersLandingProps) {
  const [filters, setFilters] = useState<CareerFilters>({
    search: "",
    location: "",
    workType: "",
    team: "",
    seniority: "",
  });

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (
        filters.search &&
        !`${job.title} ${job.summary} ${job.team}`.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.location && !job.locations.includes(filters.location)) return false;
      if (filters.workType && job.workType !== filters.workType) return false;
      if (filters.team && job.team !== filters.team) return false;
      if (filters.seniority && job.seniority !== filters.seniority) return false;
      return true;
    });
  }, [jobs, filters]);

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="careers-hero">
        <div className="careers-hero-inner">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{careersCopy.heroTitle}</h1>
            <p className="text-base text-muted">{careersCopy.heroSubtitle}</p>
            <div className="careers-cta-group">
              <a href="#open-roles" className="px-5 py-3 rounded-md bg-brand-700 text-brand-100 font-semibold">
                {careersCopy.heroPrimaryCta}
              </a>
              <a href="#talent-pool" className="px-5 py-3 rounded-md border border-brand-600 text-brand-700">
                {careersCopy.heroSecondaryCta}
              </a>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{careersCopy.whyTitle}</h2>
          <div className="careers-grid">
            {careersCopy.whyCards.map((item) => (
              <div key={item} className="bg-surface rounded-2xl shadow-card border p-4 text-sm text-muted">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="open-roles" className="space-y-4">
          <h2 className="text-2xl font-semibold">{careersCopy.openRolesTitle}</h2>
          <div className="careers-roles-layout">
            <CareersFilters filters={filters} onChange={setFilters} />
            <div className="space-y-4">
              {filtered.length === 0 && (
                <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
                  No roles match your filters right now.
                </div>
              )}
              {filtered.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{careersCopy.hiringTitle}</h2>
          <div className="careers-grid">
            {careersCopy.hiringSteps.map((step, idx) => (
              <div key={step} className="bg-surface rounded-2xl shadow-card border p-4">
                <div className="text-xs uppercase tracking-wide text-muted">Step {idx + 1}</div>
                <div className="text-lg font-semibold text-strong">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="talent-pool" className="space-y-4">
          <h2 className="text-2xl font-semibold">{careersCopy.talentPoolTitle}</h2>
          <p className="text-base text-muted">{careersCopy.talentPoolSubtitle}</p>
          <p className="text-base text-muted">{careersCopy.talentPoolNote}</p>
          <ApplicationForm mode="talent_pool" />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{careersCopy.faqTitle}</h2>
          <CareersFAQAccordion items={careersFaq} />
        </section>
      </main>
      <div className="h-8" aria-hidden />
    </div>
  );
}
