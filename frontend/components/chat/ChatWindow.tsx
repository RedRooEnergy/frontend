"use client";

import { useMemo, useState } from "react";
import AttachmentPicker from "./AttachmentPicker";
import ChatMessageBubble from "./ChatMessageBubble";
import EscalationBanner from "./EscalationBanner";
import SLAIndicator from "./SLAIndicator";
import type { ChatRole, ChatThreadDetail, UploadedAttachmentRef } from "./types";

type Props = {
  role: ChatRole;
  authHeaders?: Record<string, string>;
  threadDetail: ChatThreadDetail | null;
  onThreadChanged: () => Promise<void>;
};

export default function ChatWindow({ role, authHeaders, threadDetail, onThreadChanged }: Props) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<UploadedAttachmentRef[]>([]);
  const [attachmentPickerKey, setAttachmentPickerKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestMessage = useMemo(
    () => (threadDetail && threadDetail.messages.length > 0 ? threadDetail.messages[threadDetail.messages.length - 1] : null),
    [threadDetail]
  );

  if (!threadDetail) {
    return <div className="rounded-2xl border bg-surface p-4 text-sm text-muted">Select a thread to view messages.</div>;
  }

  const thread = threadDetail.thread;
  const composerDisabled = thread.status === "LOCKED" || busy;

  async function sendMessage() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/threads/${encodeURIComponent(thread.threadId)}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          body,
          attachments: attachments.map((entry) => entry.attachmentId),
          clientMessageId: `${Date.now()}`,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || "Unable to send message");
      }

      setBody("");
      setAttachments([]);
      setAttachmentPickerKey((value) => value + 1);
      await onThreadChanged();
    } catch (err: any) {
      setError(err?.message || "Unable to send message");
    } finally {
      setBusy(false);
    }
  }

  async function escalate() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/threads/${encodeURIComponent(thread.threadId)}/escalate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          reasonCode: "MANUAL_ESCALATION",
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Unable to escalate thread");
      await onThreadChanged();
    } catch (err: any) {
      setError(err?.message || "Unable to escalate thread");
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/threads/${encodeURIComponent(thread.threadId)}/lock`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify({ reasonCode: "ADMIN_LOCK" }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Unable to lock thread");
      await onThreadChanged();
    } catch (err: any) {
      setError(err?.message || "Unable to lock thread");
    } finally {
      setBusy(false);
    }
  }

  async function redact(messageId: string) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/threads/${encodeURIComponent(thread.threadId)}/redact`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          messageId,
          reasonCode: "ADMIN_REDACTION",
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Unable to redact message");
      await onThreadChanged();
    } catch (err: any) {
      setError(err?.message || "Unable to redact message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{thread.type} · {thread.threadId}</div>
          <div className="text-xs text-muted">Linked entity: {thread.relatedEntityType}:{thread.relatedEntityId || "none"}</div>
          {thread.caseId && <div className="text-xs text-muted">Case: {thread.caseId}</div>}
        </div>
        <div className="flex items-center gap-2">
          {thread.status === "OPEN" && (
            <button className="px-3 py-2 rounded border text-xs font-semibold" disabled={busy} onClick={escalate}>
              Escalate
            </button>
          )}
          {role === "ADMIN" && thread.status !== "LOCKED" && (
            <button className="px-3 py-2 rounded border border-rose-200 text-rose-700 text-xs font-semibold" disabled={busy} onClick={lock}>
              Lock thread
            </button>
          )}
          {role === "ADMIN" && (
            <a
              className="px-3 py-2 rounded border text-xs font-semibold"
              href={`/api/chat/threads/${encodeURIComponent(thread.threadId)}/export`}
            >
              Export evidence
            </a>
          )}
        </div>
      </div>

      <EscalationBanner status={thread.status} caseId={thread.caseId} />
      <SLAIndicator role={role} latestMessage={latestMessage} />

      <div className="rounded-xl border p-3 bg-surface-muted max-h-[52vh] overflow-auto space-y-2">
        {threadDetail.messages.length === 0 ? (
          <div className="text-xs text-muted">No messages yet.</div>
        ) : (
          threadDetail.messages.map((message) => (
            <ChatMessageBubble key={message.messageId} role={role} message={message} onRedact={role === "ADMIN" ? redact : undefined} />
          ))
        )}
      </div>

      {error && <div className="text-xs text-rose-700">{error}</div>}

      <div className="space-y-2 rounded-xl border p-3 bg-surface-muted">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={composerDisabled}
          maxLength={64 * 1024}
          className="w-full min-h-[100px] rounded border px-3 py-2 text-sm"
          placeholder={thread.status === "LOCKED" ? "Thread is locked" : "Type a message"}
        />
        <AttachmentPicker
          key={attachmentPickerKey}
          disabled={composerDisabled}
          authHeaders={authHeaders}
          onAttachmentsChange={setAttachments}
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="px-4 py-2 rounded bg-brand-700 text-brand-100 text-sm font-semibold disabled:opacity-50"
            disabled={composerDisabled || !body.trim()}
            onClick={sendMessage}
          >
            Send message
          </button>
        </div>
      </div>
    </div>
  );
}
