import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChatDashboardClient from "../../../../components/chat/ChatDashboardClient";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";

function cookieHeaderFromStore() {
  const entries = cookies().getAll();
  return entries.map((entry) => `${entry.name}=${entry.value}`).join("; ");
}

export default function SupplierMessagesPage() {
  const session = getSessionFromCookieHeader(cookieHeaderFromStore());
  if (!session || session.role !== "supplier") {
    redirect("/signin?role=supplier");
  }

  return <ChatDashboardClient role="SUPPLIER" title="Supplier Operational Chat" />;
}
