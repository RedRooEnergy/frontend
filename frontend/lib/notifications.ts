import {
  getNotifications,
  setNotifications,
  NotificationRecord,
  getBuyerDocuments,
  getOrders,
  getReturns,
  getShipmentUpdates,
  getSupplierProductStates,
  getComplianceDecisions,
  getAdminDisputes,
  getAdminExports,
  getServicePartnerTasks,
  getSession,
  SessionState,
} from "./store";

function normalizeNotification(
  notification: NotificationRecord,
  role?: SessionState["role"]
): NotificationRecord {
  const read = notification.read ?? false;
  return {
    ...notification,
    role: notification.role ?? role,
    read,
    deliveryStatus: notification.deliveryStatus ?? (read ? "READ" : "DELIVERED"),
  };
}

function mergeNotifications(
  stored: NotificationRecord[],
  derived: NotificationRecord[],
  role: SessionState["role"]
) {
  const map: Record<string, NotificationRecord> = {};
  stored.forEach((n) => {
    map[n.id] = normalizeNotification(n, role);
  });
  derived.forEach((n) => {
    const existing = map[n.id];
    if (existing) {
      map[n.id] = normalizeNotification(
        { ...n, read: existing.read ?? n.read, deliveryStatus: existing.deliveryStatus },
        role
      );
    } else {
      map[n.id] = normalizeNotification(n, role);
    }
  });
  return Object.values(map).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function deriveBuyerNotifications(buyerEmail: string): NotificationRecord[] {
  const derived: NotificationRecord[] = [];
  const orders = getOrders().filter((o) => o.buyerEmail === buyerEmail);
  orders.forEach((o) => {
    derived.push({
      id: `order-${o.orderId}-placed`,
      buyerEmail,
      role: "buyer",
      type: "ORDER_PLACED",
      title: "Order placed",
      body: `Order ${o.orderId} was placed.`,
      createdAt: o.createdAt,
      source: "orders",
      deliveryStatus: "DELIVERED",
      link: "/orders",
      relatedId: o.orderId,
    });
    if (o.status === "PAYMENT_REVIEW_REQUIRED") {
      derived.push({
        id: `order-${o.orderId}-payment-review`,
        buyerEmail,
        role: "buyer",
        type: "PAYMENT_REVIEW_REQUIRED",
        title: "Payment review required",
        body: `Payment for order ${o.orderId} needs review before processing.`,
        createdAt: o.createdAt,
        source: "payments",
        deliveryStatus: "DELIVERED",
        link: "/orders",
        relatedId: o.orderId,
      });
    }
    const shipped = o.timeline?.find((t) => t.status === "SHIPPED");
    if (shipped) {
      derived.push({
        id: `order-${o.orderId}-shipped`,
        buyerEmail,
        role: "buyer",
        type: "ORDER_SHIPPED",
        title: "Order shipped",
        body: `Order ${o.orderId} has shipped.`,
        createdAt: shipped.timestamp,
        source: "orders",
        deliveryStatus: "DELIVERED",
        link: "/orders",
        relatedId: o.orderId,
      });
    }
  });

  const documents = getBuyerDocuments().filter((doc) => doc.buyerEmail === buyerEmail);
  documents.forEach((doc) => {
    derived.push({
      id: `document-${doc.documentId}-ready`,
      buyerEmail,
      role: "buyer",
      type: "DOCUMENT_READY",
      title: "Document ready",
      body: `${doc.name} is available for download.`,
      createdAt: doc.createdAt,
      source: "documents",
      deliveryStatus: "DELIVERED",
      link: "/buyer/documents",
      relatedId: doc.documentId,
    });
  });

  const returns = getReturns().filter((r) => r.buyerEmail === buyerEmail);
  returns.forEach((r) => {
    if (r.status === "APPROVED") {
      derived.push({
        id: `return-${r.rmaId}-approved`,
        buyerEmail,
        role: "buyer",
        type: "RETURN_APPROVED",
        title: "Return approved",
        body: `Return ${r.rmaId} was approved.`,
        createdAt: r.updatedAt,
        source: "returns",
        deliveryStatus: "DELIVERED",
        link: "/dashboard/buyer/returns",
        relatedId: r.rmaId,
      });
    }
    if (r.status === "REFUNDED") {
      derived.push({
        id: `return-${r.rmaId}-refunded`,
        buyerEmail,
        role: "buyer",
        type: "REFUND_PROCESSED",
        title: "Refund processed",
        body: `Refund for return ${r.rmaId} is processing to the original payment method.`,
        createdAt: r.updatedAt,
        source: "returns",
        deliveryStatus: "DELIVERED",
        link: "/dashboard/buyer/returns",
        relatedId: r.rmaId,
      });
    }
  });

  return derived;
}

function deriveSupplierNotifications(supplierId: string, supplierEmail: string): NotificationRecord[] {
  const derived: NotificationRecord[] = [];
  const orders = getOrders().filter(
    (o) => o.supplierIds?.includes(supplierId) || o.items.some((item) => item.supplierId === supplierId)
  );
  orders.forEach((o) => {
    derived.push({
      id: `supplier-${supplierId}-order-${o.orderId}`,
      buyerEmail: supplierEmail,
      role: "supplier",
      type: "SUPPLIER_ORDER_RECEIVED",
      title: "New order received",
      body: `Order ${o.orderId} includes your products.`,
      createdAt: o.createdAt,
      source: "orders",
      deliveryStatus: "DELIVERED",
      link: "/dashboard/supplier",
      relatedId: o.orderId,
    });
  });

  const productStates = getSupplierProductStates().filter((s) => s.supplierId === supplierId);
  productStates.forEach((state) => {
    derived.push({
      id: `supplier-${supplierId}-product-${state.productSlug}-${state.state}`,
      buyerEmail: supplierEmail,
      role: "supplier",
      type: "SUPPLIER_PRODUCT_STATE",
      title: "Product status update",
      body: `${state.productSlug} moved to ${state.state.toLowerCase().replace(/_/g, " ")}.`,
      createdAt: state.updatedAt,
      source: "product-governance",
      deliveryStatus: "DELIVERED",
      link: `/dashboard/supplier/products/${state.productSlug}`,
      relatedId: state.productSlug,
    });
  });

  const shipments = getShipmentUpdates().filter((s) => s.supplierId === supplierId);
  shipments.forEach((s) => {
    derived.push({
      id: `shipment-${s.id}-${s.milestone}`,
      buyerEmail: supplierEmail,
      role: "supplier",
      type: "SUPPLIER_SHIPMENT_UPDATE",
      title: "Shipment milestone logged",
      body: `${s.productSlug} marked ${s.milestone.replace(/_/g, " ").toLowerCase()}.`,
      createdAt: s.timestamp,
      source: "shipments",
      deliveryStatus: "DELIVERED",
      link: "/dashboard/supplier/shipments",
      relatedId: s.id,
    });
  });

  return derived;
}

function deriveAdminNotifications(adminEmail: string): NotificationRecord[] {
  const derived: NotificationRecord[] = [];
  const disputes = getAdminDisputes();
  disputes.forEach((d) => {
    derived.push({
      id: `admin-dispute-${d.id}-${d.status}`,
      buyerEmail: adminEmail,
      role: "admin",
      type: "ADMIN_DISPUTE",
      title: "Dispute update",
      body: `Dispute ${d.id} is ${d.status.toLowerCase().replace(/_/g, " ")}.`,
      createdAt: d.updatedAt,
      source: "disputes",
      deliveryStatus: "DELIVERED",
      link: "/dashboard/admin/disputes",
      relatedId: d.id,
    });
  });

  const compliance = getComplianceDecisions();
  compliance.forEach((c) => {
    derived.push({
      id: `compliance-${c.id}-${c.status}`,
      buyerEmail: adminEmail,
      role: "admin",
      type: "COMPLIANCE_DECISION",
      title: "Compliance decision",
      body: `Compliance ${c.id} marked ${c.status.toLowerCase().replace(/_/g, " ")}.`,
      createdAt: c.updatedAt,
      source: "compliance",
      deliveryStatus: "DELIVERED",
      link: "/dashboard/admin/compliance",
      relatedId: c.id,
    });
  });

  const exports = getAdminExports();
  exports.forEach((record) => {
    derived.push({
      id: `admin-export-${record.id}`,
      buyerEmail: adminEmail,
      role: "admin",
      type: "SYSTEM_NOTICE",
      title: "Audit export ready",
      body: `${record.type} export ${record.id} is available.`,
      createdAt: record.createdAt,
      source: "audit",
      deliveryStatus: "DELIVERED",
      link: "/dashboard/admin/audit-exports",
      relatedId: record.id,
    });
  });

  return derived;
}

function deriveServicePartnerNotifications(servicePartnerId: string, servicePartnerEmail: string): NotificationRecord[] {
  const derived: NotificationRecord[] = [];
  const tasks = getServicePartnerTasks().filter((task) => task.servicePartnerId === servicePartnerId);
  tasks.forEach((task) => {
    if (task.status === "COMPLETED") return;
    const isEvidence = task.status === "EVIDENCE_REQUIRED";
    derived.push({
      id: `service-task-${task.taskId}-${task.status}`,
      buyerEmail: servicePartnerEmail,
      role: "service-partner",
      type: isEvidence ? "SERVICE_EVIDENCE_REQUIRED" : "SERVICE_TASK_ASSIGNED",
      title: isEvidence ? "Evidence required" : "Service task assigned",
      body: isEvidence
        ? `${task.title} requires evidence to complete.`
        : `${task.title} is ready for action.`,
      createdAt: task.updatedAt,
      source: "service-partner",
      deliveryStatus: "DELIVERED",
      link: "/dashboard/service-partner",
      relatedId: task.taskId,
    });
  });
  return derived;
}

export function listNotificationsForSession(session: SessionState | null): NotificationRecord[] {
  if (!session?.email) return [];
  const stored = getNotifications().filter(
    (n) => n.buyerEmail === session.email && (n.role ?? "buyer") === session.role
  );
  const derived =
    session.role === "buyer"
      ? deriveBuyerNotifications(session.email)
      : session.role === "supplier"
      ? deriveSupplierNotifications(session.userId, session.email)
      : session.role === "service-partner"
      ? deriveServicePartnerNotifications(session.userId, session.email)
      : session.role === "admin"
      ? deriveAdminNotifications(session.email)
      : [];
  return mergeNotifications(stored, derived, session.role);
}

export function listBuyerNotifications(buyerEmail: string): NotificationRecord[] {
  return mergeNotifications(
    getNotifications().filter((n) => n.buyerEmail === buyerEmail && (n.role ?? "buyer") === "buyer"),
    deriveBuyerNotifications(buyerEmail),
    "buyer"
  );
}

export function markNotificationRead(id: string) {
  const session = getSession();
  if (!session?.email) return;
  const notifications = getNotifications();
  const idx = notifications.findIndex(
    (n) => n.id === id && n.buyerEmail === session.email && (n.role ?? "buyer") === session.role
  );
  if (idx !== -1) {
    notifications[idx].read = true;
    notifications[idx].deliveryStatus = "READ";
    setNotifications(notifications);
  } else {
    // if derived-only, persist as read
    const all = listNotificationsForSession(session);
    const n = all.find((x) => x.id === id);
    if (n) {
      n.read = true;
      n.deliveryStatus = "READ";
      setNotifications([...notifications, n]);
    }
  }
}

export function addNotification(n: NotificationRecord) {
  const notifications = getNotifications();
  notifications.push(n);
  setNotifications(notifications);
}
