import type { WeChatLanguage } from "./types";

const LINK_REGEX = /https?:\/\/[^\s)\]\}>"]+/gi;

const SECRET_PATTERNS: RegExp[] = [
  /\b(?:card|credit\s*card|cvv|cvc|iban|swift|routing\s*number|bank\s*account)\b/i,
  /\b(?:token|api[_-]?key|secret|password|private[_-]?key|bearer\s+[a-z0-9._-]+)\b/i,
  /\b\d{13,19}\b/, // card-like numeric runs
];

function normalizeAllowedHosts(value: string | undefined) {
  const parsed = String(value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (parsed.length > 0) return new Set(parsed);

  return new Set([
    "app.redrooenergy.com",
    "redrooenergy.com",
    "www.redrooenergy.com",
    "localhost",
    "127.0.0.1",
  ]);
}

function hostnameFromUrl(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

function hasForbiddenSecretPattern(text: string) {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

function parseMaxLength(value: string | undefined) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed) || parsed <= 0) return 1024;
  return Math.floor(parsed);
}

function normalizePath(pathname: string) {
  if (!pathname.startsWith("/")) return `/${pathname}`;
  return pathname;
}

function pathAllowedByPatterns(pathname: string, allowedPatterns: string[]) {
  if (allowedPatterns.length === 0) return true;
  const normalizedPath = normalizePath(pathname);

  return allowedPatterns.some((patternRaw) => {
    const pattern = normalizePath(patternRaw.trim());
    if (!pattern) return false;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return normalizedPath.startsWith(prefix);
    }
    return normalizedPath === pattern;
  });
}

export function validateWeChatRenderedPayloadPolicy(input: {
  renderedPayload: string;
  language: WeChatLanguage;
  allowedLinks: string[];
}) {
  const renderedPayload = String(input.renderedPayload || "");
  const language = input.language;
  const allowedLinks = Array.isArray(input.allowedLinks) ? input.allowedLinks : [];

  if (language !== "en-AU" && language !== "zh-CN") {
    throw new Error(`WECHAT_POLICY_VIOLATION: Unsupported language \"${language}\"`);
  }

  const maxLength = parseMaxLength(process.env.WECHAT_RENDER_MAX_LENGTH);
  if (renderedPayload.length > maxLength) {
    throw new Error("WECHAT_POLICY_VIOLATION: payload exceeds maximum length");
  }

  if (hasForbiddenSecretPattern(renderedPayload)) {
    throw new Error("WECHAT_POLICY_VIOLATION: payload contains forbidden secret pattern");
  }

  const allowedHosts = normalizeAllowedHosts(process.env.WECHAT_ALLOWED_LINK_HOSTS);
  const links = renderedPayload.match(LINK_REGEX) || [];

  for (const urlValue of links) {
    const host = hostnameFromUrl(urlValue);
    if (!host) {
      throw new Error(`WECHAT_POLICY_VIOLATION: invalid link \"${urlValue}\"`);
    }

    if (!allowedHosts.has(host)) {
      throw new Error(`WECHAT_POLICY_VIOLATION: link host \"${host}\" not allowlisted`);
    }

    const pathname = (() => {
      try {
        return new URL(urlValue).pathname;
      } catch {
        return "";
      }
    })();

    if (!pathAllowedByPatterns(pathname, allowedLinks)) {
      throw new Error(`WECHAT_POLICY_VIOLATION: link path \"${pathname}\" not allowed by template policy`);
    }
  }
}
