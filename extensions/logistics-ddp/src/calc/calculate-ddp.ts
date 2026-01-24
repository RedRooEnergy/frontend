import { DDPInput, DDPResult } from "./ddp-types";

export function calculateDDP(input: DDPInput): DDPResult {
  // Deterministic, governance-safe placeholder:
  // duty = 5% of declared value
  // gst  = 10% of (declared value + duty)
  const duty = round(input.declaredValue * 0.05);
  const gst = round((input.declaredValue + duty) * 0.10);
  const total = round(input.declaredValue + duty + gst);

  return Object.freeze({
    shipmentId: input.shipmentId,
    duty,
    gst,
    total,
    currency: input.currency,
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
