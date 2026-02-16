"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import RegulatorDashboardLayout from "../../../components/RegulatorDashboardLayout";
import {
  getComplianceDecisions,
  getOrders,
  getBuyerDocuments,
  getSession,
  getReturns,
} from "../../../lib/store";
import { formatDate } from "../../../lib/utils";

export default function RegulatorAuditViewPage() {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "regulator") {
      router.replace("/signin?role=regulator");
    }
  }, [router, session]);

  const compliance = useMemo(() => getComplianceDecisions(), []);
  const orders = useMemo(() => getOrders(), []);
  const documents = useMemo(() => getBuyerDocuments(), []);
  const returns = useMemo(() => getReturns(), []);

  const complianceApproved = compliance.filter((c) => c.status === "APPROVED").length;

  return (
    <RegulatorDashboardLayout title="Regulator Audit View">
      <div className="buyer-card regulator-about">
        <div className="buyer-card-header">
          <div className="buyer-section-title">
            <span className="about-trigger">About</span>
          </div>
          <span className="buyer-pill">Purpose & scope</span>
        </div>
        <div className="about-body space-y-3 text-sm text-muted">
          <p className="text-strong">
            Regulator Audit View — Purpose & Scope
          </p>
          <p>
            The Regulator Audit View provides authorised regulators and auditors with immutable, read-only access to
            selected RedRooEnergy marketplace records. Its sole purpose is to support independent verification of
            compliance, financial integrity, and operational traceability without allowing any interaction,
            modification, or decision-making within the system.
          </p>
          <p>
            This dashboard presents frozen snapshots of marketplace activity, including orders, compliance approvals,
            documents, and exception handling. All records are scope-limited to the regulator’s authorised mandate and
            are presented exactly as stored at the time of capture, with no ability to alter, annotate, or influence
            outcomes.
          </p>
          <p>
            Data is organised into clear sections covering compliance decisions, transaction records, evidence
            artefacts (such as certificates, invoices, and proof of delivery), and returns or refunds. Where no
            activity exists, the dashboard explicitly records zero values to demonstrate completeness rather than
            omission.
          </p>
          <p>
            This view is designed to be regulator-ready by default: transparent, verifiable, and audit-safe, ensuring
            confidence that all displayed information is complete, tamper-proof, and aligned with statutory and
            evidentiary requirements.
          </p>
        </div>
      </div>
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Immutable audit access</div>
            <p className="text-sm text-muted">
              Scoped, read-only access to compliance evidence and marketplace transactions.
            </p>
          </div>
          <span className="buyer-pill">Read-only</span>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-xs text-muted">Orders recorded</div>
            <div className="text-xl font-semibold">{orders.length}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Compliance approvals</div>
            <div className="text-xl font-semibold">{complianceApproved}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Documents stored</div>
            <div className="text-xl font-semibold">{documents.length}</div>
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Compliance decisions</div>
          <div className="text-xs text-muted">Regulator-ready evidence</div>
        </div>
        {compliance.length === 0 ? (
          <p className="text-sm text-muted">No compliance decisions recorded.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {compliance.map((record) => (
              <div key={record.id} className="flex items-center justify-between">
                <span>
                  {record.orderId} · {record.status}
                </span>
                <span className="text-xs text-muted">{formatDate(record.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Transaction records</div>
          <div className="text-xs text-muted">Immutable order snapshots</div>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-muted">No orders recorded.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {orders.map((order) => (
              <div key={order.orderId} className="flex items-center justify-between">
                <span>
                  {order.orderId} · {order.status}
                </span>
                <span className="text-xs text-muted">{formatDate(order.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Evidence records</div>
          <div className="text-xs text-muted">Certificates, invoices, POD</div>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-muted">No documents stored.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {documents.map((doc) => (
              <div key={doc.documentId} className="flex items-center justify-between">
                <span>
                  {doc.name} · {doc.type}
                </span>
                <span className="text-xs text-muted">{formatDate(doc.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Returns & refunds</div>
          <div className="text-xs text-muted">Exception handling evidence</div>
        </div>
        {returns.length === 0 ? (
          <p className="text-sm text-muted">No return records.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {returns.map((ret) => (
              <div key={ret.rmaId} className="flex items-center justify-between">
                <span>
                  {ret.rmaId} · {ret.status}
                </span>
                <span className="text-xs text-muted">{formatDate(ret.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </RegulatorDashboardLayout>
  );
}
