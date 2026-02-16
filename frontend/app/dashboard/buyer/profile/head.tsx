import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Profile | RedRooEnergy",
  description: "Manage buyer profile.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/buyer/profile" },
};

export default function Head() {
  return null;
}
