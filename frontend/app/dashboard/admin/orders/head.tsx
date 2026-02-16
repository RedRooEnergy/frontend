import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grand-Master Orders & Escalations | RedRooEnergy",
  description: "Orders, escalations, and dispute monitoring dashboard.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/admin/orders" },
};

export default function Head() {
  return null;
}
