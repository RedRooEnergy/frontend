import type { Metadata } from "next";
import BestDealsPage from "../../components/BestDealsPage";

export const metadata: Metadata = {
  title: "Weekly Best Deals | RedRooEnergy",
  description: "Platform-approved best deals across solar, storage, and energy categories on RedRooEnergy.",
  alternates: {
    canonical: "/best-deals",
  },
};

export default function BestDeals() {
  return <BestDealsPage />;
}
