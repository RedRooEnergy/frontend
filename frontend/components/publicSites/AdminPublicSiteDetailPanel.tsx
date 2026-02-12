"use client";

import { useEffect, useMemo, useState } from "react";

type SnapshotRow = {
  id: string;
  entityId: string;
  entityType: string;
  version: number;
  status: string;
  contentJSON: Record<string, unknown>;
  renderedHash: string | null;
  publishedAt: string | null;
};

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function initialContent(entityType: string) {
  const base: any = {
    homepage: { title: `${entityType} profile`, subtitle: "", overview: "" },
    contact: { info: "" },
    terms: { summary: "" },
  };
  if (entityType === "SUPPLIER" || entityType === "INSURANCE") base.products = { summary: "" };
  if (entityType === "INSTALLER" || entityType === "CERTIFIER") base.services = { summary: "" };
  if (entityType === "SUPPLIER" || entityType === "INSTALLER") base.warranty = { summary: "" };
  return base;
}

export default function AdminPublicSiteDetailPanel({ entityId, entityType }: { entityId: string; entityType: string }) {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [contentJsonText, setContentJsonText] = useState(JSON.stringify(initialContent(entityType), null, 2));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const latestDraft = useMemo(
    () => snapshots.find((item) => item.status === "DRAFT") || snapshots.sort((a, b) => b.version - a.version)[0],
    [snapshots]
  );

  async function refresh() {
    const payload = await jsonRequest(
      `/api/admin/public-sites/snapshots?entityId=${encodeURIComponent(entityId)}&entityType=${encodeURIComponent(entityType)}`
    );
    const rows = payload.rows || [];
    setSnapshots(rows);

    const draft = rows.find((item: SnapshotRow) => item.status === "DRAFT") || rows[0];
    if (draft?.contentJSON) {
      setContentJsonText(JSON.stringify(draft.contentJSON, null, 2));
    }
  }

  useEffect(() => {
    void refresh();
  }, [entityId, entityType]);

  async function saveDraft() {
    setBusy(true);
    setMessage("");
    try {
      const contentJSON = JSON.parse(contentJsonText);
      await jsonRequest("/api/admin/public-sites/draft/upsert", {
        method: "POST",
        body: JSON.stringify({
          entityId,
          entityType,
          contentJSON,
          seoMeta: {
            title: contentJSON?.homepage?.title || `${entityType} profile`,
            description: contentJSON?.homepage?.subtitle || `${entityType} participant profile`,
          },
        }),
      });
      await refresh();
      setMessage("Draft saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save draft");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest("/api/admin/public-sites/publish", {
        method: "POST",
        body: JSON.stringify({ entityId, entityType }),
      });
      await refresh();
      setMessage("Published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  async function suspend() {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest("/api/admin/public-sites/suspend", {
        method: "POST",
        body: JSON.stringify({ entityId, entityType }),
      });
      await refresh();
      setMessage("Suspended.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to suspend");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-lg font-semibold">Draft Editor</h3>
        <p className="text-xs text-slate-400">JSON schema-driven content only. Publishing creates immutable snapshot hash.</p>

        <textarea
          className="mt-3 h-80 w-full rounded border border-slate-700 bg-slate-950 p-3 font-mono text-xs"
          value={contentJsonText}
          onChange={(event) => setContentJsonText(event.target.value)}
        />

        <div className="mt-3 flex gap-2">
          <button className="rounded border px-3 py-2 text-sm" onClick={saveDraft} disabled={busy}>
            Save draft
          </button>
          <button className="rounded border px-3 py-2 text-sm" onClick={publish} disabled={busy}>
            Publish
          </button>
          <button className="rounded border px-3 py-2 text-sm" onClick={suspend} disabled={busy}>
            Suspend
          </button>
        </div>
        {message ? <p className="mt-2 text-sm text-slate-300">{message}</p> : null}
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-lg font-semibold">Version History</h3>
        <div className="max-h-72 overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="p-2">Version</th>
                <th className="p-2">Status</th>
                <th className="p-2">Published</th>
                <th className="p-2">Hash</th>
                <th className="p-2">Export</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="p-2">{row.version}</td>
                  <td className="p-2">{row.status}</td>
                  <td className="p-2">{row.publishedAt || "-"}</td>
                  <td className="p-2 font-mono">{row.renderedHash || "-"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <a
                        className="underline"
                        href={`/api/admin/public-sites/snapshots/${encodeURIComponent(row.id)}/export?format=json`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        JSON
                      </a>
                      <a
                        className="underline"
                        href={`/api/admin/public-sites/snapshots/${encodeURIComponent(row.id)}/export?format=pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {latestDraft ? (
          <div className="mt-4 rounded border border-slate-700 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Current snapshot payload</p>
            <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(latestDraft.contentJSON, null, 2)}</pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}
