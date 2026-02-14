import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "./_components/AdminSidebar";
import AdminTopBar from "./_components/AdminTopBar";
import { getSessionFromCookieHeader } from "../../lib/auth/sessionCookie";

function cookieHeaderFromStore() {
  const entries = cookies().getAll();
  return entries.map((entry) => `${entry.name}=${entry.value}`).join("; ");
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const session = getSessionFromCookieHeader(cookieHeaderFromStore());
  if (!session || session.role !== "admin") {
    redirect("/signin?role=admin");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 md:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <section className="space-y-4">
          <AdminTopBar
            title="Grand-Master Dashboard"
            subtitle="Governed control surface. All mutations require reason and immutable audit receipts."
          />
          {children}
        </section>
      </main>
    </div>
  );
}
