"use client";

import { useEffect, useMemo, useState } from "react";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
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

export default function BuyerEmailInboxPage() {
  const [rows, setRows] = useState<EmailDispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");

  const eventOptions = useMemo(
    () =>
      Object.entries(EMAIL_EVENT_META)
        .filter(([, meta]) => meta.roles.includes("buyer"))
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
        if (!res.ok) throw new Error("Unable to load email inbox.");
        const data = await res.json();
        setRows(data.items ?? []);
        setError(null);
      } catch (err: any) {
        setError(err?.message || "Unable to load email inbox.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [search, statusFilter, eventFilter]);

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
    <BuyerDashboardLayout title="Email Inbox">
      <div className="buyer-card space-y-3">
        <p className="text-sm text-muted">
          This inbox lists all governed operational emails sent to your account.
        </p>

        <div className="buyer-form-grid">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">Search</label>
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Search event or reference"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">Status</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All</option>
              <option value="SENT">SENT</option>
              <option value="FAILED">FAILED</option>
              <option value="QUEUED">QUEUED</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted">Event</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
            >
              <option value="">All</option>
              {eventOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading emails…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">No emails yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>Event</div>
              <div>Status</div>
              <div>Reference</div>
              <div>Sent</div>
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
    </BuyerDashboardLayout>
  );
}
