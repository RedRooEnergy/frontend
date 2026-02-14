import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import ChatDashboardClient from "../../../../components/chat/ChatDashboardClient";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";

function cookieHeaderFromStore() {
  const entries = cookies().getAll();
  return entries.map((entry) => `${entry.name}=${entry.value}`).join("; ");
}

export default function BuyerMessagesPage() {
  const session = getSessionFromCookieHeader(cookieHeaderFromStore());
  if (!session || session.role !== "buyer") {
    redirect("/signin?role=buyer");
  }

  return (
    <BuyerDashboardLayout title="Messages & Notifications">
      <ChatDashboardClient role="BUYER" title="Buyer Operational Chat" />
    </BuyerDashboardLayout>
  );
}
