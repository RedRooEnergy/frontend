/**
 * Order Projection Adapter
 * Transforms Core order state into buyer-visible projection.
 * No mutation. No enrichment. No inference.
 */

export function projectOrderForBuyer(coreOrder: any) {
  if (!coreOrder) {
    return null;
  }

  return {
    orderId: coreOrder.id,
    status: coreOrder.status,
    createdAt: coreOrder.createdAt,
    updatedAt: coreOrder.updatedAt,
    items: coreOrder.items?.map((item: any) => ({
      productName: item.productName,
      quantity: item.quantity
    })) ?? [],
    complianceStatus: coreOrder.complianceStatus,
    paymentStatus: coreOrder.paymentStatus,
    shippingStatus: coreOrder.shippingStatus
  };
}
