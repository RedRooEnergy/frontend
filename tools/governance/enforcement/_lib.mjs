import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD"
]);

export const DEFAULT_CONFIG = {
  appendixAPath:
    "docs/governance/MASTER_DASHBOARD_GOVERNANCE_CONTROL_SURFACE_APPENDIX_A_RBAC_ENDPOINT_MATRIX_v1.0.md",
  activationRegisterPath: "docs/governance/GOVERNANCE_ACTIVATION_REGISTER.md",
  scorecardOutputPath:
    "artifacts/governance/dashboard-control-surface.scorecard.json",
  nextApiRoot: "frontend/app/api",
  backendRoutesRoot: "backend/routes",
  governedRoutePrefixes: [
    "/api/admin",
    "/api/installer",
    "/api/freight",
    "/api/insurance",
    "/api/compliance",
    "/api/governance"
  ],
  mountProbeFiles: ["backend/app.js", "backend/server.js", "backend/index.js"],
  rbacScanRoots: [
    "backend/middleware",
    "backend/routes",
    "backend/models",
    "frontend/app/api",
    "frontend/lib",
    "frontend/middleware.ts",
    "frontend/middleware.js"
  ],
  allowedStates: [
    "DRAFT",
    "LOCK-READY",
    "CI-VERIFIED",
    "ACTIVATED",
    "REGULATOR-READY",
    "FROZEN"
  ],
  stateOrder: [
    "DRAFT",
    "LOCK-READY",
    "CI-VERIFIED",
    "ACTIVATED",
    "REGULATOR-READY"
  ],
  maxFindings: 200
};

export async function loadConfig(repoRoot) {
  const configPath = path.join(
    repoRoot,
    "tools/governance/enforcement/config.json"
  );
  const exists = await fileExists(configPath);
  if (!exists) {
    return { ...DEFAULT_CONFIG };
  }
  const parsed = JSON.parse(await fs.readFile(configPath, "utf8"));
  return { ...DEFAULT_CONFIG, ...parsed };
}

export function capFindings(findings, maxFindings) {
  if (findings.length <= maxFindings) {
    return findings;
  }
  const capped = findings.slice(0, maxFindings);
  capped.push({
    severity: "INFO",
    code: "FINDINGS_CAPPED",
    message: `Findings capped at ${maxFindings}; total=${findings.length}.`
  });
  return capped;
}

export async function fileExists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function listFilesRecursively(rootDir, extensions) {
  if (!(await fileExists(rootDir))) {
    return [];
  }
  const out = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.has(ext)) {
          out.push(abs);
        }
      }
    }
  }

  await walk(rootDir);
  out.sort();
  return out;
}

export function normalizeMethod(raw) {
  return String(raw || "").trim().toUpperCase();
}

export function normalizePath(rawPath) {
  let p = String(rawPath || "").trim();
  if (!p) {
    return "/";
  }

  p = p
    .replace(/^`+|`+$/g, "")
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");

  p = p.split("?")[0].split("#")[0];

  p = p.replace(/\[\[\.\.\.[^\]]+\]\]/g, ":param");
  p = p.replace(/\[\.\.\.[^\]]+\]/g, ":param");
  p = p.replace(/\[[^\]]+\]/g, ":param");
  p = p.replace(/:[A-Za-z0-9_]+/g, ":param");

  if (!p.startsWith("/")) {
    p = `/${p}`;
  }
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  return p;
}

export function routeKey(method, routePath) {
  return `${normalizeMethod(method)} ${normalizePath(routePath)}`;
}

