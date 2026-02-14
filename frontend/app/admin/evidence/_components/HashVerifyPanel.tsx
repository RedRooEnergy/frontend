"use client";

import { useMemo, useState } from "react";

export default function HashVerifyPanel() {
  const [filename, setFilename] = useState("");
  const [expectedHash, setExpectedHash] = useState("");
  const [reportedHash, setReportedHash] = useState("");

  const status = useMemo(() => {
    if (!expectedHash.trim() || !reportedHash.trim()) return "INCOMPLETE";
    return expectedHash.trim().toLowerCase() === reportedHash.trim().toLowerCase() ? "MATCH" : "MISMATCH";
  }, [expectedHash, reportedHash]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Hash verification helper (UI-only)</h3>
      <p className="mt-1 text-xs text-slate-600">This helper compares provided hashes only and does not assert authority over backend evidence integrity.</p>

      <div className="mt-3 grid gap-3">
        <label className="text-sm text-slate-700">
          Filename
          <input
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="chat_manifest.json"
          />
        </label>

        <label className="text-sm text-slate-700">
          Expected SHA-256
          <input
            value={expectedHash}
            onChange={(event) => setExpectedHash(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Paste expected hash"
          />
        </label>

        <label className="text-sm text-slate-700">
          Reported SHA-256
          <input
            value={reportedHash}
            onChange={(event) => setReportedHash(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Paste reported hash"
          />
        </label>
      </div>

      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>File: {filename.trim() || "(not provided)"}</p>
        <p>Status: {status}</p>
      </div>
    </section>
  );
}
