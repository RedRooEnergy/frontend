"use client";

import { useEffect, useState } from "react";
import { getAuthAttempts, clearAuthAttempts, getSession, AuthAttemptRecord } from "../../../../lib/store";

export default function AdminAuthAttemptsPage() {
  const [attempts, setAttempts] = useState<AuthAttemptRecord[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "admin") return;
    setAttempts(getAuthAttempts().slice().reverse());
  }, []);

  const handleClear = () => {
    clearAuthAttempts();
    setAttempts([]);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sign-In / Sign-Up Attempts</h1>
            <p className="text-sm text-muted">All authentication form submissions captured for audit.</p>
          </div>
          <button className="text-sm text-brand-700" onClick={handleClear}>
            Clear log
          </button>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
            No attempts recorded yet.
          </div>
        ) : (
          <div className="bg-surface rounded-2xl shadow-card border overflow-hidden">
            <div className="grid grid-cols-7 gap-2 text-xs text-muted font-semibold px-4 py-3 border-b">
              <span>Time</span>
              <span>Type</span>
              <span>Status</span>
              <span>Role</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Step / Error</span>
            </div>
            {attempts.map((attempt) => (
              <div key={attempt.id} className="grid grid-cols-7 gap-2 px-4 py-3 border-b text-sm">
                <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                <span>{attempt.type}</span>
                <span className={attempt.status === "FAILED" ? "text-rose-600" : "text-emerald-600"}>
                  {attempt.status}
                </span>
                <span>{attempt.role || "-"}</span>
                <span>{attempt.email || "-"}</span>
                <span>{attempt.phone || "-"}</span>
                <span className="text-xs text-muted">
                  {attempt.step || "-"} {attempt.error ? `· ${attempt.error}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
