"use client";
import { useState } from "react";
import { ext03Enabled } from "../../../../lib/featureFlags";
import { addExtensionRecord } from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";

export default function Ext03Page() {
  const enabled = ext03Enabled();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

  const submit = () => {
    setMessage("");
    if (!enabled) {
      setMessage("Extension is disabled (feature flag OFF).");
      return;
    }
    if (!title || !description) {
      setMessage("Title and description are required.");
      return;
    }
    recordAudit("EXT03_ACTION_INITIATED", { title });
    addExtensionRecord("ext03Records", {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: new Date().toISOString(),
    });
    recordAudit("EXT03_ACTION_COMPLETED", { title });
    setMessage("Saved (staging/local only).");
    setTitle("");
    setDescription("");
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">EXT-03 (Wave 1)</h1>
        {!enabled && (
          <div className="bg-amber-100 border border-amber-200 text-amber-900 text-sm rounded-2xl p-3">
            Feature flag OFF (prod default). Enable in staging only for UAT.
          </div>
        )}
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-semibold">Title</label>
            <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold">Description</label>
            <textarea
              className="w-full border rounded-md px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button onClick={submit} className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
            Submit (staging/local)
          </button>
          {message && <div className="text-sm text-muted">{message}</div>}
          <p className="text-xs text-muted">
            Forbidden: enabling in production; altering payments/payouts; unaudited state changes. Audit events recorded on
            submit when enabled.
          </p>
        </div>
      </main>
    </div>
  );
}
