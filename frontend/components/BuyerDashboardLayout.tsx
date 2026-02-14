"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import WeChatChannelIcon, { type WeChatChannelBindingStatus } from "./wechat/WeChatChannelIcon";
import { getClientRoleHeaders } from "../lib/auth/clientRoleHeaders";

const navItems = [
  { label: "Home / Overview", href: "/dashboard/buyer" },
  { label: "Orders & Tracking", href: "/dashboard/buyer/orders" },
  { label: "Documents & Certificates", href: "/dashboard/buyer/documents" },
  { label: "Returns & Refunds", href: "/dashboard/buyer/returns" },
  { label: "Commercial Orders", href: "/dashboard/buyer/commercial" },
  { label: "Payments & Billing", href: "/dashboard/buyer/payments" },
  { label: "Messages & Notifications", href: "/dashboard/buyer/messages" },
  { label: "Email Inbox", href: "/dashboard/buyer/emails" },
  { label: "Profile & Compliance", href: "/dashboard/buyer/profile" },
  { label: "Wish List & Saved Products", href: "/dashboard/buyer/wishlist" },
];

export default function BuyerDashboardLayout({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = usePathname();
  const [wechatBindingStatus, setWechatBindingStatus] = useState<WeChatChannelBindingStatus>("NONE");
  const [wechatUnreadCount, setWechatUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadWeChatStatus() {
      try {
        const response = await fetch("/api/wechat/channel-status", {
          method: "GET",
          headers: getClientRoleHeaders("buyer"),
          cache: "no-store",
        });
        const json = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) {
          setWechatBindingStatus("ERROR");
          setWechatUnreadCount(0);
          return;
        }
        setWechatBindingStatus((json?.bindingStatus as WeChatChannelBindingStatus) || "NONE");
        setWechatUnreadCount(Number(json?.unreadCount || 0));
      } catch {
        if (!active) return;
        setWechatBindingStatus("ERROR");
        setWechatUnreadCount(0);
      }
    }

    loadWeChatStatus();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="buyer-dashboard-main buyer-dashboard-grid">
        <aside aria-label="Buyer navigation" className="buyer-nav space-y-3">
          <h2 className="text-lg font-semibold">Buyer</h2>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-semibold ${
                    active ? "bg-brand-700 text-brand-100" : "hover:bg-brand-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="buyer-content space-y-4">
          <div className="flex items-center justify-between gap-3">
            {title ? <h1 className="text-2xl font-bold">{title}</h1> : <div />}
            <WeChatChannelIcon
              role="BUYER"
              bindingStatus={wechatBindingStatus}
              unreadCount={wechatUnreadCount}
              href="/dashboard/buyer/communications?channel=wechat"
              variant="icon"
            />
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}
