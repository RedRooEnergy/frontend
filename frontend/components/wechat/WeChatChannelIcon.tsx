import Link from "next/link";

export type WeChatChannelRole = "BUYER" | "SUPPLIER" | "ADMIN";
export type WeChatChannelBindingStatus = "NONE" | "PENDING" | "VERIFIED" | "REVOKED" | "ERROR";

type WeChatChannelIconProps = {
  role: WeChatChannelRole;
  bindingStatus: WeChatChannelBindingStatus;
  unreadCount?: number;
  href: string;
  variant?: "icon" | "button";
};

function resolveSafeHref(href: string) {
  const normalized = String(href || "").trim();
  if (normalized.startsWith("/")) return normalized;
  return "/";
}

function statusMeta(status: WeChatChannelBindingStatus) {
  if (status === "PENDING") {
    return {
      label: "Pending",
      helper: "Pending verification",
      toneClass: "text-amber-700 border-amber-400 bg-amber-100",
      dotClass: "bg-amber-500",
    };
  }
  if (status === "VERIFIED") {
    return {
      label: "WeChat Active",
      helper: "Channel connected",
      toneClass: "text-emerald-800 border-emerald-500 bg-emerald-100",
      dotClass: "bg-emerald-500",
    };
  }
  if (status === "REVOKED") {
    return {
      label: "Reconnect",
      helper: "Binding revoked",
      toneClass: "text-red-800 border-red-500 bg-red-100",
      dotClass: "bg-red-500",
    };
  }
  if (status === "ERROR") {
    return {
      label: "Channel Error",
      helper: "Review channel state",
      toneClass: "text-red-800 border-red-600 bg-red-100",
      dotClass: "bg-red-600",
    };
  }

  return {
    label: "Connect WeChat",
    helper: "No active binding",
    toneClass: "text-slate-700 border-slate-400 bg-slate-100",
    dotClass: "bg-slate-400",
  };
}

function WeChatMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15.75" cy="14.75" r="5.25" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.6" cy="9.25" r="1" fill="currentColor" />
      <circle cx="11.8" cy="9.25" r="1" fill="currentColor" />
      <circle cx="14.2" cy="14" r="0.9" fill="currentColor" />
      <circle cx="16.9" cy="14" r="0.9" fill="currentColor" />
    </svg>
  );
}

export default function WeChatChannelIcon({
  role,
  bindingStatus,
  unreadCount = 0,
  href,
  variant = "icon",
}: WeChatChannelIconProps) {
  const meta = statusMeta(bindingStatus);
  const safeHref = resolveSafeHref(href);
  const showUnread = bindingStatus === "VERIFIED" && unreadCount > 0;

  if (variant === "button") {
    return (
      <Link
        href={safeHref}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${meta.toneClass}`}
        aria-label={`${meta.label} for ${role}`}
      >
        <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} aria-hidden="true" />
        <WeChatMark />
        <span>{meta.label}</span>
        {showUnread ? <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] text-brand-100">{unreadCount}</span> : null}
      </Link>
    );
  }

  return (
    <Link
      href={safeHref}
      className={`relative inline-flex h-12 w-12 items-center justify-center rounded-full border ${meta.toneClass}`}
      aria-label={`${meta.label} for ${role}`}
      title={`${meta.label} - ${meta.helper}`}
    >
      <span className={`absolute left-1.5 top-1.5 h-2 w-2 rounded-full ${meta.dotClass}`} aria-hidden="true" />
      <WeChatMark />
      {showUnread ? (
        <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-brand-700 px-1 py-0.5 text-center text-[10px] font-semibold text-brand-100">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
      <span className="sr-only">{meta.label}</span>
    </Link>
  );
}
