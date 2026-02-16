import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Warranty Claim | RedRooEnergy",
  description: "Submit a warranty claim",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/buyer/warranties/new" },
};

export default function Head() {
  return null;
}
