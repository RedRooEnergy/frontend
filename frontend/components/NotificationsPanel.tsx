import { useMemo } from "react";
import { listBuyerNotifications, markNotificationRead } from "../lib/notifications";
import { getSession } from "../lib/store";
import { recordAudit } from "../lib/audit";
import { formatDate } from "../lib/utils";

export default function NotificationsPanel() {
  const session = getSession();
  const notifications = useMemo(() => (session?.email ? listBuyerNotifications(session.email) : []), [session?.email]);

  const handleView = (id: string) => {
    markNotificationRead(id);
    recordAudit("BUYER_NOTIFICATION_VIEWED", { notificationId: id, buyerEmail: session?.email });
  };

  if (!session?.email) return null;

  return (
    <section className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notifications</h2>
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-muted">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-center justify-between text-sm bg-surface-muted rounded-md px-3 py-2">
              <div>
                <div className="font-semibold">{n.title}</div>
                <div className="text-muted">{n.body}</div>
                <div className="text-xs text-muted">{formatDate(n.createdAt)}</div>
              </div>
              <button
                className={`text-xs font-semibold px-2 py-1 rounded-md ${
                  n.read ? "bg-brand-100 text-brand-700" : "bg-brand-700 text-brand-100"
                }`}
                onClick={() => handleView(n.id)}
              >
                {n.read ? "Read" : "Mark read"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
