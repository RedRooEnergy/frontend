import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cart | RedRooEnergy",
  description: "Cart for RedRooEnergy orders.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/cart" },
};

export default function Head() {
  return null;
}
