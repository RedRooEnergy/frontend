"use client";

import { useEffect, useMemo, useState } from "react";

type ProfileRow = {
  id: string;
  entityId: string;
  entityType: string;
  slug: string;
  approvalStatus: string;
  certificationStatus: string;
  insuranceStatus: string;
  slugLocked: boolean;
  verificationBadges: {
    rreVerified: boolean;
    complianceVerified: boolean;
    insuranceVerified: boolean;
  };
};

type SnapshotRow = {
  id: string;
  entityId: string;
  entityType: string;
  version: number;
  status: string;
  renderedHash: string | null;
  publishedAt: string | null;
};

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

function seedTemplate(entityType: string) {
  const base: any = {
    homepage: { title: `${entityType} profile`, subtitle: "Verified marketplace participant", overview: "" },
    contact: { info: "Contact via RRE" },
    terms: { summary: "Platform terms apply." },
  };

  if (entityType === "SUPPLIER" || entityType === "INSURANCE") {
    base.products = { summary: "" };
  }
  if (entityType === "INSTALLER" || entityType === "CERTIFIER") {
    base.services = { summary: "" };
  }
  if (entityType === "SUPPLIER" || entityType === "INSTALLER") {
    base.warranty = { summary: "" };
  }

  return base;
}

export default function AdminPublicSitesPanel() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [message, setMessage] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [newProfile, setNewProfile] = useState({ entityId: "", entityType: "SUPPLIER", desiredSlug: "" });
  const [busy, setBusy] = useState(false);

  const filteredProfiles = useMemo(
    () => profiles.filter((row) => filterType === "ALL" || row.entityType === filterType),
    [profiles, filterType]
  );

  async function refresh() {
    const [profilesPayload, snapshotsPayload] = await Promise.all([
      jsonRequest("/api/admin/public-sites/profiles"),
      jsonRequest("/api/admin/public-sites/snapshots"),
    ]);
    setProfiles(profilesPayload.rows || []);
    setSnapshots(snapshotsPayload.rows || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createProfile() {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest("/api/admin/public-sites/profiles/upsert", {
        method: "POST",
        body: JSON.stringify(newProfile),
      });
      await refresh();
      setMessage("Profile upserted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function publish(row: ProfileRow) {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest("/api/admin/public-sites/publish", {
        method: "POST",
        body: JSON.stringify({ entityId: row.entityId, entityType: row.entityType }),
      });
      await refresh();
      setMessage(`Published ${row.slug}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  async function suspend(row: ProfileRow) {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest("/api/admin/public-sites/suspend", {
        method: "POST",
        body: JSON.stringify({ entityId: row.entityId, entityType: row.entityType }),
      });
      await refresh();
      setMessage(`Suspended ${row.slug}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to suspend");
    } finally {
      setBusy(false);
    }
  }

  async function approve(row: ProfileRow) {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest(`/api/admin/public-sites/profiles/${encodeURIComponent(row.id)}/status`, {
        method: "POST",
        body: JSON.stringify({ approvalStatus: "APPROVED" }),
      });
      const hasDraft = snapshots.some(
        (snapshot) => snapshot.entityId === row.entityId && snapshot.entityType === row.entityType && snapshot.status === "DRAFT"
      );
      if (!hasDraft) {
        await jsonRequest("/api/admin/public-sites/draft/upsert", {
          method: "POST",
          body: JSON.stringify({
            entityId: row.entityId,
            entityType: row.entityType,
            contentJSON: seedTemplate(row.entityType),
            seoMeta: { title: row.slug, description: `${row.entityType} profile`, canonicalPath: `/${row.entityType.toLowerCase()}s/${row.slug}` },
          }),
        });
      }
      await refresh();
      setMessage(`Approved ${row.slug}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  async function addSeedDraft(row: ProfileRow) {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest("/api/admin/public-sites/draft/upsert", {
        method: "POST",
        body: JSON.stringify({
          entityId: row.entityId,
          entityType: row.entityType,
          contentJSON: seedTemplate(row.entityType),
          seoMeta: {
            title: row.slug,
            description: `${row.entityType} verified participant profile`,
            canonicalPath:
              row.entityType === "SUPPLIER"
                ? `/suppliers/${row.slug}`
                : row.entityType === "INSTALLER"
                  ? `/installers/${row.slug}`
                  : row.entityType === "CERTIFIER"
                    ? `/certifiers/${row.slug}`
                    : `/insurance/${row.slug}`,
          },
        }),
      });
      await refresh();
      setMessage(`Draft created for ${row.slug}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create draft");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-lg font-semibold">Create / Upsert Profile</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="entityId (e.g. usr-supplier-1)"
            value={newProfile.entityId}
            onChange={(event) => setNewProfile((prev) => ({ ...prev, entityId: event.target.value }))}
          />
          <select
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={newProfile.entityType}
            onChange={(event) => setNewProfile((prev) => ({ ...prev, entityType: event.target.value }))}
          >
            <option>SUPPLIER</option>
            <option>CERTIFIER</option>
            <option>INSTALLER</option>
            <option>INSURANCE</option>
          </select>
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="desired slug"
            value={newProfile.desiredSlug}
            onChange={(event) => setNewProfile((prev) => ({ ...prev, desiredSlug: event.target.value }))}
          />
        </div>
        <button className="rounded border px-3 py-2 text-sm font-semibold" onClick={createProfile} disabled={busy}>
          Upsert profile
        </button>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Public Profiles</h3>
          <select
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
          >
            <option value="ALL">All types</option>
            <option value="SUPPLIER">SUPPLIER</option>
            <option value="CERTIFIER">CERTIFIER</option>
            <option value="INSTALLER">INSTALLER</option>
            <option value="INSURANCE">INSURANCE</option>
          </select>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="p-2">Type</th>
                <th className="p-2">Slug</th>
                <th className="p-2">Approval</th>
                <th className="p-2">Statuses</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="p-2">{row.entityType}</td>
                  <td className="p-2 font-mono">{row.slug}</td>
                  <td className="p-2">{row.approvalStatus}</td>
                  <td className="p-2">
                    cert:{row.certificationStatus} / ins:{row.insuranceStatus}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded border px-2 py-1" onClick={() => approve(row)} disabled={busy}>
                        Approve
                      </button>
                      <button className="rounded border px-2 py-1" onClick={() => addSeedDraft(row)} disabled={busy}>
                        Draft
                      </button>
                      <button className="rounded border px-2 py-1" onClick={() => publish(row)} disabled={busy}>
                        Publish
                      </button>
                      <button className="rounded border px-2 py-1" onClick={() => suspend(row)} disabled={busy}>
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredProfiles.length ? <p className="p-2 text-xs text-slate-500">No profiles found.</p> : null}
        </div>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-3 text-lg font-semibold">Version History</h3>
        <div className="max-h-72 overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="p-2">Entity</th>
                <th className="p-2">Version</th>
                <th className="p-2">Status</th>
                <th className="p-2">Published</th>
                <th className="p-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="p-2">{row.entityType}:{row.entityId}</td>
                  <td className="p-2">{row.version}</td>
                  <td className="p-2">{row.status}</td>
                  <td className="p-2">{row.publishedAt || "-"}</td>
                  <td className="p-2 font-mono">{row.renderedHash ? `${row.renderedHash.slice(0, 14)}...` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!snapshots.length ? <p className="p-2 text-xs text-slate-500">No snapshots yet.</p> : null}
        </div>
      </div>

      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </section>
  );
}
