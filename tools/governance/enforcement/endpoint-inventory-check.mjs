import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  capFindings,
  checkResult,
  dedupeRoutes,
  discoverExpressRoutes,
  discoverNextRoutes,
  loadConfig,
  normalizePath,
  parseAppendixInventoryRoutes,
  routeKey
} from "./_lib.mjs";

export async function runCheck(repoRoot = process.cwd()) {
  const config = await loadConfig(repoRoot);
  const appendixAbs = path.join(repoRoot, config.appendixAPath);
  const appendixText = await fs.readFile(appendixAbs, "utf8");

  const governedPrefixes = (config.governedRoutePrefixes || [])
    .map((prefix) => normalizePath(prefix))
    .filter(Boolean);

  function isGovernedPath(routePath) {
    if (governedPrefixes.length === 0) {
      return true;
    }
    const p = normalizePath(routePath);
    return governedPrefixes.some(
      (prefix) => p === prefix || p.startsWith(`${prefix}/`)
    );
  }

  const declaredRoutes = parseAppendixInventoryRoutes(appendixText).filter(
    (route) => isGovernedPath(route.path)
  );
  const declaredMap = new Map(
    declaredRoutes.map((route) => [routeKey(route.method, route.path), route])
  );

  const nextRoutes = await discoverNextRoutes(repoRoot, config.nextApiRoot);
  const expressRoutes = await discoverExpressRoutes(
    repoRoot,
    config.backendRoutesRoot,
    config.mountProbeFiles
  );
  const discoveredRoutes = dedupeRoutes([...nextRoutes, ...expressRoutes]).filter(
    (route) => isGovernedPath(route.path)
  );
  const discoveredMap = new Map(
    discoveredRoutes.map((route) => [routeKey(route.method, route.path), route])
  );

  const undeclaredFindings = [];
  for (const route of discoveredRoutes) {
    const key = routeKey(route.method, route.path);
    if (!declaredMap.has(key)) {
      undeclaredFindings.push({
        severity: "ERROR",
        code: "UNDECLARED_ENDPOINT",
        method: route.method,
        path: route.path,
        source: route.source
      });
    }
  }

  const missingWarnings = [];
  for (const route of declaredRoutes) {
    const key = routeKey(route.method, route.path);
    if (!discoveredMap.has(key)) {
      missingWarnings.push({
        severity: "WARN",
        code: "DECLARED_BUT_NOT_IMPLEMENTED",
        method: route.method,
        path: route.path,
        appendixLine: route.line
      });
    }
  }

  const findings = capFindings(undeclaredFindings, config.maxFindings);
  const warnings = capFindings(missingWarnings, config.maxFindings);
  const pass = undeclaredFindings.length === 0;

  const summary = pass
    ? `PASS: ${discoveredRoutes.length} governed discovered routes all declared.`
    : `FAIL: ${undeclaredFindings.length} undeclared governed discovered route(s).`;

  return checkResult("endpoint-inventory-check", pass, summary, findings, warnings);
}

const isDirectRun = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isDirectRun) {
  const result = await runCheck();
  process.stdout.write(`${result.summary}\n`);
  if (result.findings.length > 0) {
    process.stdout.write(
      `${JSON.stringify(result.findings.slice(0, 50), null, 2)}\n`
    );
  }
  process.exit(result.pass ? 0 : 1);
}
