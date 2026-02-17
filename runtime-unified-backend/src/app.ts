import express, { NextFunction, Request, Response } from "express";

// NOTE: routes in src/routes/* must be router-only modules (no listen(), no DB connect).
import { paymentsCheckoutRouter } from "./routes/paymentsCheckout.js";
import { refundsRouter } from "./routes/refunds.js";
import { adminQueuesRouter } from "./routes/adminQueues.js";
import { settlementHoldsRouter } from "./routes/settlementHolds.js";
import { shippingRouter } from "./routes/shipping.js";

export function createApp() {
  const app = express();

  // Core middleware (no authority expansion)
  app.use(express.json({ limit: "2mb" }));

  // Health (required for consolidation)
  app.get("/healthz", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "rre-runtime-unified-backend",
      timestamp: new Date().toISOString(),
    });
  });

  // Payments
  app.use("/api/payments", paymentsCheckoutRouter);
  app.use("/api/payments/refunds", refundsRouter);

  // Shipping
  app.use("/api/shipping", shippingRouter);

  // Admin/Settlement (existing)
  app.use("/api/admin/queues", adminQueuesRouter);
  app.use("/api/settlement/holds", settlementHoldsRouter);

  // Error handler (preserves route-level status errors)
  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || "INTERNAL_SERVER_ERROR";
    res.status(status).json({ error: message });
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
