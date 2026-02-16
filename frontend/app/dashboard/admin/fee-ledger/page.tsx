"use client";

import { useEffect, useMemo, useState } from "react";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import { getSession } from "../../../../lib/store";
import { useRouter } from "next/navigation";

type FeeLedgerEvent = {
  eventId: string;
  eventType: string;
  actorRole: string;
  actorId: string;
  relatedEntityType: string;
  relatedEntityId: string;
  baseAmount: number;
  feePercent: number;
  feeAmount: number;
  currency: string;
  status: string;
  createdAt: string;
};

export default function AdminFeeLedgerPage() {
  const router = useRouter();
  const session = getSession();
  const [events, setEvents] = useState<FeeLedgerEvent[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filters, setFilters] = useState({
    actorRole: "",
    eventType: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.actorRole) params.set("actorRole", filters.actorRole);
    if (filters.eventType) params.set("eventType", filters.eventType);
    if (filters.status) params.set("status", filters.status);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/fee-ledger?${query}`);
      const data = await res.json();
      setEvents(data.items || []);
      const sumRes = await fetch(`/api/admin/fee-ledger/summary?${query}`);
      const sumData = await sumRes.json();
      setSummary(sumData.summary || null);
    };
    load();
  }, [query]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-ledger-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const header = [
      "eventId",
      "eventType",
      "actorRole",
      "actorId",
      "relatedEntityType",
      "relatedEntityId",
      "baseAmount",
      "feePercent",
      "feeAmount",
      "currency",
      "status",
      "createdAt",
    ];
    const rows = events.map((e) =>
      header.map((key) => JSON.stringify((e as any)[key] ?? "")).join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminDashboardLayout title="Marketplace Fee Ledger (1%)">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Filters</div>
            <p className="text-sm text-muted">Ledger events only. No payouts or settlement actions.</p>
          </div>
          <div className="flex gap-2">
            <button className="text-sm font-semibold text-brand-700" onClick={exportJson}>
              Export JSON
            </button>
            <button className="text-sm font-semibold text-brand-700" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <input
            className="border rounded-md px-3 py-2"
            placeholder="actorRole"
            value={filters.actorRole}
            onChange={(e) => setFilters((prev) => ({ ...prev, actorRole: e.target.value }))}
          />
          <input
            className="border rounded-md px-3 py-2"
            placeholder="eventType"
            value={filters.eventType}
            onChange={(e) => setFilters((prev) => ({ ...prev, eventType: e.target.value }))}
          />
          <input
            className="border rounded-md px-3 py-2"
            placeholder="status"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          />
          <input
            className="border rounded-md px-3 py-2"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
          />
          <input
            className="border rounded-md px-3 py-2"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
        {summary && (
          <div className="mt-4 text-sm text-muted">
            Total events: <b>{summary.total}</b>
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Ledger events</div>
          <div className="text-xs text-muted">View-only marketplace ledger</div>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted">No fee ledger events found.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <span>Event</span>
              <span>Actor</span>
              <span>Entity</span>
              <span>Base</span>
              <span>Fee</span>
              <span>Status</span>
              <span>Created</span>
            </div>
            {events.map((e) => (
              <div key={e.eventId} className="buyer-table-row text-sm">
                <span>{e.eventType}</span>
                <span>
                  {e.actorRole} · {e.actorId}
                </span>
                <span>
                  {e.relatedEntityType} · {e.relatedEntityId}
                </span>
                <span>
                  {e.baseAmount} {e.currency}
                </span>
                <span>
                  {e.feeAmount} {e.currency}
                </span>
                <span>{e.status}</span>
                <span>{new Date(e.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          Fees are recorded at marketplace level only. RRE does not process service payments.
        </p>
      </div>
    </AdminDashboardLayout>
  );
}
