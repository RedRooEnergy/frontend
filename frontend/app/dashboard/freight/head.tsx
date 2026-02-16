import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Freight Operations | RedRooEnergy",
  description: "Freight and logistics dashboard.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/freight" },
};

export default function Head() {
  return null;
}
