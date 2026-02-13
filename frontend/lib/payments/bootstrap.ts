import { validatePaymentsRuntimeConfig } from "./config";

let initialized = false;

export function initializePaymentsRuntime() {
  if (initialized) {
    return;
  }

  validatePaymentsRuntimeConfig();
  initialized = true;
}

function shouldEagerValidate() {
  const stripeEnabled = String(process.env.ENABLE_STRIPE_HARDENED_FLOW || "").trim().toLowerCase() === "true";
  const wiseEnabled = String(process.env.ENABLE_WISE_HARDENED_FLOW || "").trim().toLowerCase() === "true";
  return stripeEnabled || wiseEnabled;
}

// Enforce runtime bundle validation at API/module init boundary when hardened flows are enabled.
if (shouldEagerValidate()) {
  initializePaymentsRuntime();
}
