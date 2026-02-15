import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Finding = {
  code: string;
  routePath: string;
  detail: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../../..");
const API_ROOT = path.join(FRONTEND_ROOT, "app", "api");

const SAFE_ROUTE_ALLOWLIST = new Set<string>([
  "app/api/internal/governance/authority/export/route.ts",
  "app/api/internal/governance/authority/shadow/metrics/route.ts",
]);

const FORBIDDEN_PREFIXES = [
  "app/api/governance/authority/",
  "app/api/admin/dashboard/governance/authority/",
];

function walkRoutes(root: string): string[] {
  const queue = [root];
  const routes: string[] = [];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/^route\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
      routes.push(absolutePath);
    }
  }

  return routes.sort((a, b) => a.localeCompare(b));
}

function toRepoRelative(absolutePath: string) {
  return path.relative(FRONTEND_ROOT, absolutePath).split(path.sep).join("/");
}

function hasForbiddenPrefix(routeRelPath: string) {
  return FORBIDDEN_PREFIXES.some((prefix) => routeRelPath.startsWith(prefix));
}

function detectMutatingHttpExports(source: string) {
  return Array.from(source.matchAll(/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/g)).map(
    (match) => match[1]
  );
}

function main() {
  const findings: Finding[] = [];
  const routePaths = walkRoutes(API_ROOT);

  for (const routePath of routePaths) {
    const routeRelPath = toRepoRelative(routePath);
    const source = fs.readFileSync(routePath, "utf8");
    const mutatingExports = detectMutatingHttpExports(source);
    const hasAuth02Marker = /AUTH02|EXT-GOV-AUTH-02|GOV-AUTH-02/i.test(source) || /auth-?02/i.test(routeRelPath);

    if (hasForbiddenPrefix(routeRelPath) && !SAFE_ROUTE_ALLOWLIST.has(routeRelPath)) {
      findings.push({
        code: "FORBIDDEN_AUTHORITY_ROUTE_PATH",
        routePath: routeRelPath,
        detail: "Activation governance authority route path is not allowed in build-only phase.",
      });
    }

    if (hasAuth02Marker && mutatingExports.length > 0 && !SAFE_ROUTE_ALLOWLIST.has(routeRelPath)) {
      findings.push({
        code: "AUTH02_MUTATING_ROUTE_EXPORTED",
        routePath: routeRelPath,
        detail: `Mutating exports detected with AUTH02 markers: ${mutatingExports.join(",")}`,
      });
    }
  }

  if (findings.length > 0) {
    console.error("FAIL activation mutation-surface scan");
    console.error(JSON.stringify({ findings }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("PASS activation mutation-surface scan");
  console.log(`SUMMARY totalRoutes=${routePaths.length} findings=0`);
}

main();
