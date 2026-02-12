"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RoleName } from "../../lib/rbac/types";

const PORTAL_ROLE_OPTIONS: RoleName[] = ["RRE_ADMIN", "RRE_FINANCE", "RRE_CEO", "DEVELOPER", "RRE_MARKETING"];

const ROLE_EMAIL_DEFAULTS: Record<RoleName, string> = {
  RRE_ADMIN: "admin@redroo.test",
  RRE_FINANCE: "finance@redroo.test",
  RRE_CEO: "ceo@redroo.test",
  DEVELOPER: "developer@redroo.test",
  RRE_MARKETING: "marketing@redroo.test",
  BUYER: "buyer@redroo.test",
  SUPPLIER: "supplier@redroo.test",
  FREIGHT: "freight@redroo.test",
  INSTALLER: "installer@redroo.test",
};

export function PortalLoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<RoleName>("RRE_ADMIN");
  const [email, setEmail] = useState(ROLE_EMAIL_DEFAULTS.RRE_ADMIN);
  const [password, setPassword] = useState("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Portal login failed");
      }
      router.push(body.redirectPath || "/portal/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Portal login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4 rounded border border-slate-800 bg-slate-900 p-5" onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold">Governance Portal Login</h2>
      <p className="text-xs text-slate-400">Direct dashboard access for Admin, Finance, CEO, Developer, and Marketing roles.</p>
      <div className="space-y-1">
        <label htmlFor="portal-role" className="text-sm text-slate-300">
          Role
        </label>
        <select
          id="portal-role"
          value={role}
          onChange={(event) => {
            const nextRole = event.target.value as RoleName;
            setRole(nextRole);
            setEmail(ROLE_EMAIL_DEFAULTS[nextRole]);
          }}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          {PORTAL_ROLE_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="portal-email" className="text-sm text-slate-300">
          Email
        </label>
        <input
          id="portal-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          type="email"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="portal-password" className="text-sm text-slate-300">
          Password
        </label>
        <input
          id="portal-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          type="password"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in to portal"}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </form>
  );
}

