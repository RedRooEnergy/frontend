"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import {
  addNegotiatedOrder,
  getBuyers,
  getNegotiatedOrders,
  getSession,
  NegotiatedOrderRequest,
} from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

export default function BuyerCommercialOrdersPage() {
  const router = useRouter();
  const session = getSession();
  const [companyName, setCompanyName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<NegotiatedOrderRequest[]>([]);

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  useEffect(() => {
    if (!session?.email) return;
    const all = getNegotiatedOrders().filter((req) => req.buyerEmail === session.email);
    setRequests(all);
  }, [session?.email]);

  const buyerRecord = useMemo(
    () => (session?.email ? getBuyers().find((b) => b.email === session.email) : undefined),
    [session?.email]
  );

  const approvedRequests = requests.filter((req) => req.status === "APPROVED");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!session?.email) return;
    const now = new Date().toISOString();
    const request: NegotiatedOrderRequest = {
      requestId: crypto.randomUUID(),
      buyerEmail: session.email,
      companyName: companyName.trim() || undefined,
      projectName: projectName.trim(),
      estimatedValue: estimatedValue.trim() || undefined,
      notes: notes.trim() || undefined,
      status: "REQUESTED",
      createdAt: now,
      updatedAt: now,
    };
    addNegotiatedOrder(request);
    setRequests((prev) => [request, ...prev]);
    setCompanyName("");
    setProjectName("");
    setEstimatedValue("");
    setNotes("");
  };

  return (
    <BuyerDashboardLayout title="Commercial Orders">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Negotiated order requests</div>
            <p className="text-sm text-muted">
              Request large or non-standard orders for review. Pricing snapshots are locked once approved.
            </p>
          </div>
          <span className="buyer-pill">Governed workflow</span>
        </div>
        <div className="buyer-form-grid">
          <div>
            <div className="text-xs text-muted">Buyer type</div>
            <div className="text-sm font-semibold">{buyerRecord?.buyerType ?? "Not set"}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Business verification</div>
            <div className={`text-sm font-semibold ${buyerRecord?.businessVerified ? "text-strong" : "text-muted"}`}>
              {buyerRecord?.businessVerified ? "Verified" : "Pending"}
            </div>
          </div>
          <div className="buyer-span-2 text-xs text-muted">
            Commercial requests are reviewed against governance rules. Buyers cannot edit pricing or terms once approved.
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Request a negotiated order</div>
          <div className="text-xs text-muted">Approval-based flow</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="buyer-form-grid">
            <div>
              <label className="text-sm font-semibold">Company name</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Legal entity or trading name"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Project name *</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project or tender reference"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Estimated order value</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="AUD 250,000"
              />
            </div>
            <div className="buyer-span-2">
              <label className="text-sm font-semibold">Notes</label>
              <textarea
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2 min-h-[120px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scope, delivery window, compliance expectations"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold hover:opacity-90 transition">
            Submit request
          </button>
        </form>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Requests & status</div>
          <div className="text-xs text-muted">Locked once approved</div>
        </div>
        {requests.length === 0 ? (
          <p className="text-sm text-muted">No negotiated requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.requestId} className="buyer-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted">Request</div>
                    <div className="text-sm font-semibold">{req.projectName}</div>
                    <div className="text-xs text-muted">{req.companyName ?? "Buyer account"}</div>
                  </div>
                  <div className="text-right">
                    <div className="buyer-pill">{req.status}</div>
                    <div className="text-xs text-muted">{formatDate(req.createdAt)}</div>
                  </div>
                </div>
                {req.estimatedValue && <div className="text-xs text-muted mt-2">Estimate: {req.estimatedValue}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Locked quotes</div>
          <div className="text-xs text-muted">Available after approval</div>
        </div>
        {approvedRequests.length === 0 ? (
          <p className="text-sm text-muted">No approved commercial quotes yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {approvedRequests.map((req) => (
              <div key={req.requestId} className="flex items-center justify-between">
                <span>{req.projectName}</span>
                <span className="buyer-pill is-success">Quote locked</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerDashboardLayout>
  );
}