export function parseMethodCell(cell) {
  const cleaned = String(cell || "")
    .replace(/`/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (!cleaned) {
    return [];
  }

  const tokens = cleaned.split(/[,/]/).filter(Boolean);
  const methods = [];
  for (const token of tokens) {
    if (HTTP_METHODS.has(token)) {
      methods.push(token);
    }
  }
  return methods;
}

export function parseAppendixInventoryRoutes(markdown) {
  const routes = [];
  const lines = markdown.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) {
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (cells.length < 2) {
      continue;
    }
    if (cells.every((c) => /^-+$/.test(c.replace(/\s/g, "")))) {
      continue;
    }

    const pathCandidates = [];
    const methodCandidates = [];

    for (const cell of cells) {
      if (cell.includes("/api/")) {
        const match = cell.match(/`(\/api\/[^`]+)`|(\/api\/[^\s|]+)/);
        if (match) {
          pathCandidates.push(match[1] || match[2]);
        }
      }
      const parsedMethods = parseMethodCell(cell);
      methodCandidates.push(...parsedMethods);
    }

    if (pathCandidates.length === 0 || methodCandidates.length === 0) {
      continue;
    }

    for (const method of methodCandidates) {
      for (const p of pathCandidates) {
        routes.push({
          method: normalizeMethod(method),
          path: normalizePath(p),
          line: i + 1
        });
      }
    }
  }

  return dedupeRoutes(routes);
}

export function dedupeRoutes(routes) {
  const byKey = new Map();
  for (const route of routes) {
    byKey.set(routeKey(route.method, route.path), {
      method: normalizeMethod(route.method),
      path: normalizePath(route.path),
      ...route
    });
  }
  return [...byKey.values()].sort((a, b) => {
    const ka = routeKey(a.method, a.path);
    const kb = routeKey(b.method, b.path);
    return ka.localeCompare(kb);
  });
}

export function parseBacktickedValues(text) {
  const values = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    values.push(m[1].trim());
  }
  return values;
}

export function parseClosedRoleDataFromAppendix(markdown) {
  const closedBlockMatch = markdown.match(
    /Runtime role keys currently recognized[\s\S]*?Governance designation roles/
  );
  const aliasBlockMatch = markdown.match(
    /Governance designation roles[\s\S]*?No role outside this closed set is authorized/
  );

  const closedBlock = closedBlockMatch ? closedBlockMatch[0] : "";
  const aliasBlock = aliasBlockMatch ? aliasBlockMatch[0] : "";

  const closedRoles = new Set(parseBacktickedValues(closedBlock));
  const aliasRoles = new Set(parseBacktickedValues(aliasBlock));

  return {
    closedRoles: [...closedRoles].sort(),
    aliasRoles: [...aliasRoles].sort()
  };
}

export function nextRoutePathFromFile(nextApiRoot, filePath) {
  const relDir = path.relative(nextApiRoot, path.dirname(filePath));
  if (!relDir || relDir === ".") {
    return "/api";
  }
  const segments = relDir.split(path.sep).map((seg) => {
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(seg)) {
      return ":param";
    }
    if (/^\[\.\.\.[^\]]+\]$/.test(seg)) {
      return ":param";
    }
    if (/^\[[^\]]+\]$/.test(seg)) {
      return ":param";
    }
    return seg;
  });
  return normalizePath(`/api/${segments.join("/")}`);
}

export async function discoverNextRoutes(repoRoot, nextApiRootRel) {
  const nextApiRoot = path.join(repoRoot, nextApiRootRel);
  const files = await listFilesRecursively(
    nextApiRoot,
    new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])
  );
  const routeFiles = files.filter((f) => /\/route\.(t|j)sx?$/.test(f));

  const routes = [];
  for (const file of routeFiles) {
    const text = await fs.readFile(file, "utf8");
    const methods = new Set();

    let m;
    const fnRe =
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g;
    while ((m = fnRe.exec(text)) !== null) {
      methods.add(m[1].toUpperCase());
    }
    const constRe =
      /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g;
    while ((m = constRe.exec(text)) !== null) {
      methods.add(m[1].toUpperCase());
    }

    if (methods.size === 0) {
      continue;
    }

    const routePath = nextRoutePathFromFile(nextApiRoot, file);
    for (const method of methods) {
      routes.push({
        source: toRepoPath(repoRoot, file),
        method,
        path: routePath
      });
    }
  }

  return dedupeRoutes(routes);
}

