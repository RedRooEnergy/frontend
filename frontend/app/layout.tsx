import type { ReactNode } from "react";
import "./globals.css";
import { AppFrame } from "../components/AppFrame";

export const metadata = {
  title: "RedRoo Governance Marketplace",
  description: "Governed marketplace with enforced pricing, compliance, and audit integrity.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
