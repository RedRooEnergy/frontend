/**
 * ServicePartnerShell
 * Read-only UI wired to EXT-08 routes.
 * No mutations, no commands, no inferred state.
 */

import { useEffect, useState } from "react";
import {
  emitServicePartnerTaskListView
} from "../events/servicePartner.events";

type TaskProjection = {
  task: {
    taskId: string;
    taskType: string;
    state: string;
    relatedEntity?: any;
    requiredEvidenceTypes?: string[];
  };
  assignment: {
    assignmentId: string;
    state: string;
  };
};

export default function ServicePartnerShell() {
  const [tasks, setTasks] = useState<TaskProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch("/service-partner/tasks");
        const data = await res.json();
        setTasks(data.tasks || []);
        emitServicePartnerTaskListView();
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  if (loading) {
    return <p>Loading assigned tasks…</p>;
  }

  if (!tasks.length) {
    return <p>No tasks assigned.</p>;
  }

  return (
    <div>
      <h1>Service Partner Tasks</h1>

      <ul>
        {tasks.map((item, index) => (
          <li key={index}>
            <strong>Task:</strong> {item.task.taskType}  
            <br />
            <strong>Status:</strong> {item.task.state}  
            <br />
            <strong>Assignment:</strong> {item.assignment.state}
          </li>
        ))}
      </ul>
    </div>
  );
}
