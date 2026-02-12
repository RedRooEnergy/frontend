"use client";

import { useRouter } from "next/navigation";

export function PortalLogoutButton() {
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  }

  return (
    <button className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800" onClick={onLogout}>
      Logout
    </button>
  );
}

