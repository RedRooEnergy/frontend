import type { WeChatTemplateRegistryRecord } from "./types";
import { canonicalPayloadHash } from "./hash";
import { validateWeChatRenderedPayloadPolicy } from "./policyValidator";

export const WECHAT_RENDERER_VERSION = "ext-wechat-01-renderer.v1";

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function findPlaceholders(template: string) {
  const set = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    if (match[1]) set.add(match[1]);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function normalizePlaceholders(input: Record<string, string | number | boolean | null | undefined>) {
  return Object.fromEntries(
    Object.entries(input || {})
      .map(([key, value]) => [String(key).trim(), value === null || value === undefined ? "" : String(value)])
      .filter(([key]) => key.length > 0)
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function assertPlaceholderContract(input: {
  template: WeChatTemplateRegistryRecord;
  placeholders: Record<string, string>;
}) {
  const templatePlaceholders = findPlaceholders(input.template.renderTemplate);
  const required = [...input.template.requiredPlaceholders].sort((a, b) => a.localeCompare(b));

  if (templatePlaceholders.length !== required.length) {
    throw new Error("WECHAT_RENDER_CONTRACT_VIOLATION: template placeholders do not match requiredPlaceholders");
  }

  for (let index = 0; index < required.length; index += 1) {
    if (required[index] !== templatePlaceholders[index]) {
      throw new Error("WECHAT_RENDER_CONTRACT_VIOLATION: template placeholder mismatch");
    }
  }

  const placeholderKeys = Object.keys(input.placeholders).sort((a, b) => a.localeCompare(b));
  for (const key of placeholderKeys) {
    if (!required.includes(key)) {
      throw new Error(`WECHAT_RENDER_CONTRACT_VIOLATION: unknown placeholder \"${key}\"`);
    }
  }

  for (const key of required) {
    const value = input.placeholders[key];
    if (value === undefined || value === null || String(value).trim().length === 0) {
      throw new Error(`WECHAT_RENDER_CONTRACT_VIOLATION: missing placeholder \"${key}\"`);
    }
  }
}

function renderTemplate(template: string, placeholders: Record<string, string>) {
  return template.replace(PLACEHOLDER_REGEX, (_raw, key) => {
    const normalizedKey = String(key || "").trim();
    if (!Object.prototype.hasOwnProperty.call(placeholders, normalizedKey)) {
      throw new Error(`WECHAT_RENDER_CONTRACT_VIOLATION: unresolved placeholder \"${normalizedKey}\"`);
    }
    return placeholders[normalizedKey];
  });
}

export function renderWeChatMessage(input: {
  template: WeChatTemplateRegistryRecord;
  placeholders: Record<string, string | number | boolean | null | undefined>;
}) {
  const normalizedPlaceholders = normalizePlaceholders(input.placeholders || {});

  assertPlaceholderContract({
    template: input.template,
    placeholders: normalizedPlaceholders,
  });

  const renderedPayload = renderTemplate(input.template.renderTemplate, normalizedPlaceholders);

  validateWeChatRenderedPayloadPolicy({
    renderedPayload,
    language: input.template.language,
    allowedLinks: input.template.allowedLinks,
  });

  const renderedPayloadHashSha256 = canonicalPayloadHash({
    renderedPayload,
    language: input.template.language,
    templateKey: input.template.templateKey,
    schemaVersion: input.template.schemaVersion,
    placeholders: normalizedPlaceholders,
  });

  return {
    renderedPayload,
    renderedPayloadHashSha256,
    rendererVersion: WECHAT_RENDERER_VERSION,
  };
}
