import { getServerActor } from "../../../lib/auth/serverActor";
import { getAuditLog, getPortalAccessAuditLog, getPortalLoginAuditLog } from "../../../lib/rbac/audit";
import { governanceListAudit } from "../../../lib/api/rbacGovernanceService";
import { hasPortalAccess } from "../../../lib/portal/config";

export default function PortalAuditPage() {
  const actor = getServerActor();
  if (!actor || !hasPortalAccess(actor.roles)) {
    return (
      <section className="rounded border border-red-800 bg-red-950/30 p-4">
        <h2 className="text-lg font-semibold">401 Unauthorized</h2>
      </section>
    );
  }
  if (!actor.roles.some((role) => ["RRE_ADMIN", "RRE_CEO", "DEVELOPER"].includes(role))) {
    return (
      <section className="rounded border border-red-800 bg-red-950/30 p-4">
        <h2 className="text-lg font-semibold">403 Forbidden</h2>
        <p className="text-sm text-red-200">Only Admin/CEO/Developer can view audit records.</p>
      </section>
    );
  }

  const authz = getAuditLog().slice(-20).reverse();
  const governance = governanceListAudit(actor).slice(-20).reverse();
  const login = getPortalLoginAuditLog().slice(-20).reverse();
  const portalAccess = getPortalAccessAuditLog().slice(-20).reverse();

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Portal Audit Viewer</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-slate-800 bg-slate-900 p-3">
          <h3 className="text-sm font-semibold mb-2">Portal login events</h3>
          <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300">
            {JSON.stringify(login, null, 2)}
          </pre>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900 p-3">
          <h3 className="text-sm font-semibold mb-2">Portal access events</h3>
          <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300">
            {JSON.stringify(portalAccess, null, 2)}
          </pre>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900 p-3">
          <h3 className="text-sm font-semibold mb-2">RBAC authorization events</h3>
          <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300">
            {JSON.stringify(authz, null, 2)}
          </pre>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900 p-3">
          <h3 className="text-sm font-semibold mb-2">Governance mutation events</h3>
          <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300">
            {JSON.stringify(governance, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}
