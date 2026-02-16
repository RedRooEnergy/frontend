"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";
import { formatDate } from "../../../../lib/utils";
import { EMAIL_EVENT_META } from "../../../../lib/email/events";

interface EmailDispatchRow {
  dispatchId: string;
  eventCode: string;
  recipientRole: string;
  sendStatus: string;
  createdAt: string;
  entityRefs: Record<string, string>;
}

export default function SupplierEmailInboxPage() {
  const { t } = useSupplierTranslations();
  const [rows, setRows] = useState<EmailDispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");

  const eventOptions = useMemo(
    () =>
      Object.entries(EMAIL_EVENT_META)
        .filter(([, meta]) => meta.roles.includes("supplier"))
        .map(([code]) => code)
        .sort(),
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (statusFilter) params.set("sendStatus", statusFilter);
        if (eventFilter) params.set("eventCode", eventFilter);
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`/api/email/inbox?${params.toString()}`);
        if (!res.ok) throw new Error(t("emails.error"));
        const data = await res.json();
        setRows(data.items ?? []);
        setError(null);
      } catch (err: any) {
        setError(err?.message || t("emails.error"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t, search, statusFilter, eventFilter]);

  const filtered = useMemo(() => {
    let next = rows;
    if (statusFilter) {
      next = next.filter((row) => row.sendStatus === statusFilter);
    }
    if (eventFilter) {
      next = next.filter((row) => row.eventCode === eventFilter);
    }
    if (search.trim()) {
      const needle = search.toLowerCase();
      next = next.filter((row) => {
        const ref = row.entityRefs?.referenceId || row.entityRefs?.orderId || row.entityRefs?.primaryId || "";
        const haystack = `${row.eventCode} ${row.sendStatus} ${ref}`.toLowerCase();
        return haystack.includes(needle);
      });
    }
    return next;
  }, [rows, search, statusFilter, eventFilter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("emails.title")}</h1>
        <p className="text-sm text-muted">{t("emails.subtitle")}</p>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
        <div className="buyer-form-grid">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">{t("emails.search.label")}</label>
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder={t("emails.search.placeholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">{t("emails.status.label")}</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">{t("emails.status.all")}</option>
              <option value="SENT">{t("emails.status.sent")}</option>
              <option value="FAILED">{t("emails.status.failed")}</option>
              <option value="QUEUED">{t("emails.status.queued")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">{t("emails.event.label")}</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
            >
              <option value="">{t("emails.event.all")}</option>
              {eventOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">{t("emails.empty")}</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>{t("emails.table.event")}</div>
              <div>{t("emails.table.status")}</div>
              <div>{t("emails.table.reference")}</div>
              <div>{t("emails.table.sent")}</div>
            </div>
            {filtered.map((row) => (
              <div key={row.dispatchId} className="buyer-table-row">
                <div className="text-sm font-semibold">{row.eventCode}</div>
                <div className="text-xs text-muted">{row.sendStatus}</div>
                <div className="text-xs text-muted">
                  {row.entityRefs?.referenceId || row.entityRefs?.orderId || row.entityRefs?.primaryId || "—"}
                </div>
                <div className="text-xs text-muted">{formatDate(row.createdAt)}</div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-amber-700">{error}</p>}
      </div>
    </div>
  );
}
