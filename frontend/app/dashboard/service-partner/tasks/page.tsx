"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ServicePartnerDashboardLayout from "../../../../components/ServicePartnerDashboardLayout";
import {
  getServicePartnerTasks,
  getSession,
  ServicePartnerTask,
  updateServicePartnerTask,
} from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

export default function ServicePartnerTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ServicePartnerTask[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "service-partner") {
      router.replace("/signin?role=service-partner");
      return;
    }
    const existing = getServicePartnerTasks().filter((task) => task.servicePartnerId === session.userId);
    setTasks(existing);
  }, [router]);

  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "COMPLETED"), [tasks]);

  const updateTask = (taskId: string, status: ServicePartnerTask["status"]) => {
    updateServicePartnerTask(taskId, { status });
    setTasks((prev) => prev.map((task) => (task.taskId === taskId ? { ...task, status } : task)));
  };

  return (
    <ServicePartnerDashboardLayout title="Task Management">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Active task workflow</div>
          <div className="text-xs text-muted">Checklists, evidence capture, completion</div>
        </div>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-muted">No active tasks.</p>
        ) : (
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <div key={task.taskId} className="buyer-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted">{task.taskType.replace(/_/g, " ")}</div>
                    <div className="text-base font-semibold">{task.title}</div>
                    {task.orderId && <div className="text-xs text-muted">Order {task.orderId}</div>}
                    <div className="text-xs text-muted">Status: {task.status.replace(/_/g, " ")}</div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    Due {task.dueDate ? formatDate(task.dueDate) : "—"}
                  </div>
                </div>

                <div className="buyer-form-grid mt-3">
                  <div>
                    <div className="text-xs text-muted">Checklist</div>
                    <ul className="text-sm list-disc ml-4">
                      {(task.checklist ?? ["Review scope", "Complete work", "Upload evidence"]).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Evidence required</div>
                    <ul className="text-sm list-disc ml-4">
                      {(task.evidenceRequired ?? ["Photos", "Completion report"]).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {task.status === "ASSIGNED" && (
                    <button
                      className="px-3 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
                      onClick={() => updateTask(task.taskId, "IN_PROGRESS")}
                    >
                      Mark in progress
                    </button>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <>
                      <button
                        className="px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                        onClick={() => updateTask(task.taskId, "EVIDENCE_REQUIRED")}
                      >
                        Request evidence
                      </button>
                      <button
                        className="px-3 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
                        onClick={() => updateTask(task.taskId, "COMPLETED")}
                      >
                        Mark complete
                      </button>
                    </>
                  )}
                  {task.status === "EVIDENCE_REQUIRED" && (
                    <button
                      className="px-3 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
                      onClick={() => updateTask(task.taskId, "COMPLETED")}
                    >
                      Mark complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ServicePartnerDashboardLayout>
  );
}
