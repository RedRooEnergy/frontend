import express from "express";
import {
  buildStartupContext,
  installBaselineMiddleware,
  installStartupWatchdog,
} from "./bootstrap/startup";
import { emitStartupAudit } from "./audit/startup-audit";
import { enforceAuthorization } from "./auth/authorization-middleware";
import { errorMiddleware } from "./errors/error-middleware";
import { requestContextMiddleware } from "./request/request-context-middleware";
import { registerAllExtensions } from "./extensions/extensions-registry";
import "./extensions";
import { readSupplierRouter } from "./routes/read-supplier.route";
import { registerLogisticsDDP } from "../../../extensions/logistics-ddp/src";
import { registerLogisticsDDPRoutes } from "../../../extensions/logistics-ddp/src";
/*
// Catalogue extension (disabled by governance)
import { registerCatalogueExtension } from "../../extensions/catalogue-management";
*/

const watchdog = installStartupWatchdog(10000);
const { env } = buildStartupContext();
emitStartupAudit();

const app = express();

app.use(express.json());
installBaselineMiddleware(app);
app.use(requestContextMiddleware);
app.use(enforceAuthorization);
registerAllExtensions(app);
registerLogisticsDDP();
registerLogisticsDDPRoutes(app);
/*
registerCatalogueExtension(app);
*/
app.use(readSupplierRouter);

app.get("/healthz", (req, res) => {
  const ctx = (req as any).context;

  res.status(200).json({
    status: "ok",
    service: env.serviceName,
    env: env.env,
    requestId: ctx.requestId,
    actor: ctx.actor,
    timestamp: new Date().toISOString(),
  });
});

app.use(errorMiddleware);

app.listen(env.port, () => {
  clearTimeout(watchdog);
  console.log(
    `[CORE] Platform started | env=${env.env} | port=${env.port} | service=${env.serviceName}`,
  );
});
