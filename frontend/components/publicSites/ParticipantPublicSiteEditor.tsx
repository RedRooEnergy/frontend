"use client";

import { useEffect, useState } from "react";

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function defaultTemplate(entityType: string, slug: string) {
  const base: any = {
    homepage: {
      title: `${slug} profile`,
      subtitle: "",
      overview: "",
    },
    contact: { info: "Contact via RRE" },
    terms: { summary: "Standard platform terms apply." },
  };
  if (entityType === "SUPPLIER" || entityType === "INSURANCE") base.products = { summary: "" };
  if (entityType === "INSTALLER" || entityType === "CERTIFIER") base.services = { summary: "" };
  if (entityType === "SUPPLIER" || entityType === "INSTALLER") base.warranty = { summary: "" };
  return base;
}

export default function ParticipantPublicSiteEditor({
  entityId,
  entityType,
  slug,
}: {
  entityId: string;
  entityType: string;
  slug: string;
}) {
  const [contentText, setContentText] = useState(JSON.stringify(defaultTemplate(entityType, slug), null, 2));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function loadDraft() {
      try {
        const payload = await jsonRequest(
          `/api/admin/public-sites/snapshots?entityId=${encodeURIComponent(entityId)}&entityType=${encodeURIComponent(entityType)}`
        );
        const draft = (payload.rows || []).find((row: any) => row.status === "DRAFT");
        if (draft?.contentJSON) {
          setContentText(JSON.stringify(draft.contentJSON, null, 2));
        }
      } catch {
        // Keep template if no draft exists.
      }
    }
    void loadDraft();
  }, [entityId, entityType]);

  async function saveDraft() {
    setBusy(true);
    setMessage("");
    try {
      const contentJSON = JSON.parse(contentText);
      await jsonRequest("/api/admin/public-sites/draft/upsert", {
        method: "POST",
        body: JSON.stringify({
          entityId,
          entityType,
          contentJSON,
          desiredSlug: slug,
          seoMeta: {
            title: contentJSON?.homepage?.title || slug,
            description: contentJSON?.homepage?.subtitle || `${entityType} profile`,
          },
        }),
      });
      setMessage("Draft saved for admin review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save draft");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Public Site Draft Editor</h2>
        <p className="text-sm text-slate-400">You can edit draft content. Publishing is admin-only.</p>
      </header>

      <textarea
        className="h-96 w-full rounded border border-slate-700 bg-slate-950 p-3 font-mono text-xs"
        value={contentText}
        onChange={(event) => setContentText(event.target.value)}
      />

      <button className="rounded border px-3 py-2 text-sm font-semibold" onClick={saveDraft} disabled={busy}>
        Save Draft
      </button>

      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </section>
  );
}
