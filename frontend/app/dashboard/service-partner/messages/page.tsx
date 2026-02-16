"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ServicePartnerDashboardLayout from "../../../../components/ServicePartnerDashboardLayout";
import { getSession } from "../../../../lib/store";
import { listNotificationsForSession } from "../../../../lib/notifications";
import { formatDate } from "../../../../lib/utils";
import Link from "next/link";

export default function ServicePartnerMessagesPage() {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "service-partner") {
      router.replace("/signin?role=service-partner");
    }
  }, [router, session]);

  const notifications = useMemo(() => listNotificationsForSession(session), [session]);

  return (
    <ServicePartnerDashboardLayout title="Messages & Notifications">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">System notifications</div>
          <div className="text-xs text-muted">Role-scoped alerts</div>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((note) => (
              <div key={note.id} className="buyer-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{note.title}</div>
                    <div className="text-xs text-muted">{note.body}</div>
                  </div>
                  <div className="text-xs text-muted">{formatDate(note.createdAt)}</div>
                </div>
                {note.link && (
                  <Link href={note.link} className="text-xs text-brand-700 font-semibold">
                    View related task
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ServicePartnerDashboardLayout>
  );
}
