"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { getOrders, getSession } from "../../../../lib/store";
import { listDocumentsForBuyer, getDocumentTypeLabel } from "../../../../lib/documents";
import DocumentDownload from "../../../../components/DocumentDownload";
import { formatDate } from "../../../../lib/utils";

export default function BuyerDocumentsPage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  const orderIds = session?.email ? getOrders().filter((o) => o.buyerEmail === session.email).map((o) => o.orderId) : [];
  const docs = session?.email ? listDocumentsForBuyer(session.email, orderIds) : [];

  return (
    <BuyerDashboardLayout title="Documents & Certificates">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Document vault</div>
          <div className="text-xs text-muted">Immutable, timestamped, hash-verified</div>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-muted">No documents available yet.</p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div key={doc.documentId} className="buyer-card flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted">{getDocumentTypeLabel(doc.type)}</div>
                  <div className="text-base font-semibold">{doc.name}</div>
                  <div className="text-sm text-muted">Order: {doc.orderId}</div>
                  <div className="text-sm text-muted">Created: {formatDate(doc.createdAt)}</div>
                </div>
                <DocumentDownload documentId={doc.documentId} name={doc.name} />
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerDashboardLayout>
  );
}
