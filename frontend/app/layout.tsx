import type { ReactNode } from "react";
import "./globals.css";
import { I18nProvider } from "../components/I18nProvider";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata = {
  title: "RedRoo Governance Marketplace",
  description: "Governed marketplace with enforced pricing, compliance, and audit integrity.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const supplierPhaseOn = process.env.NEXT_PUBLIC_SUPPLIER_PHASE === "on";
  const adminPhaseOn = process.env.NEXT_PUBLIC_ADMIN_PHASE === "on";
  const ext02On = process.env.NEXT_PUBLIC_EXT02 === "on";
  const ext03On = process.env.NEXT_PUBLIC_EXT03 === "on";
  const ext04On = process.env.NEXT_PUBLIC_EXT04 === "on";
  const ext05On = process.env.NEXT_PUBLIC_EXT05 === "on";
  const isProd = process.env.NODE_ENV === "production";
  const bannerOn = !isProd && (supplierPhaseOn || adminPhaseOn || ext02On || ext03On || ext04On || ext05On);
  const phases = [
    supplierPhaseOn ? "Supplier" : "",
    adminPhaseOn ? "Admin" : "",
    ext02On || ext03On || ext04On || ext05On ? "Wave 1 Extensions" : "",
  ]
    .filter(Boolean)
    .join(" / ");
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-muted text-strong antialiased">
        {bannerOn && (
          <div className="w-full bg-amber-100 text-amber-900 text-center text-sm py-2 border-b border-amber-200">
            STAGING — {phases} Enabled (feature-flag)
          </div>
        )}
        <I18nProvider>
          <Header />
        </I18nProvider>
        {children}
        <Footer />
      </body>
    </html>
  );
}
