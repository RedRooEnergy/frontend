"use client";

import type { AdminAuditReceipt } from "../../../types/adminDashboard";

type AuditReceiptToastProps = {
  receipt: AdminAuditReceipt | null;
  onDismiss?: () => void;
};

export default function AuditReceiptToast({ receipt, onDismiss }: AuditReceiptToastProps) {
  if (!receipt) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Mutation recorded</p>
          <p className="mt-1">Audit ID: {receipt.auditId}</p>
          {receipt.entityId ? <p>Entity ID: {receipt.entityId}</p> : null}
          {typeof receipt.version === "number" ? <p>Version: {receipt.version}</p> : null}
          {receipt.hash ? <p className="break-all">Hash: {receipt.hash}</p> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