function normalizeModuleRef(moduleRef) {
  return moduleRef.replace(/\\/g, "/");
}

function extractImportAliasMap(fileText) {
  const aliasMap = new Map();
  let m;

  const requireRe =
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  while ((m = requireRe.exec(fileText)) !== null) {
    aliasMap.set(m[1], m[2]);
  }

  const importRe =
    /\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"`]([^'"`]+)['"`]/g;
  while ((m = importRe.exec(fileText)) !== null) {
    aliasMap.set(m[1], m[2]);
  }

  return aliasMap;
}

async function resolveModuleToRouteFiles(repoRoot, mountFile, moduleRef, backendRoutesRootAbs) {
  const ref = normalizeModuleRef(moduleRef);
  if (!ref.startsWith(".") && !ref.startsWith("/")) {
    return [];
  }

  const absBase = ref.startsWith("/")
    ? ref
    : path.resolve(path.dirname(mountFile), ref);
  const candidates = [
    absBase,
    `${absBase}.js`,
    `${absBase}.ts`,
    `${absBase}.mjs`,
    `${absBase}.cjs`,
    path.join(absBase, "index.js"),
    path.join(absBase, "index.ts"),
    path.join(absBase, "index.mjs"),
    path.join(absBase, "index.cjs")
  ];

  const resolved = [];
  for (const candidate of candidates) {
    if (!(await fileExists(candidate))) {
      continue;
    }
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) {
      const files = await listFilesRecursively(
        candidate,
        new Set([".js", ".ts", ".mjs", ".cjs"])
      );
      for (const f of files) {
        if (f.startsWith(backendRoutesRootAbs)) {
          resolved.push(f);
        }
      }
    } else if (stat.isFile()) {
      if (candidate.startsWith(backendRoutesRootAbs)) {
        resolved.push(candidate);
      }
    }
  }

  return [...new Set(resolved)];
}

