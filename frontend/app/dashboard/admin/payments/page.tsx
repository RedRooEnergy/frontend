import PaymentsClient from "./payments-client";

export const metadata = {
  title: "Grand-Master Payments | RedRooEnergy",
  robots: { index: false, follow: false },
};

export default function AdminPaymentsPage() {
  return <PaymentsClient />;
}
