export function supplierPhaseEnabled() {
  if (process.env.NEXT_PUBLIC_SUPPLIER_PHASE) {
    return process.env.NEXT_PUBLIC_SUPPLIER_PHASE === "on";
  }
  return process.env.NODE_ENV !== "production";
}

export function adminPhaseEnabled() {
  return process.env.NEXT_PUBLIC_ADMIN_PHASE === "on";
}

export function ext02Enabled() {
  return process.env.NEXT_PUBLIC_EXT02 === "on";
}

export function ext03Enabled() {
  return process.env.NEXT_PUBLIC_EXT03 === "on";
}

export function ext04Enabled() {
  return process.env.NEXT_PUBLIC_EXT04 === "on";
}

export function ext05Enabled() {
  return process.env.NEXT_PUBLIC_EXT05 === "on";
}
