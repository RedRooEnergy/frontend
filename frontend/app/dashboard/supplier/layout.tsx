"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import WeChatChannelIcon, { type WeChatChannelBindingStatus } from "../../../components/wechat/WeChatChannelIcon";
import { getClientRoleHeaders } from "../../../lib/auth/clientRoleHeaders";
import { SupplierI18nProvider, useSupplierTranslations } from "../../../lib/supplierI18n";
import { getSession } from "../../../lib/store";
import { getSupplierNavGroups, getSupplierRole, getSupplierRouteAccess } from "../../../lib/supplierAccess";

export default function SupplierDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SupplierI18nProvider>
      <SupplierLayoutContent>{children}</SupplierLayoutContent>
    </SupplierI18nProvider>
  );
}

function SupplierLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useSupplierTranslations();
  const session = getSession();
  const [wechatBindingStatus, setWechatBindingStatus] = useState<WeChatChannelBindingStatus>("NONE");
  const [wechatUnreadCount, setWechatUnreadCount] = useState(0);
  const role = getSupplierRole(session);
  const navGroups = getSupplierNavGroups(role);
  const access = getSupplierRouteAccess(pathname, role);

  useEffect(() => {
    let active = true;

    async function loadWeChatStatus() {
      try {
        const response = await fetch("/api/wechat/channel-status", {
          method: "GET",
          headers: getClientRoleHeaders("supplier"),
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
    <div className="min-h-screen text-strong supplier-dashboard-bg">
      <main className="supplier-dashboard-main supplier-dashboard-grid supplier-dashboard-content">
        <aside
          aria-label="Supplier navigation"
          className="bg-surface rounded-2xl shadow-card border-2 border-brand-700 p-4 space-y-3 supplier-nav"
        >
          <h2 className="text-lg font-semibold">{t("nav.title")}</h2>
          <nav className="flex flex-col gap-3">
            {navGroups.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted">{t(group.key)}</div>
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`px-3 py-2 rounded-md text-sm font-semibold ${
                          active ? "bg-brand-700 text-brand-100" : "hover:bg-brand-100"
                        }`}
                      >
                        {t(item.key)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <section className="space-y-4">
          <div className="flex items-center justify-end gap-3 text-sm">
            <WeChatChannelIcon
              role="SUPPLIER"
              bindingStatus={wechatBindingStatus}
              unreadCount={wechatUnreadCount}
              href="/dashboard/supplier/wechat"
              variant="icon"
            />
            <div className="flex items-center gap-2">
              <label className="text-muted">{t("language.label")}</label>
              <select
                className="border rounded-md px-2 py-1 text-sm"
                value={locale}
                onChange={(event) => setLocale(event.target.value as "en" | "zh-CN")}
              >
                <option value="en">{t("language.en")}</option>
                <option value="zh-CN">{t("language.zh")}</option>
              </select>
            </div>
          </div>
          {!access.allowed ? (
            <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
              <div className="text-lg font-semibold text-strong">{t("guard.forbidden.title")}</div>
              <p className="mt-2">{t("guard.forbidden.body")}</p>
            </div>
          ) : (
            <>
              {access.readOnly && (
                <div className="bg-brand-100 border border-brand-200 text-brand-700 rounded-xl px-4 py-2 text-sm font-semibold">
                  {t("guard.readOnly")}
                </div>
              )}
              {children}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
