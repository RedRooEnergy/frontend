const FORBIDDEN_KEY_PATTERN =
  /payment|payout|escrow|settlement|invoice|balance|transaction|pricing|price|fee|commission|currency/i;

function walkObject(value: any, path: string[], hits: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkObject(item, [...path, String(index)], hits));
    return;
  }
  Object.entries(value).forEach(([key, child]) => {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      hits.push([...path, key].join("."));
    }
    walkObject(child, [...path, key], hits);
  });
}

export function assertNoMoneyFields(record: any, context = "service-partner") {
  const hits: string[] = [];
  walkObject(record, [], hits);
  if (hits.length) {
    const message = `Service partner record contains forbidden money fields (${context}): ${hits.join(", ")}`;
    throw new Error(message);
  }
}
