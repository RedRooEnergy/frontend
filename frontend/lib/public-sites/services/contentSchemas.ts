import type { PublicEntityType } from "../types";

export function validateContentJSON(entityType: PublicEntityType, content: Record<string, unknown>) {
  if (!content || typeof content !== "object") throw new Error("Invalid contentJSON");

  if (!content.homepage || typeof content.homepage !== "object") throw new Error("Missing homepage");
  if (!content.contact || typeof content.contact !== "object") throw new Error("Missing contact");
  if (!content.terms || typeof content.terms !== "object") throw new Error("Missing terms");

  if (entityType === "SUPPLIER") {
    if (!content.products || typeof content.products !== "object") throw new Error("Missing products section");
    if (!content.warranty || typeof content.warranty !== "object") throw new Error("Missing warranty section");
  }

  if (entityType === "INSTALLER") {
    if (!content.services || typeof content.services !== "object") throw new Error("Missing services section");
    if (!content.warranty || typeof content.warranty !== "object") throw new Error("Missing warranty section");
  }

  if (entityType === "CERTIFIER") {
    if (!content.services || typeof content.services !== "object") throw new Error("Missing services section");
  }

  if (entityType === "INSURANCE") {
    if (!content.products || typeof content.products !== "object") throw new Error("Missing products section");
  }

  const payloadSize = Buffer.byteLength(JSON.stringify(content), "utf8");
  if (payloadSize > 200_000) throw new Error("contentJSON too large");

  return true;
}
