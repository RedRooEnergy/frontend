/**
 * Settlement Projection Adapter
 * Finance Authority–visible settlement projection only.
 */

export function projectSettlement(coreSettlement: any) {
  if (!coreSettlement) {
    return null;
  }

  return {
    settlementId: coreSettlement.id,
    escrowId: coreSettlement.escrowId,
    amount: coreSettlement.amount,
    currency: coreSettlement.currency,
    state: coreSettlement.state,
    settledAt: coreSettlement.settledAt ?? null
  };
}
