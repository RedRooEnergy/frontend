import SettlementsClient from "./settlements-client";

export const metadata = {
  title: "Grand-Master Settlements | RedRooEnergy",
  robots: { index: false, follow: false },
};

export default function AdminSettlementsPage() {
  return <SettlementsClient />;
}
