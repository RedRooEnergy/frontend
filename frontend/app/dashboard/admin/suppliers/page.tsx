"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import { getSession, getSupplierProfiles, SupplierProfile, setSupplierProfiles } from "../../../../lib/store";

export default function AdminSupplierGovernancePage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);
  const [suppliers, setSuppliers] = useState(() => getSupplierProfiles());

  const updateStatus = (supplierId: string, status: SupplierProfile["kybStatus"]) => {
    const updated = suppliers.map((supplier) =>
      supplier.supplierId === supplierId ? { ...supplier, kybStatus: status, updatedAt: new Date().toISOString() } : supplier
    );
    setSupplierProfiles(updated);
    setSuppliers(getSupplierProfiles());
  };

  return (
    <AdminDashboardLayout title="Grand-Master Supplier Governance">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Onboarding & verification</div>
            <p className="text-sm text-muted">Approve, reject, or reinstate supplier KYB.</p>
          </div>
        </div>
        {suppliers.length === 0 ? (
          <p className="text-sm text-muted">No supplier profiles yet.</p>
        ) : (
          <div className="buyer-table">
            <div className="buyer-table-header">
              <span>Supplier</span>
              <span>KYB Legal Name</span>
              <span>Status</span>
              <span>Actions</span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            {suppliers.map((supplier) => (
              <div key={supplier.supplierId} className="buyer-table-row">
                <span className="text-sm font-semibold">{supplier.supplierId}</span>
                <span>{supplier.kybLegalName}</span>
                <span className="buyer-pill">{supplier.kybStatus}</span>
                <span>
                  <button
                    className="text-sm font-semibold text-brand-700"
                    onClick={() => updateStatus(supplier.supplierId, "verified")}
                  >
                    Approve
                  </button>
                </span>
                <span>
                  <button
                    className="text-sm font-semibold text-red-600"
                    onClick={() => updateStatus(supplier.supplierId, "rejected")}
                  >
                    Reject
                  </button>
                </span>
                <span>
                  <button
                    className="text-sm font-semibold text-amber-700"
                    onClick={() => updateStatus(supplier.supplierId, "pending")}
                  >
                    Reinstate
                  </button>
                </span>
                <span></span>
                <span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
