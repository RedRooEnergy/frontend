"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ServicePartnerDashboardLayout from "../../../components/ServicePartnerDashboardLayout";
import {
  addServicePartnerTask,
  getServicePartnerTasks,
  getServicePartnerInterestSignals,
  getSession,
  ServicePartnerTask,
  ServicePartnerInterestSignal,
} from "../../../lib/store";
import { formatDate } from "../../../lib/utils";

function seedTasks(servicePartnerId: string): ServicePartnerTask[] {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      taskId: `SP-${servicePartnerId}-install-${crypto.randomUUID().slice(0, 8)}`,
      servicePartnerId,
      orderId: "ORD-2019",
      taskType: "INSTALLATION",
      title: "Install rooftop system - Site A",
      status: "ASSIGNED",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dueDate: new Date(now.getTime() + day * 4).toISOString(),
      priority: "High",
      slaHours: 72,
      location: "Brisbane, QLD",
      checklist: ["Site inspection complete", "Install completed", "Commissioning evidence uploaded"],
      evidenceRequired: ["Photos", "Commissioning report"],
    },
    {
      taskId: `SP-${servicePartnerId}-evidence-${crypto.randomUUID().slice(0, 8)}`,
      servicePartnerId,
      orderId: "ORD-2024",
      taskType: "COMPLIANCE_CHECK",
      title: "Upload compliance evidence - Site C",
      status: "EVIDENCE_REQUIRED",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dueDate: new Date(now.getTime() + day * 2).toISOString(),
      priority: "Medium",
      slaHours: 48,
      location: "Gold Coast, QLD",
      checklist: ["Verify certificate", "Upload inspection photos", "Submit final report"],
      evidenceRequired: ["CEC certificate", "Inspection photos"],
    },
  ];
}

export default function ServicePartnerDashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ServicePartnerTask[]>([]);
  const [signals, setSignals] = useState<ServicePartnerInterestSignal[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "service-partner") {
      router.replace("/signin?role=service-partner");
      return;
    }
    const existing = getServicePartnerTasks().filter((task) => task.servicePartnerId === session.userId);
    const existingSignals = getServicePartnerInterestSignals().filter((signal) => signal.partnerId === session.userId);
    setSignals(existingSignals);
    if (existing.length === 0) {
      const seeded = seedTasks(session.userId);
      seeded.forEach(addServicePartnerTask);
      setTasks(seeded);
      return;
    }
    setTasks(existing);
  }, [router]);


  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "COMPLETED"), [tasks]);
  const evidenceTasks = useMemo(
    () => tasks.filter((task) => task.status === "EVIDENCE_REQUIRED"),
    [tasks]
  );
  const engagementCounts = useMemo(() => {
    const leads = tasks.length;
    const requests = activeTasks.length;
    const referrals = signals.length;
    const contactInitiated = signals.filter((signal) => signal.interestLevel !== "NOT_AVAILABLE").length;
    return { leads, requests, referrals, contactInitiated };
  }, [tasks, activeTasks.length, signals]);

  return (
    <ServicePartnerDashboardLayout title="Service Partner Work Allocation">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Assigned jobs</div>
            <p className="text-sm text-muted">Work allocation, SLA targets, and locations.</p>
          </div>
          <span className="buyer-pill">{activeTasks.length} active</span>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-xs text-muted">Evidence required</div>
            <div className="text-xl font-semibold">{evidenceTasks.length}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Upcoming due dates</div>
            <div className="text-xl font-semibold">
              {activeTasks.filter((t) => t.dueDate).length}
            </div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Average SLA</div>
            <div className="text-xl font-semibold">48 hrs</div>
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Engagement overview</div>
            <p className="text-sm text-muted">Connection activity and inbound requests.</p>
          </div>
          <span className="buyer-pill">Info only</span>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-xs text-muted">Leads received</div>
            <div className="text-xl font-semibold">{engagementCounts.leads}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Requests received</div>
            <div className="text-xl font-semibold">{engagementCounts.requests}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Referrals</div>
            <div className="text-xl font-semibold">{engagementCounts.referrals}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Contact initiated</div>
            <div className="text-xl font-semibold">{engagementCounts.contactInitiated}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          RRE does not process or handle payments for services. All service payments occur off-platform.
        </p>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Active assignments</div>
          <div className="text-xs text-muted">Governed task list</div>
        </div>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-muted">No active tasks assigned.</p>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div key={task.taskId} className="buyer-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted">{task.taskType.replace(/_/g, " ")}</div>
                    <div className="text-base font-semibold">{task.title}</div>
                    {task.orderId && <div className="text-xs text-muted">Order {task.orderId}</div>}
                    {task.location && <div className="text-xs text-muted">Location: {task.location}</div>}
                  </div>
                  <div className="text-right">
                    <span className="buyer-pill">{task.status.replace(/_/g, " ")}</span>
                    <div className="text-xs text-muted">Priority: {task.priority ?? "Medium"}</div>
                    <div className="text-xs text-muted">SLA: {task.slaHours ?? 48} hrs</div>
                  </div>
                </div>
                <div className="text-xs text-muted mt-2">
                  Due {task.dueDate ? formatDate(task.dueDate) : "—"} · Updated {formatDate(task.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ServicePartnerDashboardLayout>
  );
}
