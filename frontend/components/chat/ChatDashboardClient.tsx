"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ChatThreadList from "./ChatThreadList";
import ChatWindow from "./ChatWindow";
import type { ChatRole, ChatThreadDetail, ChatThreadSummary } from "./types";
import { getClientRoleHeaders } from "../../lib/auth/clientRoleHeaders";

type Props = {
  role: ChatRole;
  title: string;
};

function roleHeaderScope(role: ChatRole) {
  if (role === "BUYER") return "buyer" as const;
  if (role === "SUPPLIER") return "supplier" as const;
  return "admin" as const;
}

export default function ChatDashboardClient({ role, title }: Props) {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<ChatThreadDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchValue, setSearchValue] = useState("");
  const [newThreadType, setNewThreadType] = useState(role === "SUPPLIER" ? "ORDER" : "PRODUCT_INQUIRY");
  const [newRelatedEntityType, setNewRelatedEntityType] = useState(role === "SUPPLIER" ? "ORDER" : "PRODUCT");
  const [newRelatedEntityId, setNewRelatedEntityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(() => getClientRoleHeaders(roleHeaderScope(role)), [role]);

  const loadThreads = useCallback(async () => {
    const params = new URLSearchParams({
      scope: "mine",
      status: statusFilter,
      limit: "100",
    });
    if (searchValue.trim()) {
      params.set("search", searchValue.trim());
    }

    const response = await fetch(`/api/chat/threads?${params.toString()}`, {
      method: "GET",
      headers: {
        ...(authHeaders || {}),
      },
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json?.error || "Unable to load chat threads");
    }

    const items = (json?.items || []) as ChatThreadSummary[];
    setThreads(items);

    if (!selectedThreadId && items.length > 0) {
      setSelectedThreadId(items[0].threadId);
    }

    if (selectedThreadId && !items.some((thread) => thread.threadId === selectedThreadId)) {
      setSelectedThreadId(items.length > 0 ? items[0].threadId : null);
    }
  }, [authHeaders, searchValue, selectedThreadId, statusFilter]);

  const loadDetail = useCallback(
    async (threadId: string) => {
      const response = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}?limit=200`, {
        method: "GET",
        headers: {
          ...(authHeaders || {}),
        },
        cache: "no-store",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || "Unable to load thread detail");
      }
      setThreadDetail(json as ChatThreadDetail);
    },
    [authHeaders]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await loadThreads();
      if (selectedThreadId) {
        await loadDetail(selectedThreadId);
      } else {
        setThreadDetail(null);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load chat data");
    } finally {
      setLoading(false);
    }
  }, [loadDetail, loadThreads, selectedThreadId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null);
      return;
    }

    void loadDetail(selectedThreadId).catch((err: any) => {
      setError(err?.message || "Unable to load selected thread");
    });
  }, [selectedThreadId, loadDetail]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadThreads().catch(() => undefined);
      if (selectedThreadId) {
        void loadDetail(selectedThreadId).catch(() => undefined);
      }
    }, 5000);

    return () => clearInterval(id);
  }, [loadDetail, loadThreads, selectedThreadId]);

  async function createThread() {
    setError(null);
    try {
      const payload = {
        type: newThreadType,
        relatedEntityType: newRelatedEntityType,
        relatedEntityId: newRelatedEntityId.trim() || null,
      };

      const response = await fetch("/api/chat/threads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Unable to create thread");

      const threadId = String(json?.thread?.threadId || "");
      await loadThreads();
      if (threadId) {
        setSelectedThreadId(threadId);
        await loadDetail(threadId);
      }
      setNewRelatedEntityId("");
    } catch (err: any) {
      setError(err?.message || "Unable to create thread");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted">Operational chat threads are immutable and audit-recorded.</p>
        </div>
        <button className="px-3 py-2 rounded border text-sm font-semibold" onClick={() => void loadAll()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div className="text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border bg-surface p-3 grid grid-cols-1 md:grid-cols-[180px_180px_1fr_auto] gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block text-muted">Thread type</span>
          <select className="w-full rounded border px-3 py-2 text-sm" value={newThreadType} onChange={(event) => setNewThreadType(event.target.value)}>
            <option value="PRODUCT_INQUIRY">PRODUCT_INQUIRY</option>
            <option value="ORDER">ORDER</option>
            <option value="FREIGHT">FREIGHT</option>
            <option value="COMPLIANCE">COMPLIANCE</option>
            <option value="WARRANTY">WARRANTY</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="block text-muted">Linked entity</span>
          <select className="w-full rounded border px-3 py-2 text-sm" value={newRelatedEntityType} onChange={(event) => setNewRelatedEntityType(event.target.value)}>
            <option value="NONE">NONE</option>
            <option value="ORDER">ORDER</option>
            <option value="PRODUCT">PRODUCT</option>
            <option value="CASE">CASE</option>
            <option value="WARRANTY_INCIDENT">WARRANTY_INCIDENT</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="block text-muted">Entity ID</span>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="ORD-123 or product slug"
            value={newRelatedEntityId}
            onChange={(event) => setNewRelatedEntityId(event.target.value)}
          />
        </label>
        <button className="px-3 py-2 rounded bg-brand-700 text-brand-100 text-sm font-semibold" onClick={() => void createThread()}>
          New thread
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <ChatThreadList
          items={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchValue={searchValue}
          onSearchValueChange={setSearchValue}
        />

        <ChatWindow
          role={role}
          authHeaders={authHeaders}
          threadDetail={threadDetail}
          onThreadChanged={async () => {
            await loadThreads();
            if (selectedThreadId) {
              await loadDetail(selectedThreadId);
            }
          }}
        />
      </div>
    </div>
  );
}
