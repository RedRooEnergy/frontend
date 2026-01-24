/**
 * Escrow Projection Adapter
 * Finance Authority–visible escrow projection only.
 */

export function projectEscrow(coreEscrow: any) {
  if (!coreEscrow) {
    return null;
  }

  return {
    escrowId: coreEscrow.id,
    amount: coreEscrow.amount,
    currency: coreEscrow.currency,
    state: coreEscrow.state,
    holdReason: coreEscrow.holdReason,
    createdAt: coreEscrow.createdAt,
    releasedAt: coreEscrow.releasedAt ?? null
  };
}
