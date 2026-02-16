import Link from "next/link";
import AuthTabs from "../../components/AuthTabs";

export default function SignInPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const tab = (searchParams?.tab as string) || "signin";
  const role = (searchParams?.role as string) || "buyer";
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <section className="bg-surface rounded-2xl shadow-card border p-6 space-y-2">
        <h1 className="text-2xl font-bold">Sign in to RedRooEnergy</h1>
        <p className="text-sm text-muted">
          If the interactive sign-in panel does not load, refresh this page or use the direct links below.
        </p>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            href={`/signin?role=${encodeURIComponent(role)}&tab=signin`}
            className="px-3 py-2 rounded-full bg-brand-700 text-brand-100"
          >
            Open sign-in for {role}
          </Link>
          <Link
            href="/signin?tab=register"
            className="px-3 py-2 rounded-full border border-brand-700 text-brand-700"
          >
            Create a buyer account
          </Link>
        </div>
      </section>
      <AuthTabs defaultTab={tab as any} initialRole={role} />
    </div>
  );
}
