import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grand-Master Users | RedRooEnergy",
  description: "User and role management dashboard.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/admin/users" },
};

export default function Head() {
  return null;
}
