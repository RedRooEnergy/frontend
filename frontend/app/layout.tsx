import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "RedRoo Governance Marketplace",
  description: "Governed marketplace with enforced pricing, compliance, and audit integrity.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          <header className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-widest text-emerald-300">Governed by Design</div>
              <h1 className="text-2xl font-semibold">RedRoo Energy Marketplace</h1>
            </div>
            <nav className="flex gap-4 text-sm text-slate-300">
              <a href="/">Home</a>
              <a href="/about">About</a>
              <a href="/how-it-works">How it Works</a>
              <a href="/compliance">Compliance</a>
              <a href="/contact">Contact</a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
