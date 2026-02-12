export type HtmlProbeResult = {
  ok: boolean;
  status: number;
  url: string;
  body: string;
};

export type JsonProbeResult = {
  ok: boolean;
  status: number;
  url: string;
  body: unknown;
};

async function fetchWithTimeout(input: string, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Timeout after ${ms}ms`)), ms);
  try {
    return await fetch(input, { signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHtmlWithTimeout(url: string, ms = 8000): Promise<HtmlProbeResult> {
  const response = await fetchWithTimeout(url, ms);
  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    body,
  };
}

export async function fetchJsonWithTimeout(url: string, ms = 8000): Promise<JsonProbeResult> {
  const response = await fetchWithTimeout(url, ms);
  const rawText = await response.text();
  let body: unknown = rawText;
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    body = rawText;
  }
  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    body,
  };
}

export function assertContains(text: string, anchor: string | RegExp): boolean {
  if (typeof anchor === "string") return text.includes(anchor);
  return anchor.test(text);
}
