"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getOrders, getSession } from "../../../../lib/store";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierPaymentsPage() {
  const session = getSession();
  const role = session?.role ?? "supplier";
  const supplierId = session?.userId || "supplier-user";
  const { t } = useSupplierTranslations();
  const orders = useMemo(
    () =>
      getOrders().filter(
        (order) =>
          order.supplierIds?.includes(supplierId) || order.items.some((item) => item.supplierId === supplierId)
      ),
    [supplierId]
  );
  const [ledgerEvents, setLedgerEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadLedger = async () => {
      try {
        const res = await fetch(`/api/fee-ledger/me?actorRole=supplier&actorId=${supplierId}`);
        const data = await res.json();
        setLedgerEvents(data.items || []);
      } catch {
        setLedgerEvents([]);
      }
    };
    loadLedger();
  }, [supplierId]);

  const escrowHeld = orders.filter((o) => o.escrowStatus === "HELD").length;
  const escrowReleased = orders.filter((o) => o.escrowStatus === "RELEASED").length;
  const escrowSettled = orders.filter((o) => o.escrowStatus === "SETTLED").length;
  const readOnly = role !== "admin";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("payments.title")}</h1>
        <p className="text-sm text-muted">{t("payments.subtitle")}</p>
      </div>

      {readOnly && (
        <div className="bg-brand-100 border border-brand-200 text-brand-700 rounded-xl px-4 py-2 text-sm font-semibold">
          {t("payments.readonly")}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("payments.metric.held")}</div>
          <div className="text-lg font-semibold">{escrowHeld}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("payments.metric.released")}</div>
          <div className="text-lg font-semibold">{escrowReleased}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("payments.metric.settled")}</div>
          <div className="text-lg font-semibold">{escrowSettled}</div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("payments.pipeline.title")}</h2>
          {role !== "regulator" && (
            <Link href="/dashboard/supplier/payout-readiness" className="text-sm text-brand-700 font-semibold">
              {t("payments.pipeline.link")}
            </Link>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="text-sm text-muted">{t("payments.pipeline.empty")}</div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 6).map((order) => (
              <div key={order.orderId} className="border rounded-xl p-3 bg-surface-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted">{t("payments.pipeline.order")}</div>
                    <div className="text-base font-semibold">{order.orderId}</div>
                  </div>
                  <div className="text-xs text-muted">
                    {t("payments.pipeline.escrow", {
                      status: t(`payments.escrow.${order.escrowStatus || "HELD"}`),
                    })}
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  {t("payments.pipeline.total", { total: order.total.toFixed(2) })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("payments.ledger.title")}</h2>
          <span className="text-xs text-muted">{t("payments.ledger.notice")}</span>
        </div>
        {ledgerEvents.length === 0 ? (
          <div className="text-sm text-muted">{t("payments.ledger.empty")}</div>
        ) : (
          <div className="space-y-2">
            {ledgerEvents.slice(0, 6).map((event) => (
              <div key={event.eventId} className="border rounded-xl p-3 bg-surface-muted">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{event.eventType}</div>
                  <div className="text-xs text-muted">{event.currency}</div>
                </div>
                <div className="text-xs text-muted mt-1">
                  {t("payments.ledger.base", { amount: event.baseAmount?.toFixed?.(2) ?? event.baseAmount })}
                  {" · "}
                  {t("payments.ledger.fee", { amount: event.feeAmount?.toFixed?.(2) ?? event.feeAmount })}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">{t("payments.ledger.disclaimer")}</p>
      </div>
    </div>
  );
}
