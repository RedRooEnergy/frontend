"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, SessionState } from "../lib/store";
import { listNotificationsForSession, markNotificationRead } from "../lib/notifications";
import { recordAudit } from "../lib/audit";
import { formatDate } from "../lib/utils";

export default function MessageBell() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    setSession(getSession());
    const handleStorage = () => setSession(getSession());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickAway = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const notifications = useMemo(() => (session ? listNotificationsForSession(session) : []), [session]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const isLoggedIn = Boolean(session);
  const isAlerting = unreadCount > 0;

  const handleView = (id: string, link?: string) => {
    markNotificationRead(id);
    recordAudit("NOTIFICATION_VIEWED", { notificationId: id, role: session?.role, email: session?.email });
    if (link) {
      router.push(link);
    }
    setOpen(false);
  };

  return (
    <div className="message-bell">
      <button
        ref={triggerRef}
        type="button"
        className={`message-bell-trigger h-12 w-12 rounded-full bg-surface text-text-700 font-semibold border flex items-center justify-center ${
          isAlerting ? "is-alerting" : ""
        }`}
        aria-label="Message Bell"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="message-bell-panel"
        onClick={() => {
          if (!isLoggedIn) {
            router.push("/signin");
            return;
          }
          setOpen((value) => !value);
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="message-bell-badge">{unreadCount}</span>}
      </button>

      {open && isLoggedIn && (
        <div
          id="message-bell-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="message-bell-panel"
        >
          <div className="message-bell-header">
            <div>
              <div className="message-bell-title">Message Bell</div>
              <div className="message-bell-subtitle">
                System alerts only. Actions happen on the linked page.
              </div>
            </div>
            {unreadCount > 0 && <span className="message-bell-unread">{unreadCount} new</span>}
          </div>

          {notifications.length === 0 ? (
            <div className="message-bell-empty">No notifications yet.</div>
          ) : (
            <div className="message-bell-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`message-bell-item ${notification.read ? "" : "is-unread"}`}
                >
                  <div className="message-bell-item-title">{notification.title}</div>
                  <div className="message-bell-item-body">{notification.body}</div>
                  <div className="message-bell-meta">
                    <span>{formatDate(notification.createdAt)}</span>
                    <span className="message-bell-meta-dot">•</span>
                    <span>{notification.source ?? "system"}</span>
                  </div>
                  <div className="message-bell-actions">
                    <button
                      type="button"
                      className={`message-bell-action ${notification.read ? "is-read" : ""}`}
                      onClick={() => handleView(notification.id, notification.link)}
                    >
                      {notification.link ? "View" : "Acknowledge"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
