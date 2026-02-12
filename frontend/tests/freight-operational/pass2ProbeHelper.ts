/**
 * Fetch text from a URL with a timeout guard.
 * Uses Node 20 built-in fetch/AbortController (no external dependencies).
 */
export async function fetchTextWithTimeout(url: string, timeoutMs = 5000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Throw when an expected anchor is missing.
 */
export function assertContains(source: string, anchor: string): void {
  if (!source.includes(anchor)) {
    throw new Error(`Expected anchor "${anchor}" not found`);
  }
}
