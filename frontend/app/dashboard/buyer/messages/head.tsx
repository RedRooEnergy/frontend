import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Messages | RedRooEnergy",
  description: "Buyer notifications and messages dashboard.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/buyer/messages" },
};

export default function Head() {
  return null;
}
