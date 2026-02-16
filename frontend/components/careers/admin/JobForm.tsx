"use client";

import { useMemo, useState } from "react";
import {
  CAREER_LOCATIONS,
  CAREER_REGIONS,
  CAREER_SENIORITY,
  CAREER_TEAMS,
  CAREER_WORK_TYPES,
} from "../../../data/careersConstants";
import type { CareerJob, CareerRegion, CareerSeniority, CareerTeam, CareerWorkType } from "../../../lib/careers/types";
import { slugify } from "../../../lib/careers/utils";
import JobCard from "../JobCard";

interface JobFormProps {
  initial?: Partial<CareerJob>;
  onSubmit: (payload: Partial<CareerJob>) => Promise<void>;
  submitLabel: string;
}

export default function JobForm({ initial, onSubmit, submitLabel }: JobFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [refCode, setRefCode] = useState(initial?.refCode || "");
  const [team, setTeam] = useState<CareerTeam>(initial?.team || "Operations");
  const [locations, setLocations] = useState<string[]>(initial?.locations || []);
  const [regionTag, setRegionTag] = useState<CareerRegion>(initial?.regionTag || "AU");
  const [workType, setWorkType] = useState<CareerWorkType>(initial?.workType || "Full-time");
  const [seniority, setSeniority] = useState<CareerSeniority>(initial?.seniority || "Mid");
  const [summary, setSummary] = useState(initial?.summary || "");
  const [aboutRole, setAboutRole] = useState(initial?.sections?.aboutRole || "");
  const [responsibilities, setResponsibilities] = useState((initial?.sections?.responsibilities || []).join("\n"));
  const [requiredSkills, setRequiredSkills] = useState((initial?.sections?.requiredSkills || []).join("\n"));
  const [niceToHave, setNiceToHave] = useState((initial?.sections?.niceToHave || []).join("\n"));
  const [regionNotes, setRegionNotes] = useState(initial?.sections?.regionNotes || "");
  const [assessment, setAssessment] = useState(initial?.sections?.assessment || "");
  const [compMin, setCompMin] = useState(initial?.compensationMin?.toString() || "");
  const [compMax, setCompMax] = useState(initial?.compensationMax?.toString() || "");
  const [currency, setCurrency] = useState(initial?.currency || "AUD");
  const [status, setStatus] = useState<CareerJob["status"]>(initial?.status || "draft");
  const [featured, setFeatured] = useState(initial?.featured || false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleLocation = (loc: string) => {
    setLocations((prev) => (prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]));
  };

  const computedSlug = useMemo(() => slugify(title), [title]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Partial<CareerJob> = {
        ...initial,
        title,
        slug: slugTouched ? slug : computedSlug,
        refCode: refCode || initial?.refCode,
        team,
        locations,
        regionTag,
        workType,
        seniority,
        summary,
        sections: {
          aboutRole,
          responsibilities: responsibilities
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          requiredSkills: requiredSkills
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          niceToHave: niceToHave
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          regionNotes,
          assessment,
        },
        compensationMin: compMin ? Number(compMin) : undefined,
        compensationMax: compMax ? Number(compMax) : undefined,
        currency,
        status,
        featured,
      };
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewJob = useMemo(
    () =>
      ({
        id: initial?.id || "preview",
        title: title || "Role title",
        slug: slugTouched ? slug : computedSlug,
        refCode: refCode || "RRE-REF-XXXX",
        team,
        locations: locations.length ? locations : ["Remote"],
        regionTag,
        workType,
        seniority,
        summary: summary || "Summary will appear here.",
        sections: {
          aboutRole: aboutRole || "",
          responsibilities: responsibilities ? responsibilities.split("\n").filter(Boolean) : [],
          requiredSkills: requiredSkills ? requiredSkills.split("\n").filter(Boolean) : [],
          niceToHave: niceToHave ? niceToHave.split("\n").filter(Boolean) : [],
          regionNotes: regionNotes || "",
          assessment: assessment || "",
        },
        compensationMin: compMin ? Number(compMin) : undefined,
        compensationMax: compMax ? Number(compMax) : undefined,
        currency,
        status,
        featured,
        postedAt: initial?.postedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as CareerJob),
    [
      aboutRole,
      assessment,
      compMax,
      compMin,
      computedSlug,
      currency,
      featured,
      initial?.id,
      initial?.postedAt,
      locations,
      niceToHave,
      regionNotes,
      regionTag,
      requiredSkills,
      responsibilities,
      refCode,
      seniority,
      slug,
      slugTouched,
      status,
      summary,
      team,
      title,
      workType,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
        <div className="text-lg font-semibold">Role details</div>
        <div className="careers-form-grid">
          <div className="careers-field">
            <label className="text-sm font-medium">Job title *</label>
            <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Slug (auto)</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={slugTouched ? slug : computedSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
            <div className="text-xs text-muted">Auto-generated from the title. Edit if needed.</div>
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Reference code</label>
            <input className="w-full border rounded-md px-3 py-2" value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="Auto-generated if blank" />
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Team *</label>
            <select className="w-full border rounded-md px-3 py-2" value={team} onChange={(e) => setTeam(e.target.value as CareerTeam)}>
              {CAREER_TEAMS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Region tag *</label>
            <select className="w-full border rounded-md px-3 py-2" value={regionTag} onChange={(e) => setRegionTag(e.target.value as CareerRegion)}>
              {CAREER_REGIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Work type *</label>
            <select className="w-full border rounded-md px-3 py-2" value={workType} onChange={(e) => setWorkType(e.target.value as CareerWorkType)}>
              {CAREER_WORK_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Seniority *</label>
            <select className="w-full border rounded-md px-3 py-2" value={seniority} onChange={(e) => setSeniority(e.target.value as CareerSeniority)}>
              {CAREER_SENIORITY.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Status *</label>
            <select className="w-full border rounded-md px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as CareerJob["status"])}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="careers-field">
          <label className="text-sm font-medium">Locations *</label>
          <div className="careers-location-grid">
            {CAREER_LOCATIONS.map((loc) => (
              <label key={loc} className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={locations.includes(loc)} onChange={() => toggleLocation(loc)} />
                {loc}
              </label>
            ))}
          </div>
          <div className="text-xs text-muted">Select all locations that apply, including Remote if relevant.</div>
        </div>

        <div className="careers-field">
          <label className="text-sm font-medium">Summary (card blurb)</label>
          <textarea className="w-full border rounded-md px-3 py-2" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          <div className="text-xs text-muted">This appears on the public job card.</div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
        <div className="text-lg font-semibold">Role content</div>
        <div className="careers-field">
          <label className="text-sm font-medium">About the role</label>
          <textarea className="w-full border rounded-md px-3 py-2" rows={4} value={aboutRole} onChange={(e) => setAboutRole(e.target.value)} />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium">Responsibilities (one per line)</label>
          <textarea className="w-full border rounded-md px-3 py-2" rows={4} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium">Required skills (one per line)</label>
          <textarea className="w-full border rounded-md px-3 py-2" rows={4} value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium">Nice-to-have (one per line)</label>
          <textarea className="w-full border rounded-md px-3 py-2" rows={4} value={niceToHave} onChange={(e) => setNiceToHave(e.target.value)} />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium">Region/time-zone notes</label>
          <textarea className="w-full border rounded-md px-3 py-2" rows={3} value={regionNotes} onChange={(e) => setRegionNotes(e.target.value)} />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium">How we assess applications</label>
          <textarea className="w-full border rounded-md px-3 py-2" rows={3} value={assessment} onChange={(e) => setAssessment(e.target.value)} />
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
        <div className="text-lg font-semibold">Compensation (optional)</div>
        <div className="careers-form-grid">
          <div className="careers-field">
            <label className="text-sm font-medium">Minimum</label>
            <input className="w-full border rounded-md px-3 py-2" value={compMin} onChange={(e) => setCompMin(e.target.value)} />
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Maximum</label>
            <input className="w-full border rounded-md px-3 py-2" value={compMax} onChange={(e) => setCompMax(e.target.value)} />
          </div>
          <div className="careers-field">
            <label className="text-sm font-medium">Currency</label>
            <input className="w-full border rounded-md px-3 py-2" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Featured role
        </label>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
        <div className="text-lg font-semibold">Preview</div>
        <JobCard job={previewJob} />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold" disabled={saving}>
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
