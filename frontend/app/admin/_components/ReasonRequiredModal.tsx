"use client";

type ReasonRequiredModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
};

export default function ReasonRequiredModal({
  open,
  title,
  subtitle,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  confirmDisabled = false,
}: ReasonRequiredModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="admin-reason-field">
          Reason (required)
        </label>
        <textarea
          id="admin-reason-field"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          placeholder="Document the governance rationale"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
