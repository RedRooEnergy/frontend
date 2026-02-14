"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import WeChatChannelIcon, { type WeChatChannelBindingStatus } from "./wechat/WeChatChannelIcon";
import { getClientRoleHeaders } from "../lib/auth/clientRoleHeaders";
import { adminPhaseEnabled } from "../lib/featureFlags";

const navItems = [
  { label: "Executive Overview", href: "/dashboard/admin/executive" },
  { label: "Governance Status", href: "/dashboard/admin/governance" },
  { label: "User & Role Management", href: "/dashboard/admin/users" },
  { label: "Supplier Governance", href: "/dashboard/admin/suppliers" },
  { label: "Compliance Partner Registry", href: "/dashboard/admin/compliance-partners" },
  { label: "Service Partner Compliance", href: "/dashboard/admin/service-partners" },
  { label: "Service Partner Audit", href: "/dashboard/admin/service-partners/audit" },
  { label: "Product & Catalogue Governance", href: "/dashboard/admin/catalogue" },
  { label: "Orders & Escalations", href: "/dashboard/admin/orders" },
  { label: "Operational Conversations", href: "/dashboard/admin/conversations" },
  { label: "Payments & Settlement", href: "/dashboard/admin/finance" },
  { label: "Marketplace Fee Ledger", href: "/dashboard/admin/fee-ledger" },
  { label: "Email Governance", href: "/dashboard/admin/email" },
  { label: "WeChat Governance", href: "/dashboard/admin/wechat" },
];

export default function AdminDashboardLayout({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = usePathname();
  const [wechatBindingStatus, setWechatBindingStatus] = useState<WeChatChannelBindingStatus>("NONE");
  const [wechatUnreadCount, setWechatUnreadCount] = useState(0);
  const enabled = adminPhaseEnabled();

  useEffect(() => {
    let active = true;

    async function loadWeChatStatus() {
      try {
        const response = await fetch("/api/wechat/channel-status", {
          method: "GET",
          headers: getClientRoleHeaders("admin"),
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
        <aside aria-label="Admin navigation" className="buyer-nav space-y-3">
          <h2 className="text-lg font-semibold">Admin</h2>
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
              role="ADMIN"
              bindingStatus={wechatBindingStatus}
              unreadCount={wechatUnreadCount}
              href="/dashboard/admin/wechat"
              variant="icon"
            />
          </div>
          {!enabled && (
            <div className="bg-amber-100 border border-amber-200 text-amber-900 text-sm rounded-2xl p-4">
              Admin phase is disabled. Set NEXT_PUBLIC_ADMIN_PHASE=on in non-production to enable.
            </div>
          )}
          {enabled && children}
        </section>
      </main>
    </div>
  );
}
