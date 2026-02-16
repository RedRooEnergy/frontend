import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Wish List | RedRooEnergy",
  description: "Buyer saved products dashboard.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard/buyer/wishlist" },
};

export default function Head() {
  return null;
}
