"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { getSession, getTickets, addTicket } from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import { useState } from "react";
import Link from "next/link";
import { formatDate } from "../../../../lib/utils";

const categories = [
  { value: "ORDER_ISSUE", label: "Order issue" },
  { value: "DELIVERY_ISSUE", label: "Delivery issue" },
  { value: "REFUND_RETURN", label: "Refund / return" },
  { value: "WARRANTY", label: "Warranty" },
  { value: "GENERAL", label: "General enquiry" },
];

export default function BuyerSupportPage() {
  const router = useRouter();
  const session = getSession();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("ORDER_ISSUE");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  const tickets = session?.email ? getTickets().filter((t) => t.buyerEmail === session.email) : [];

  const handleSubmit = () => {
    if (!session?.email) return;
    if (!subject.trim() || !message.trim()) return;
    const now = new Date().toISOString();
    addTicket({
      ticketId: crypto.randomUUID(),
      buyerEmail: session.email,
      subject,
      message,
      category: category as any,
      orderId: orderId || undefined,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    });
    recordAudit("BUYER_TICKET_CREATED", { category, orderId: orderId || undefined });
    setSubject("");
    setMessage("");
    setOrderId("");
  };

  return (
    <BuyerDashboardLayout title="Support">
      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create a support ticket</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              className="w-full border rounded-md px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className="w-full border rounded-md px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="orderId">
            Related order (optional)
          </label>
          <input
            id="orderId"
            className="w-full border rounded-md px-3 py-2"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="message">
            Message
          </label>
          <textarea
            id="message"
            className="w-full border rounded-md px-3 py-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold" onClick={handleSubmit}>
            Submit ticket
          </button>
        </div>
        <p className="text-xs text-muted">
          Tickets are reviewed by RedRooEnergy support. Timelines are informational only; escalation is handled per policy.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted">No tickets yet.</p>
        ) : (
          tickets.map((t) => (
            <Link
              key={t.ticketId}
              href={`/dashboard/buyer/support/${t.ticketId}`}
              className="block bg-surface rounded-2xl shadow-card border p-4 hover:shadow-soft transition"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-base font-semibold">{t.subject}</div>
                  <div className="text-sm text-muted">{categories.find((c) => c.value === t.category)?.label}</div>
                  {t.orderId && <div className="text-sm text-muted">Order: {t.orderId}</div>}
                </div>
                <div className="text-right text-sm space-y-1">
                  <div className="font-semibold">{t.status}</div>
                  <div className="text-muted">{formatDate(t.createdAt)}</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </BuyerDashboardLayout>
  );
}
