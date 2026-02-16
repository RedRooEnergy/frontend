"use client";

import { useMemo, useState } from "react";
import {
  CAREER_SOURCES,
  CAREER_TEAMS,
  CAREER_WORK_RIGHTS,
  careersFormCopy,
  careersFormLabels,
} from "../../data/careersConstants";
import type { CareerAttachment } from "../../lib/careers/types";
import FileUploader from "./FileUploader";

interface ApplicationFormProps {
  mode: "job" | "talent_pool";
  jobId?: string;
  jobSlug?: string;
  jobTitle?: string;
}

export default function ApplicationForm({ mode, jobId, jobSlug, jobTitle }: ApplicationFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{ referenceId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<CareerAttachment[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaEnabled = process.env.NEXT_PUBLIC_CAREERS_CAPTCHA_ENABLED === "true";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    locationCity: "",
    locationCountry: "",
    workRights: "",
    roleOfInterest: jobTitle || "",
    linkedinUrl: "",
    portfolioUrl: "",
    salaryExpectation: "",
    startDate: "",
    coverLetterText: "",
    source: "",
    consent: false,
  });

  const resumeFiles = useMemo(() => attachments.filter((a) => a.kind === "resume"), [attachments]);
  const coverFiles = useMemo(() => attachments.filter((a) => a.kind === "cover_letter"), [attachments]);
  const supportingFiles = useMemo(() => attachments.filter((a) => a.kind === "supporting"), [attachments]);

  const addAttachment = (attachment: CareerAttachment) => {
    setAttachments((prev) => [...prev, attachment]);
  };

  const removeAttachment = (storageKey: string) => {
    setAttachments((prev) => prev.filter((file) => file.storageKey !== storageKey));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/careers/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode === "job" ? "job" : "talent_pool",
          jobId: mode === "job" ? jobId : null,
          jobSlug: mode === "job" ? jobSlug : null,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          locationCity: form.locationCity,
          locationCountry: form.locationCountry,
          workRights: form.workRights,
          roleOfInterest: mode === "job" ? jobTitle || form.roleOfInterest : form.roleOfInterest,
          linkedinUrl: form.linkedinUrl,
          portfolioUrl: form.portfolioUrl,
          salaryExpectation: form.salaryExpectation,
          startDate: form.startDate,
          coverLetterText: form.coverLetterText,
          source: form.source,
          consent: form.consent,
          attachments,
          honeypot,
          captchaToken: captchaEnabled ? captchaToken : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err?.error || "Submission failed");
        setLoading(false);
        return;
      }

      const result = await res.json();
      setSubmitted({ referenceId: result.referenceId });
    } catch (err: any) {
      setError(err?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
        <div className="text-xl font-semibold text-strong">{careersFormCopy.successTitle}</div>
        <div className="text-sm text-muted">{careersFormCopy.successBody}</div>
        <div className="text-sm text-strong">
          Reference ID: <span className="font-semibold">{submitted.referenceId}</span>
        </div>
        <div className="text-sm text-muted">We will be in touch if there is a match.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
      <div className="text-xl font-semibold text-strong">
        {mode === "job" ? careersFormCopy.sectionTitle : careersFormCopy.talentPoolTitle}
      </div>
      <div className="careers-form-grid">
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="firstName">
            {careersFormLabels.firstName} *
          </label>
          <input
            id="firstName"
            className="w-full border rounded-md px-3 py-2"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="lastName">
            {careersFormLabels.lastName} *
          </label>
          <input
            id="lastName"
            className="w-full border rounded-md px-3 py-2"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="email">
            {careersFormLabels.email} *
          </label>
          <input
            id="email"
            type="email"
            className="w-full border rounded-md px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="phone">
            {careersFormLabels.phone}
          </label>
          <input
            id="phone"
            className="w-full border rounded-md px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="locationCity">
            {careersFormLabels.locationCity} *
          </label>
          <input
            id="locationCity"
            className="w-full border rounded-md px-3 py-2"
            value={form.locationCity}
            onChange={(e) => setForm({ ...form, locationCity: e.target.value })}
            required
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="locationCountry">
            {careersFormLabels.locationCountry} *
          </label>
          <input
            id="locationCountry"
            className="w-full border rounded-md px-3 py-2"
            value={form.locationCountry}
            onChange={(e) => setForm({ ...form, locationCountry: e.target.value })}
            required
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="workRights">
            {careersFormLabels.workRights} *
          </label>
          <select
            id="workRights"
            className="w-full border rounded-md px-3 py-2"
            value={form.workRights}
            onChange={(e) => setForm({ ...form, workRights: e.target.value })}
            required
          >
            <option value="">Select work rights</option>
            {CAREER_WORK_RIGHTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="roleOfInterest">
            {careersFormLabels.roleOfInterest} *
          </label>
          {mode === "job" ? (
            <input
              id="roleOfInterest"
              className="w-full border rounded-md px-3 py-2 bg-surface-muted"
              value={jobTitle || form.roleOfInterest}
              readOnly
            />
          ) : (
            <select
              id="roleOfInterest"
              className="w-full border rounded-md px-3 py-2"
              value={form.roleOfInterest}
              onChange={(e) => setForm({ ...form, roleOfInterest: e.target.value })}
              required
            >
              <option value="">Select area of interest</option>
              {CAREER_TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="linkedinUrl">
            {careersFormLabels.linkedinUrl}
          </label>
          <input
            id="linkedinUrl"
            className="w-full border rounded-md px-3 py-2"
            value={form.linkedinUrl}
            onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="portfolioUrl">
            {careersFormLabels.portfolioUrl}
          </label>
          <input
            id="portfolioUrl"
            className="w-full border rounded-md px-3 py-2"
            value={form.portfolioUrl}
            onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="salaryExpectation">
            {careersFormLabels.salaryExpectation}
          </label>
          <input
            id="salaryExpectation"
            className="w-full border rounded-md px-3 py-2"
            value={form.salaryExpectation}
            onChange={(e) => setForm({ ...form, salaryExpectation: e.target.value })}
          />
        </div>
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="startDate">
            {careersFormLabels.startDate}
          </label>
          <input
            id="startDate"
            type="date"
            className="w-full border rounded-md px-3 py-2"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </div>
      </div>

      <div className="careers-field">
        <label className="text-sm font-medium" htmlFor="coverLetterText">
          {careersFormLabels.coverLetterText}
        </label>
        <textarea
          id="coverLetterText"
          className="w-full border rounded-md px-3 py-2"
          rows={4}
          value={form.coverLetterText}
          onChange={(e) => setForm({ ...form, coverLetterText: e.target.value })}
        />
      </div>

      <div className="careers-form-grid">
        <FileUploader
          kind="resume"
          label={careersFormLabels.resume}
          required={mode === "job"}
          maxFiles={1}
          attachments={resumeFiles}
          onAdd={addAttachment}
          onRemove={removeAttachment}
        />
        <FileUploader
          kind="cover_letter"
          label={careersFormLabels.coverLetterFile}
          required={false}
          maxFiles={1}
          attachments={coverFiles}
          onAdd={addAttachment}
          onRemove={removeAttachment}
        />
        <FileUploader
          kind="supporting"
          label={careersFormLabels.supportingDocs}
          required={false}
          maxFiles={3}
          attachments={supportingFiles}
          onAdd={addAttachment}
          onRemove={removeAttachment}
        />
      </div>

      <div className="careers-form-grid">
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="source">
            {careersFormLabels.source}
          </label>
          <select
            id="source"
            className="w-full border rounded-md px-3 py-2"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          >
            <option value="">Select source</option>
            {CAREER_SOURCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="careers-field">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => setForm({ ...form, consent: e.target.checked })}
          />
          {careersFormCopy.consentLabel}
        </label>
      </div>

      <div style={{ position: "absolute", left: "-10000px", top: "auto" }} aria-hidden>
        <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} />
      </div>

      {captchaEnabled && (
        <div className="careers-field">
          <label className="text-sm font-medium" htmlFor="captchaToken">
            CAPTCHA token
          </label>
          <input
            id="captchaToken"
            className="w-full border rounded-md px-3 py-2"
            value={captchaToken}
            onChange={(e) => setCaptchaToken(e.target.value)}
          />
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
      <button
        type="submit"
        className="px-6 py-3 rounded-md font-medium bg-brand-700 text-brand-100 hover:bg-brand-700"
        disabled={loading}
      >
        {loading ? "Submitting..." : mode === "job" ? careersFormCopy.submitJob : careersFormCopy.submitTalent}
      </button>
    </form>
  );
}
