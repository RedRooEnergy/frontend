"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FreightDashboardLayout from "../../../../components/FreightDashboardLayout";
import { getSession } from "../../../../lib/store";

const customsRows = [
  {
    id: "CUS-1021",
    shipment: "TRK-7781",
    hsCode: "854140",
    duty: "AUD 3,200",
    gst: "AUD 1,020",
    inspection: "Not required",
    clearance: "Pending",
  },
  {
    id: "CUS-1022",
    shipment: "TRK-5524",
    hsCode: "850760",
    duty: "AUD 4,800",
    gst: "AUD 1,540",
    inspection: "Scheduled",
    clearance: "Under review",
  },
];

export default function FreightCustomsPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "freight") {
      router.replace("/signin?role=freight");
    }
  }, [router]);

  return (
    <FreightDashboardLayout title="Customs & Duty Management">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Customs tracking</div>
            <p className="text-sm text-muted">HS codes, duty/GST, inspections, clearance status.</p>
          </div>
          <span className="buyer-pill">DDP</span>
        </div>
        <div className="buyer-table">
          <div className="buyer-table-header">
            <span>Entry</span>
            <span>Shipment</span>
            <span>HS Code</span>
            <span>Duty</span>
            <span>GST</span>
            <span>Inspection</span>
            <span>Clearance</span>
            <span>Action</span>
          </div>
          {customsRows.map((row) => (
            <div key={row.id} className="buyer-table-row">
              <span className="text-sm font-semibold">{row.id}</span>
              <span>{row.shipment}</span>
              <span>{row.hsCode}</span>
              <span>{row.duty}</span>
              <span>{row.gst}</span>
              <span>{row.inspection}</span>
              <span className="buyer-pill">{row.clearance}</span>
              <span className="text-brand-700 text-sm font-semibold">Review</span>
            </div>
          ))}
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Duty & tax payment API</div>
          <div className="text-xs text-muted">Automated settlement</div>
        </div>
        <p className="text-sm text-muted">
          Duty and GST payments are triggered via the freight payment API once clearance approval is recorded. Manual
          overrides are not permitted.
        </p>
      </div>
    </FreightDashboardLayout>
  );
}
