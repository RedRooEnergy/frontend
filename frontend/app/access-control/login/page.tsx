import { LoginForm } from "../../../components/access-control/LoginForm";

export default function AccessControlLoginPage() {
  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h2 className="text-2xl font-semibold">Access Control Demo Sign-in</h2>
      <p className="text-sm text-slate-300">
        This sign-in is for RBAC demonstration only. It issues a signed token, sets an HTTP-only cookie, and applies permission
        enforcement on API routes and dashboard views.
      </p>
      <LoginForm />
    </section>
  );
}

