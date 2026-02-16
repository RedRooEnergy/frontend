import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Orders | RedRooEnergy",
  description: "Buyer orders list.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/buyer/orders" },
};

export default function Head() {
  return null;
}
