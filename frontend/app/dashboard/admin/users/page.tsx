"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import {
  getAccessStatus,
  getBuyers,
  getSession,
  getServicePartnerTasks,
  getSupplierProfiles,
  upsertUserAccessOverride,
  UserAccessOverride,
} from "../../../../lib/store";

type Row = { role: UserAccessOverride["role"]; id: string; label: string };

export default function AdminUsersPage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);
  const buyers = useMemo(() => getBuyers(), []);
  const suppliers = useMemo(() => getSupplierProfiles(), []);
  const partnerIds = useMemo(
    () => Array.from(new Set(getServicePartnerTasks().map((task) => task.servicePartnerId))),
    []
  );

  const rows: Row[] = [
    ...buyers.map((buyer) => ({ role: "buyer" as const, id: buyer.email, label: buyer.name || buyer.email })),
    ...suppliers.map((supplier) => ({ role: "supplier" as const, id: supplier.supplierId, label: supplier.kybLegalName })),
    ...partnerIds.map((id) => ({ role: "service-partner" as const, id, label: id })),
  ];

  const [refresh, setRefresh] = useState(0);

  const updateStatus = (role: UserAccessOverride["role"], id: string, status: UserAccessOverride["status"]) => {
    upsertUserAccessOverride({
      id: `${role}:${id}`,
      role,
      email: id,
      status,
      updatedAt: new Date().toISOString(),
    });
    setRefresh((prev) => prev + 1);
  };

  return (
    <AdminDashboardLayout title="Grand-Master User & Role Management">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">User access control</div>
            <p className="text-sm text-muted">Suspend or review access by role.</p>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No users registered yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <span>Role</span>
              <span>User</span>
              <span>Status</span>
              <span>Actions</span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            {rows.map((row) => {
              const status = getAccessStatus(row.role, row.id);
              return (
                <div key={`${row.role}-${row.id}-${refresh}`} className="buyer-table-row">
                  <span className="text-sm font-semibold">{row.role}</span>
                  <span>{row.label}</span>
                  <span className="buyer-pill">{status}</span>
                  <span>
                    <button
                      className="text-sm font-semibold text-brand-700"
                      onClick={() => updateStatus(row.role, row.id, "ACTIVE")}
                    >
                      Activate
                    </button>
                  </span>
                  <span>
                    <button
                      className="text-sm font-semibold text-amber-700"
                      onClick={() => updateStatus(row.role, row.id, "REVIEW")}
                    >
                      Review
                    </button>
                  </span>
                  <span>
                    <button
                      className="text-sm font-semibold text-red-600"
                      onClick={() => updateStatus(row.role, row.id, "SUSPENDED")}
                    >
                      Suspend
                    </button>
                  </span>
                  <span></span>
                  <span></span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
