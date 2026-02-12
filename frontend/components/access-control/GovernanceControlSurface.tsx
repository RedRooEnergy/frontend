"use client";

import { useEffect, useMemo, useState } from "react";
import { DOMAIN_SUBJECTS } from "../../lib/rbac/defaults";

type RoleRecord = { id: string; name: string; description: string };
type PermissionRecord = { id: string; subject: string; action: string; name: string };
type UserRecord = { id: string; email: string; name: string; locked: boolean; roleIds: string[] };
type GovernanceAuditRecord = {
  id: string;
  timestampUtc: string;
  actorUserId: string;
  actorRole: string;
  operation: string;
  targetType: string;
  targetId: string;
  reason: string;
  hash: string;
  previousHash: string;
};

const DOMAIN_ORDER = ["buyer", "supplier", "freight", "installer", "admin", "finance", "marketing", "ceo"] as const;

function titleForDomain(domain: string) {
  return domain.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function jsonRequest(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

export function GovernanceControlSurface() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [audit, setAudit] = useState<GovernanceAuditRecord[]>([]);
  const [rolePermissionIds, setRolePermissionIds] = useState<Record<string, Set<string>>>({});
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [reason, setReason] = useState("Governance control surface update");
  const [pendingRoleByUser, setPendingRoleByUser] = useState<Record<string, string>>({});

  const roleIds = useMemo(() => roles.map((role) => role.id), [roles]);

  async function refreshCore() {
    const [rolesPayload, permissionsPayload, usersPayload, auditPayload] = await Promise.all([
      jsonRequest("/api/rbac/roles"),
      jsonRequest("/api/rbac/permissions"),
      jsonRequest("/api/rbac/users"),
      jsonRequest("/api/rbac/audit"),
    ]);
    setRoles(rolesPayload.roles || []);
    setPermissions(permissionsPayload.permissions || []);
    setUsers(usersPayload.users || []);
    setAudit(auditPayload.entries || []);
  }

  async function refreshRolePermissions(currentRoles: RoleRecord[]) {
    const map: Record<string, Set<string>> = {};
    await Promise.all(
      currentRoles.map(async (role) => {
        const payload = await jsonRequest(`/api/rbac/role/${encodeURIComponent(role.id)}/permissions`);
        map[role.id] = new Set((payload.permissions || []).map((permission: PermissionRecord) => permission.id));
      })
    );
    setRolePermissionIds(map);
  }

  async function refreshAll() {
    await refreshCore();
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    if (roles.length) {
      void refreshRolePermissions(roles);
    }
  }, [roles]);

  async function applyPermission(roleId: string, permissionId: string, enable: boolean) {
    await jsonRequest(`/api/rbac/role/${encodeURIComponent(roleId)}/permission`, {
      method: enable ? "POST" : "DELETE",
      body: JSON.stringify({ permissionId, reason }),
    });
  }

  async function toggleDomainAccess(roleId: string, domain: keyof typeof DOMAIN_SUBJECTS, mode: "READ" | "MUTATE", enable: boolean) {
    const subjects = DOMAIN_SUBJECTS[domain];
    const candidateIds = permissions
      .filter((permission) => subjects.includes(permission.subject as any))
      .filter((permission) => (mode === "READ" ? permission.action === "READ" : permission.action !== "READ"))
      .map((permission) => permission.id);

    if (!candidateIds.length) {
      return;
    }

    const currentlyAssigned = rolePermissionIds[roleId] || new Set<string>();
    const toApply = enable ? candidateIds.filter((id) => !currentlyAssigned.has(id)) : candidateIds.filter((id) => currentlyAssigned.has(id));

    if (!toApply.length) return;

    const key = `toggle:${roleId}:${domain}:${mode}`;
    setBusyKey(key);
    setMessage("");
    try {
      for (const permissionId of toApply) {
        await applyPermission(roleId, permissionId, enable);
      }
      await refreshRolePermissions(roles);
      const auditPayload = await jsonRequest("/api/rbac/audit");
      setAudit(auditPayload.entries || []);
      setMessage(`Updated ${mode} access for ${roleId} on ${domain}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update permission set");
    } finally {
      setBusyKey("");
    }
  }

  async function assignRole(userId: string) {
    const nextRole = pendingRoleByUser[userId];
    if (!nextRole) return;
    const key = `assign:${userId}:${nextRole}`;
    setBusyKey(key);
    setMessage("");
    try {
      await jsonRequest(`/api/rbac/user/${encodeURIComponent(userId)}/role`, {
        method: "POST",
        body: JSON.stringify({ roleId: nextRole, reason }),
      });
      await refreshAll();
      await refreshRolePermissions(roles);
      setMessage(`Assigned role ${nextRole} to ${userId}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to assign role");
    } finally {
      setBusyKey("");
    }
  }

  async function removeRole(userId: string, roleId: string) {
    const key = `remove:${userId}:${roleId}`;
    setBusyKey(key);
    setMessage("");
    try {
      await jsonRequest(`/api/rbac/user/${encodeURIComponent(userId)}/role`, {
        method: "DELETE",
        body: JSON.stringify({ roleId, reason }),
      });
      await refreshAll();
      await refreshRolePermissions(roles);
      setMessage(`Removed role ${roleId} from ${userId}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to remove role");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Change reason</h3>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          placeholder="Required reason for governance mutation"
        />
        {message ? <p className="text-xs text-slate-300">{message}</p> : null}
      </section>

      <section className="rounded border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Role Assignment Panel</h3>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="p-2">User</th>
                <th className="p-2">Current roles</th>
                <th className="p-2">Assign role</th>
                <th className="p-2">Remove role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-800">
                  <td className="p-2">
                    <p className="text-slate-100">{user.name}</p>
                    <p className="text-slate-400">{user.email}</p>
                    {user.locked ? <p className="text-amber-300">Developer account (locked)</p> : null}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {user.roleIds.map((roleId) => (
                        <span key={roleId} className="rounded border border-slate-700 px-2 py-1">
                          {roleId}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <select
                        value={pendingRoleByUser[user.id] || ""}
                        onChange={(event) => setPendingRoleByUser((prev) => ({ ...prev, [user.id]: event.target.value }))}
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1"
                      >
                        <option value="">Select role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.id}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded bg-emerald-700 px-2 py-1 text-white disabled:opacity-50"
                        disabled={!pendingRoleByUser[user.id] || !!busyKey}
                        onClick={() => assignRole(user.id)}
                      >
                        {busyKey === `assign:${user.id}:${pendingRoleByUser[user.id]}` ? "..." : "Assign"}
                      </button>
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      {user.roleIds.map((roleId) => (
                        <button
                          key={`${user.id}:${roleId}`}
                          className="rounded border border-red-700 px-2 py-1 text-red-300 disabled:opacity-50"
                          disabled={!!busyKey || user.locked}
                          onClick={() => removeRole(user.id, roleId)}
                        >
                          Remove {roleId}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Dashboard Access Matrix Panel</h3>
        <p className="text-xs text-slate-400">Rows are dashboard domains. Columns are roles with READ and MUTATE toggles.</p>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="p-2">Dashboard Domain</th>
                {roleIds.map((roleId) => (
                  <th key={roleId} className="p-2">
                    {roleId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOMAIN_ORDER.map((domain) => {
                const subjects = DOMAIN_SUBJECTS[domain];
                const readIds = permissions
                  .filter((permission) => subjects.includes(permission.subject as any) && permission.action === "READ")
                  .map((permission) => permission.id);
                const mutateIds = permissions
                  .filter((permission) => subjects.includes(permission.subject as any) && permission.action !== "READ")
                  .map((permission) => permission.id);

                return (
                  <tr key={domain} className="border-t border-slate-800">
                    <td className="p-2">{titleForDomain(domain)}</td>
                    {roleIds.map((roleId) => {
                      const assigned = rolePermissionIds[roleId] || new Set<string>();
                      const readOn = readIds.length > 0 && readIds.every((id) => assigned.has(id));
                      const mutateOn = mutateIds.length > 0 && mutateIds.every((id) => assigned.has(id));

                      return (
                        <td key={`${domain}:${roleId}`} className="p-2">
                          <label className="mr-2 inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={readOn}
                              disabled={!!busyKey}
                              onChange={(event) => toggleDomainAccess(roleId, domain, "READ", event.target.checked)}
                            />
                            <span>R</span>
                          </label>
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={mutateOn}
                              disabled={!!busyKey}
                              onChange={(event) => toggleDomainAccess(roleId, domain, "MUTATE", event.target.checked)}
                            />
                            <span>M</span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Governance Audit History</h3>
        <div className="max-h-80 overflow-auto rounded border border-slate-800">
          <table className="min-w-full text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="p-2">Timestamp</th>
                <th className="p-2">Actor</th>
                <th className="p-2">Operation</th>
                <th className="p-2">Target</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-800">
                  <td className="p-2">{entry.timestampUtc}</td>
                  <td className="p-2">
                    {entry.actorUserId} ({entry.actorRole})
                  </td>
                  <td className="p-2">{entry.operation}</td>
                  <td className="p-2">
                    {entry.targetType}:{entry.targetId}
                  </td>
                  <td className="p-2">{entry.reason}</td>
                  <td className="p-2 font-mono">{entry.hash.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

