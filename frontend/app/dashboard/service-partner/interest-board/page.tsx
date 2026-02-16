"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ServicePartnerDashboardLayout from "../../../../components/ServicePartnerDashboardLayout";
import {
  getServicePartnerComplianceProfile,
  getServicePartnerInterestSignals,
  getSession,
  ServicePartnerComplianceProfile,
  ServicePartnerInterestSignal,
  upsertServicePartnerInterestSignal,
} from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

type InterestDraft = {
  interestLevel: ServicePartnerInterestSignal["interestLevel"];
  capacityPerWeek: string;
  notes: string;
};

type CertificationNeed = {
  id: string;
  supplierRef: string;
  productCategory: string;
  certificationType: "product" | "installation" | "commissioning" | "shipment_inspection" | "report_review";
  standardsRequired: string[];
  jurisdiction: {
    country: "AU" | "CN";
    region: string;
  };
  desiredTurnaroundDays: number;
  volumeEstimate?: number;
  summary: string;
  status: "OPEN" | "IN_REVIEW" | "MATCHED" | "CLOSED";
  createdAt: string;
};

const interestLevels: { id: ServicePartnerInterestSignal["interestLevel"]; label: string }[] = [
  { id: "READY_NOW", label: "Ready now" },
  { id: "AVAILABLE_SOON", label: "Available soon" },
  { id: "NOT_AVAILABLE", label: "Not available" },
];

function isPartnerActive(profile: ServicePartnerComplianceProfile) {
  return profile.status === "ACTIVE";
}

export default function ServicePartnerInterestBoardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ServicePartnerComplianceProfile | null>(null);
  const [signals, setSignals] = useState<ServicePartnerInterestSignal[]>([]);
  const [drafts, setDrafts] = useState<Record<string, InterestDraft>>({});
  const [needs, setNeeds] = useState<CertificationNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "service-partner") {
      router.replace("/signin?role=service-partner");
      return;
    }
    const stored = getServicePartnerComplianceProfile(session.userId);
    setProfile(stored);
    const existingSignals = getServicePartnerInterestSignals().filter((signal) => signal.partnerId === session.userId);
    setSignals(existingSignals);

    const loadNeeds = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/certification-matching/partner/interest-board?status=OPEN", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Unable to load interest board.");
        }
        const json = await response.json();
        setNeeds(json.needs ?? []);
        setError(null);
      } catch (err) {
        setError("Interest board is unavailable.");
        setNeeds([]);
      } finally {
        setLoading(false);
      }
    };

    loadNeeds();
  }, [router]);

  const active = profile ? isPartnerActive(profile) : false;

  const eligibleNeeds = useMemo(() => {
    if (!active) return [];
    return needs.filter((need) => need.status === "OPEN");
  }, [needs, active]);

  const demandSummary = useMemo(() => {
    const summary = new Map<string, number>();
    needs.forEach((need) => {
      if (need.status !== "OPEN") return;
      summary.set(need.certificationType, (summary.get(need.certificationType) ?? 0) + 1);
    });
    return Array.from(summary.entries()).map(([type, count]) => ({ type, count }));
  }, [needs]);

  const getSignalForNeed = (needId: string) =>
    signals.find((signal) => signal.needId === needId);

  const updateDraft = (needId: string, updates: Partial<InterestDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [needId]: {
        interestLevel: prev[needId]?.interestLevel ?? "READY_NOW",
        capacityPerWeek: prev[needId]?.capacityPerWeek ?? "",
        notes: prev[needId]?.notes ?? "",
        ...updates,
      },
    }));
  };

  const submitInterest = async (needId: string) => {
    if (!profile) return;
    const draft = drafts[needId];
    try {
      const response = await fetch(`/api/certification-matching/partner/interest-signals/${needId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interestLevel: draft?.interestLevel ?? "READY_NOW",
          capacityPerWeek: draft?.capacityPerWeek ? Number(draft.capacityPerWeek) : undefined,
          notesToAdmin: draft?.notes ?? "",
        }),
      });
      if (!response.ok) {
        throw new Error("Unable to record interest.");
      }
      const json = await response.json();
      const signal = json.signal as ServicePartnerInterestSignal;
      upsertServicePartnerInterestSignal(signal);
      setSignals((prev) => {
        const idx = prev.findIndex((item) => item.id === signal.id);
        if (idx === -1) return [signal, ...prev];
        const next = prev.slice();
        next[idx] = signal;
        return next;
      });
    } catch (err) {
      setError("Unable to record interest right now.");
    }
  };

  if (!profile) return null;

  return (
    <ServicePartnerDashboardLayout title="Certification Interest Board">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Market demand snapshot</div>
            <p className="text-sm text-muted">
              Admin-mediated matching only. Supplier identity remains masked until approval.
            </p>
          </div>
          <span className="buyer-pill">Read-only</span>
        </div>
        <div className="buyer-form-grid">
          {demandSummary.map((item) => (
            <div key={item.type} className="buyer-card">
              <div className="text-sm font-semibold">{item.type.replace(/_/g, " ")}</div>
              <div className="text-xs text-muted">{item.count} open requests</div>
            </div>
          ))}
        </div>
        {loading && <p className="text-sm text-muted mt-3">Loading matching requests…</p>}
        {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}
      </div>

      {!active && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div>
              <div className="buyer-section-title">Complete accreditation to unlock requests</div>
              <p className="text-sm text-muted">
                Your status is currently {profile.status}. Only ACTIVE compliance partners can express interest.
              </p>
            </div>
            <span className="buyer-pill">Locked</span>
          </div>
          <Link
            href="/dashboard/service-partner/compliance"
            className="inline-flex items-center px-3 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
          >
            Continue accreditation onboarding
          </Link>
        </div>
      )}

      {active && (
        <div className="space-y-4">
          {!loading && eligibleNeeds.length === 0 ? (
            <div className="buyer-card">
              <div className="buyer-card-header">
                <div className="buyer-section-title">No matching requests</div>
                <div className="text-xs text-muted">We will notify you when a request matches your scope.</div>
              </div>
            </div>
          ) : (
            eligibleNeeds.map((need) => {
              const signal = getSignalForNeed(need.id);
              const draft = drafts[need.id] ?? {
                interestLevel: signal?.interestLevel ?? "READY_NOW",
                capacityPerWeek: signal?.capacityPerWeek?.toString() ?? "",
                notes: signal?.notes ?? "",
              };
              return (
                <div key={need.id} className="buyer-card">
                  <div className="buyer-card-header">
                    <div>
                      <div className="buyer-section-title">{need.productCategory}</div>
                      <p className="text-xs text-muted">
                        {need.certificationType.replace(/_/g, " ")} · {need.jurisdiction.country} {need.jurisdiction.region}
                      </p>
                    </div>
                    <span className="buyer-pill">{need.supplierRef}</span>
                  </div>
                  <div className="buyer-form-grid">
                    <div>
                      <div className="text-xs text-muted">Standards</div>
                      <div className="text-sm font-semibold">{need.standardsRequired.join(", ") || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Desired turnaround</div>
                      <div className="text-sm font-semibold">{need.desiredTurnaroundDays} days</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Volume estimate</div>
                      <div className="text-sm font-semibold">{need.volumeEstimate ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Requested</div>
                      <div className="text-sm font-semibold">{formatDate(need.createdAt)}</div>
                    </div>
                    <div className="buyer-span-2">
                      <div className="text-xs text-muted">Summary</div>
                      <div className="text-sm font-semibold">{need.summary}</div>
                    </div>
                  </div>

                  <div className="mt-4 buyer-form-grid">
                    <div>
                      <label className="text-sm font-semibold">Interest level</label>
                      <select
                        className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                        value={draft.interestLevel}
                        onChange={(event) =>
                          updateDraft(need.id, { interestLevel: event.target.value as InterestDraft["interestLevel"] })
                        }
                      >
                        {interestLevels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Capacity per week</label>
                      <input
                        type="number"
                        className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                        value={draft.capacityPerWeek}
                        onChange={(event) => updateDraft(need.id, { capacityPerWeek: event.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="buyer-span-2">
                      <label className="text-sm font-semibold">Notes to admin</label>
                      <textarea
                        className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                        rows={2}
                        value={draft.notes}
                        onChange={(event) => updateDraft(need.id, { notes: event.target.value })}
                        placeholder="Capacity, constraints, or clarifications"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-muted">
                      {signal ? `Interest recorded · ${signal.interestLevel.replace(/_/g, " ")}` : "No interest recorded"}
                    </div>
                    <button
                      className="px-3 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
                      onClick={() => submitInterest(need.id)}
                    >
                      {signal ? "Update interest" : "Express interest"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </ServicePartnerDashboardLayout>
  );
}
