export function normalizeSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function assertValidSlug(slug: string) {
  if (!slug || slug.length < 3) throw new Error("Slug too short");
  if (slug.length > 80) throw new Error("Slug too long");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid slug format");
}
