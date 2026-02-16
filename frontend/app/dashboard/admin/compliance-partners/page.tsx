"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import { getSession } from "../../../../lib/store";
import { useRouter } from "next/navigation";
import { getAdminAuthHeaders } from "../../../../lib/auth/clientAdminHeaders";

type PartnerRow = {
  id: string;
  legalName: string;
  tradingName?: string;
  jurisdiction: string;
  status: string;
  slaDays: number;
  scopes: { certifications: string[] };
  offices?: { city: string }[];
  audit?: { updatedAt?: string };
};

export default function AdminCompliancePartnersPage() {
  const router = useRouter();
  const session = getSession();
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string>("");

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/compliance-partners", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (!res.ok) throw new Error("Unable to load compliance partners.");
      const json = await res.json();
      setRows(json.items ?? []);
      setError(null);
    } catch (err) {
      setError("Unable to load compliance partners.");
    } finally {
      setLoading(false);
    }
  };

  const seed = async () => {
    try {
      const res = await fetch("/api/admin/compliance-partners/seed", {
        method: "POST",
        headers: getAdminAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Seed failed");
      setSeedMessage(`Seeded: ${json.summary.created} created, ${json.summary.updated} updated.`);
      await load();
      setTimeout(() => setSeedMessage(""), 3000);
    } catch (e: any) {
      setSeedMessage(e?.message || "Seed failed");
      setTimeout(() => setSeedMessage(""), 3000);
    }
  };

  useEffect(() => {
    if (session?.role === "admin") load();
  }, [session]);

  return (
    <AdminDashboardLayout title="Compliance Partner Registry">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Registry</div>
            <p className="text-sm text-muted">Approved accreditation and compliance partners.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold" onClick={load}>
              Refresh
            </button>
            <button className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold" onClick={seed}>
              Seed Brisbane data
            </button>
            <Link
              href="/dashboard/admin/compliance-partners/new"
              className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
            >
              New
            </Link>
          </div>
        </div>

        {seedMessage && <p className="text-sm text-emerald-700 mt-2">{seedMessage}</p>}

        {loading ? (
          <p className="text-sm text-muted">Loading registry…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No compliance partners yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <div>Partner</div>
              <div>Status</div>
              <div>Certifications</div>
              <div>Brisbane Office</div>
              <div>Last updated</div>
              <div>Action</div>
            </div>
            {rows.map((partner) => {
              const hasBrisbane = partner.offices?.some((office) => office.city?.toLowerCase() === "brisbane");
              return (
                <div key={partner.id} className="buyer-table-row">
                  <div>
                    <div className="text-sm font-semibold">{partner.tradingName || partner.legalName}</div>
                    <div className="text-xs text-muted">{partner.id}</div>
                  </div>
                  <div className="text-sm">{partner.status}</div>
                  <div className="text-xs text-muted">{partner.scopes?.certifications?.join(", ") || "—"}</div>
                  <div className="text-xs text-muted">{hasBrisbane ? "Yes" : "—"}</div>
                  <div className="text-xs text-muted">{partner.audit?.updatedAt || "—"}</div>
                  <div>
                    <Link
                      href={`/dashboard/admin/compliance-partners/${partner.id}`}
                      className="text-sm font-semibold text-brand-700"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}
      </div>
    </AdminDashboardLayout>
  );
}

