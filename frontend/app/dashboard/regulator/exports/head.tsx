import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regulator Evidence Pack | RedRooEnergy",
  description: "Audit export and evidence pack dashboard.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/regulator/exports" },
};

export default function Head() {
  return null;
}
