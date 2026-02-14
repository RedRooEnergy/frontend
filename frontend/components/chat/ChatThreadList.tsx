"use client";

import type { ChatThreadSummary } from "./types";

type Props = {
  items: ChatThreadSummary[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
};

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ChatThreadList({
  items,
  selectedThreadId,
  onSelectThread,
  statusFilter,
  onStatusFilterChange,
  searchValue,
  onSearchValueChange,
}: Props) {
  return (
    <div className="rounded-2xl border bg-surface p-3 space-y-3">
      <div className="space-y-2">
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchValueChange(event.target.value)}
          placeholder="Search threads"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="ESCALATED">Escalated</option>
          <option value="LOCKED">Locked</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="space-y-2 max-h-[68vh] overflow-auto">
        {items.length === 0 ? (
          <div className="text-xs text-muted">No threads.</div>
        ) : (
          items.map((thread) => (
            <button
              key={thread.threadId}
              type="button"
              className={`w-full text-left rounded-xl border px-3 py-2 space-y-1 ${
                selectedThreadId === thread.threadId ? "border-brand-700 bg-brand-100" : "border-slate-200 bg-surface"
              }`}
              onClick={() => onSelectThread(thread.threadId)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold">{thread.type}</div>
                {thread.unreadCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-brand-700 text-white">{thread.unreadCount}</span>
                )}
              </div>
              <div className="text-xs text-muted">{thread.relatedEntityType}:{thread.relatedEntityId || "none"}</div>
              <div className="text-xs truncate">{thread.latestMessage?.bodyPreview || "No messages yet"}</div>
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>{thread.status}</span>
                <span>{formatTime(thread.updatedAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
