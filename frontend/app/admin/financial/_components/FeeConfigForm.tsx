"use client";

import { useEffect, useState } from "react";

type FeeConfigFormProps = {
  initialRules: Record<string, unknown> | null;
  onReview: (draft: Record<string, unknown>) => void;
  disabled?: boolean;
};

export default function FeeConfigForm({ initialRules, onReview, disabled = false }: FeeConfigFormProps) {
  const [value, setValue] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(JSON.stringify(initialRules || {}, null, 2));
  }, [initialRules]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Fee Configuration Draft</h3>
      <p className="mt-1 text-xs text-slate-600">Edit JSON rules, then review before/after diff before submitting.</p>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={10}
        className="mt-3 w-full rounded-md border border-slate-300 p-3 font-mono text-xs text-slate-800 outline-none focus:border-slate-500"
      />
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={disabled}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            try {
              const parsed = JSON.parse(value);
              if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Draft must be a JSON object");
              }
              setError(null);
              onReview(parsed as Record<string, unknown>);
            } catch (parseError: any) {
              setError(String(parseError?.message || parseError));
            }
          }}
        >
          Review fee config change
        </button>
      </div>
    </section>
  );
}
