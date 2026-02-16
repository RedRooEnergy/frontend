"use client";

import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../../components/AdminDashboardLayout";
import CompliancePartnerForm from "../../../../../components/admin/CompliancePartnerForm";
import { CompliancePartnerRecord } from "../../../../../lib/compliancePartner/types";
import { getAdminAuthHeaders } from "../../../../../lib/auth/clientAdminHeaders";

export default function AdminCompliancePartnerCreatePage() {
  const router = useRouter();

  const handleCreate = async (payload: CompliancePartnerRecord) => {
    const res = await fetch("/api/admin/compliance-partners", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json?.error || "Unable to create compliance partner.");
    }

    router.push("/dashboard/admin/compliance-partners");
  };

  return (
    <AdminDashboardLayout title="New Compliance Partner">
      <CompliancePartnerForm submitLabel="Create partner" onSubmit={handleCreate} />
    </AdminDashboardLayout>
  );
}

