"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../../components/BuyerDashboardLayout";
import { getSession, getTickets } from "../../../../../lib/store";
import { recordAudit } from "../../../../../lib/audit";
import { formatDate } from "../../../../../lib/utils";

const categoryLabels: Record<string, string> = {
  ORDER_ISSUE: "Order issue",
  DELIVERY_ISSUE: "Delivery issue",
  REFUND_RETURN: "Refund / return",
  WARRANTY: "Warranty",
  GENERAL: "General enquiry",
};

export default function TicketDetailPage({ params }: { params: { ticketId: string } }) {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    } else {
      recordAudit("BUYER_VIEW_TICKET", { ticketId: params.ticketId });
    }
  }, [router, session, params.ticketId]);

  const ticket = useMemo(() => {
    if (!session?.email) return undefined;
    return getTickets().find((t) => t.ticketId === params.ticketId && t.buyerEmail === session.email);
  }, [params.ticketId, session?.email]);

  if (!ticket) {
    return (
      <BuyerDashboardLayout title="Support ticket not found">
        <p className="text-sm text-muted">No ticket matches this ID.</p>
      </BuyerDashboardLayout>
    );
  }

  return (
    <BuyerDashboardLayout title={`Support Ticket ${ticket.ticketId}`}>
      <div className="space-y-4">
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
          <div className="text-sm text-muted">Subject</div>
          <div className="text-base font-semibold">{ticket.subject}</div>
          <div className="text-sm text-muted">Category</div>
          <div className="text-sm font-semibold">{categoryLabels[ticket.category] || ticket.category}</div>
          {ticket.orderId && (
            <>
              <div className="text-sm text-muted">Related order</div>
              <div className="text-sm font-semibold">{ticket.orderId}</div>
            </>
          )}
          <div className="text-sm text-muted">Status</div>
          <div className="text-sm font-semibold">{ticket.status}</div>
          <div className="text-sm text-muted">Created</div>
          <div className="text-sm">{formatDate(ticket.createdAt)}</div>
          <div className="text-sm text-muted">Message</div>
          <p className="text-sm">{ticket.message}</p>
          <p className="text-xs text-muted">Ticket handling is managed by RedRooEnergy support; timelines are informational only.</p>
        </div>
      </div>
    </BuyerDashboardLayout>
  );
}
