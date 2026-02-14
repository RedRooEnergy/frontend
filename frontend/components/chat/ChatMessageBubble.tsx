"use client";

import type { ChatMessageView, ChatRole } from "./types";

type Props = {
  role: ChatRole;
  message: ChatMessageView;
  onRedact?: (messageId: string) => void;
};

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ChatMessageBubble({ role, message, onRedact }: Props) {
  const isOwnRole =
    (role === "BUYER" && message.senderRole === "BUYER") ||
    (role === "SUPPLIER" && message.senderRole === "SUPPLIER") ||
    (role === "ADMIN" && message.senderRole === "ADMIN");

  return (
    <div className={`rounded-xl border p-3 text-sm ${isOwnRole ? "bg-brand-100 border-brand-200" : "bg-surface border-slate-200"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-muted">
          {message.senderRole} · {message.senderId}
        </div>
        <div className="text-xs text-muted">{formatTime(message.createdAt)}</div>
      </div>

      <div className="mt-2 whitespace-pre-wrap break-words text-sm">{message.body}</div>

      {message.attachments.length > 0 && (
        <div className="mt-2 space-y-1 text-xs text-muted">
          {message.attachments.map((attachment) => (
            <div key={attachment.attachmentId}>
              {attachment.name} · {attachment.mime} · {(attachment.size / 1024).toFixed(1)} KB
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>hash: {message.messageHash.slice(0, 16)}...</span>
        <div className="flex items-center gap-2">
          {message.redaction?.isRedacted && <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700">REDACTED</span>}
          {role === "ADMIN" && !message.systemEvent && !message.redaction?.isRedacted && onRedact && (
            <button className="px-2 py-1 rounded border border-rose-200 text-rose-700" onClick={() => onRedact(message.messageId)}>
              Redact
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
