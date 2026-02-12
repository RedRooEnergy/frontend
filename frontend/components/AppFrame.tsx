"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortalRoute = pathname.startsWith("/portal");

  if (isPortalRoute) {
    return <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">{children}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-widest text-emerald-300">Governed by Design</div>
          <h1 className="text-2xl font-semibold">RedRoo Energy Marketplace</h1>
        </div>
        <nav className="flex gap-4 text-sm text-slate-300">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/how-it-works">How it Works</Link>
          <Link href="/compliance">Compliance</Link>
          <Link href="/access-control">Access Control</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

