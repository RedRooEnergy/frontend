"use client";

import type { ChatMessageView, ChatRole } from "./types";

type Props = {
  role: ChatRole;
  latestMessage: ChatMessageView | null;
};

const SUPPLIER_RESPONSE_SLA_HOURS = 4;

function toMs(value: string | null | undefined) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export default function SLAIndicator({ role, latestMessage }: Props) {
  if (!latestMessage) return null;

  const latestMs = toMs(latestMessage.createdAt);
  if (!latestMs) return null;

  if (role !== "SUPPLIER") return null;
  if (latestMessage.senderRole === "SUPPLIER" || latestMessage.senderRole === "SYSTEM") return null;

  const dueAtMs = latestMs + SUPPLIER_RESPONSE_SLA_HOURS * 60 * 60 * 1000;
  const remainingMinutes = Math.max(0, Math.floor((dueAtMs - Date.now()) / 60000));
  const breached = Date.now() > dueAtMs;

  return (
    <div className={`rounded-md px-3 py-2 text-xs font-semibold ${breached ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
      Supplier response SLA {breached ? "breached" : `due in ${remainingMinutes}m`}
    </div>
  );
}
