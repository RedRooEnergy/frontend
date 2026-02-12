function resolveApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "";
}

async function parseJson(response: Response) {
  return response.json().catch(() => ({}));
}

export async function fetchPublicSite(entityPath: string, slug: string) {
  const base = resolveApiBaseUrl();
  const res = await fetch(`${base}/api/public-sites/read/${entityPath}/${slug}`, { cache: "no-store" });
  if (res.status === 404) return { notFound: true as const };
  if (res.status === 410) return { gone: true as const, ...(await parseJson(res)) };
  if (!res.ok) throw new Error("Failed to load public site");
  return res.json();
}

export async function fetchPublicSiteList(entityPath: string) {
  const base = resolveApiBaseUrl();
  const res = await fetch(`${base}/api/public-sites/read/list/${entityPath}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load public site list");
  return res.json();
}

export async function submitPublicContact(payload: any) {
  const base = resolveApiBaseUrl();
  const res = await fetch(`${base}/api/public/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await parseJson(res);
    throw new Error(body.error || "Contact submission failed");
  }
  return res.json();
}
