"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RoleNames, type RoleName } from "../../lib/rbac/types";

const DEMO_USERS: Record<RoleName, string> = {
  BUYER: "buyer@redroo.test",
  SUPPLIER: "supplier@redroo.test",
  FREIGHT: "freight@redroo.test",
  INSTALLER: "installer@redroo.test",
  DEVELOPER: "developer@redroo.test",
  RRE_ADMIN: "admin@redroo.test",
  RRE_FINANCE: "finance@redroo.test",
  RRE_CEO: "ceo@redroo.test",
  RRE_MARKETING: "marketing@redroo.test",
};

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<RoleName>("BUYER");
  const [email, setEmail] = useState(DEMO_USERS.BUYER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const roleOptions = useMemo(() => RoleNames, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Login failed");
      }
      router.push("/access-control/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4 rounded border border-slate-800 bg-slate-900 p-5" onSubmit={onSubmit}>
      <div className="space-y-1">
        <label className="text-sm text-slate-300" htmlFor="role">
          Role
        </label>
        <select
          id="role"
          value={role}
          onChange={(event) => {
            const nextRole = event.target.value as RoleName;
            setRole(nextRole);
            setEmail(DEMO_USERS[nextRole]);
          }}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm text-slate-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        disabled={busy}
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <p className="text-xs text-slate-400">Demo users are seeded in-memory for local validation.</p>
    </form>
  );
}
