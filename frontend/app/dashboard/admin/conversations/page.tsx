import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import ChatDashboardClient from "../../../../components/chat/ChatDashboardClient";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";

function cookieHeaderFromStore() {
  const entries = cookies().getAll();
  return entries.map((entry) => `${entry.name}=${entry.value}`).join("; ");
}

export default function AdminConversationsPage() {
  const session = getSessionFromCookieHeader(cookieHeaderFromStore());
  if (!session || session.role !== "admin") {
    redirect("/signin?role=admin");
  }

  return (
    <AdminDashboardLayout title="Operational Conversations">
      <ChatDashboardClient role="ADMIN" title="Admin Conversation Monitor" />
    </AdminDashboardLayout>
  );
}
