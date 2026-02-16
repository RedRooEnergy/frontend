import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Dashboard | RedRooEnergy",
  description: "Buyer dashboard overview.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/buyer" },
};

export default function Head() {
  return null;
}
