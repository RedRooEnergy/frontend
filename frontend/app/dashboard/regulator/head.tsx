import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regulator Audit View | RedRooEnergy",
  description: "Regulator and auditor read-only dashboard.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/regulator" },
};

export default function Head() {
  return null;
}