async function discoverExpressMountPrefixes(repoRoot, backendRoutesRootRel, mountProbeFiles) {
  const backendRoutesRootAbs = path.join(repoRoot, backendRoutesRootRel);
  const mountMap = new Map();

  for (const mountRel of mountProbeFiles) {
    const mountAbs = path.join(repoRoot, mountRel);
    if (!(await fileExists(mountAbs))) {
      continue;
    }
    const text = await fs.readFile(mountAbs, "utf8");
    const aliasMap = extractImportAliasMap(text);

    const useRe =
      /app\.use\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*(require\(\s*['"`][^'"`]+['"`]\s*\)|[A-Za-z_$][\w$]*)\s*\)/g;
    let m;
    while ((m = useRe.exec(text)) !== null) {
      const prefix = normalizePath(m[2]);
      const refToken = m[3].trim();

      let moduleRef = null;
      const directRequire = refToken.match(
        /^require\(\s*['"`]([^'"`]+)['"`]\s*\)$/
      );
      if (directRequire) {
        moduleRef = directRequire[1];
      } else if (aliasMap.has(refToken)) {
        moduleRef = aliasMap.get(refToken);
      }
      if (!moduleRef) {
        continue;
      }

      const routeFiles = await resolveModuleToRouteFiles(
        repoRoot,
        mountAbs,
        moduleRef,
        backendRoutesRootAbs
      );
      for (const file of routeFiles) {
        if (!mountMap.has(file)) {
          mountMap.set(file, new Set());
        }
        mountMap.get(file).add(prefix);
      }
    }
  }

  const out = new Map();
  for (const [file, prefixes] of mountMap.entries()) {
    out.set(file, [...prefixes].sort());
  }
  return out;
}

function parseQuotedStrings(raw) {
  const out = [];
  let m;
  const re = /['"`]([A-Za-z0-9:_\-/.]+)['"`]/g;
  while ((m = re.exec(raw)) !== null) {
    out.push(m[1]);
  }
  return out;
}

export async function discoverExpressRoutes(
  repoRoot,
  backendRoutesRootRel,
  mountProbeFiles
) {
  const backendRoutesRoot = path.join(repoRoot, backendRoutesRootRel);
  if (!(await fileExists(backendRoutesRoot))) {
    return [];
  }

  const files = await listFilesRecursively(
    backendRoutesRoot,
    new Set([".js", ".ts", ".mjs", ".cjs"])
  );
  const mountMap = await discoverExpressMountPrefixes(
    repoRoot,
    backendRoutesRootRel,
    mountProbeFiles
  );

  const routes = [];

  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    const localRoutes = [];
    let m;

    const directRe =
      /\brouter\.(get|post|put|patch|delete|options|head)\s*\(\s*(['"`])([^'"`]+)\2/g;
    while ((m = directRe.exec(text)) !== null) {
      localRoutes.push({ method: m[1].toUpperCase(), localPath: m[3] });
    }

    const routeChainRe =
      /\brouter\.route\(\s*(['"`])([^'"`]+)\1\s*\)\s*\.([a-z]+)\s*\(/g;
    while ((m = routeChainRe.exec(text)) !== null) {
      const method = m[3].toUpperCase();
      if (HTTP_METHODS.has(method)) {
        localRoutes.push({ method, localPath: m[2] });
      }
    }

    if (localRoutes.length === 0) {
      continue;
    }

    const prefixes = mountMap.get(file) || [];
    for (const route of localRoutes) {
      const localPath = normalizePath(route.localPath);
      const fullPaths = new Set();

      if (localPath.startsWith("/api/") || localPath === "/api") {
        fullPaths.add(localPath);
      }
      for (const prefix of prefixes) {
        fullPaths.add(normalizePath(`${prefix}/${localPath}`));
      }
      if (fullPaths.size === 0) {
        fullPaths.add(localPath);
      }

      for (const fullPath of fullPaths) {
        routes.push({
          source: toRepoPath(repoRoot, file),
          method: route.method,
          path: fullPath
        });
      }
    }
  }

  return dedupeRoutes(routes);
}

export function toRepoPath(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).replace(/\\/g, "/");
}

export function extractRoleCandidatesFromCode(text) {
  const candidates = [];

  const roleLiteralPatterns = [
    /\brole\s*===\s*(['"`])([^'"`]+)\1/g,
    /\brole\s*!==\s*(['"`])([^'"`]+)\1/g,
    /\broles?\s*\.includes\(\s*(['"`])([^'"`]+)\1\s*\)/g
  ];

  for (const re of roleLiteralPatterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      candidates.push({ value: m[2], index: m.index });
    }
  }

  const arrayPatterns = [
    /\brequireRole(?:s)?\s*\(\s*\[([^\]]+)\]\s*\)/g,
    /\brole[s]?\s*:\s*\{\s*enum\s*:\s*\[([^\]]+)\]/g,
    /\ballowedRoles?\s*[:=]\s*\[([^\]]+)\]/g
  ];

  for (const re of arrayPatterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const values = parseQuotedStrings(m[1]);
      for (const value of values) {
        candidates.push({ value, index: m.index });
      }
    }
  }

  return candidates.filter((candidate) =>
    /^[a-z][a-z0-9-]*$/.test(candidate.value)
  );
}

export function lineFromIndex(text, index) {
  const chunk = text.slice(0, Math.max(0, index));
  return chunk.split(/\r?\n/).length;
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function sha256Hex(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function writeJsonFile(absPath, payload) {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

export function runGit(repoRoot, args) {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8"
  }).trim();
}

export function nowUtcIso() {
  return new Date().toISOString();
}

export function checkResult(name, pass, summary, findings = [], warnings = []) {
  return {
    name,
    pass,
    summary,
    findings,
    warnings
  };
}
