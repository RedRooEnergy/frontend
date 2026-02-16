export async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJsonWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const res = await fetchWithTimeout(input, init, timeoutMs);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export async function fetchTextWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const res = await fetchWithTimeout(input, init, timeoutMs);
  const text = await res.text().catch(() => "");
  return { res, text };
}

export function assertContains(source: string, anchor: string) {
  if (!source.includes(anchor)) {
    throw new Error(`Expected anchor not found: ${anchor}`);
  }
}
