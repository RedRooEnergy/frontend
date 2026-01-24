/**
 * NotificationsShell
 * Read-only UI wired to EXT-13 notification routes.
 * No acknowledgement, no mutation, no inferred state.
 */

import { useEffect, useState } from "react";
import {
  emitNotificationListViewed
} from "../events/notifications.events";

type NotificationProjection = {
  notificationId: string;
  category: string;
  title: string;
  message: string;
  createdAt: string;
  deliveryChannel: string;
  state: string;
};

export default function NotificationsShell() {
  const [notifications, setNotifications] = useState<NotificationProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/notifications");
        const data = await res.json();
        setNotifications(data.notifications || []);
        emitNotificationListViewed();
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, []);

  if (loading) {
    return <p>Loading notifications…</p>;
  }

  if (!notifications.length) {
    return <p>No notifications available.</p>;
  }

  return (
    <div>
      <h1>Notifications</h1>

      <ul>
        {notifications.map(n => (
          <li key={n.notificationId}>
            <strong>{n.title}</strong> ({n.category})
            <br />
            {n.message}
            <br />
            <small>
              {n.deliveryChannel} • {new Date(n.createdAt).toLocaleString()} • {n.state}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
