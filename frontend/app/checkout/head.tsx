import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout | RedRooEnergy",
  description: "Checkout for RedRooEnergy orders.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default function Head() {
  return null;
}
