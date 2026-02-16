import { BuyerDocument, DocumentType, getBuyerDocuments, setBuyerDocuments } from "./store";

function ensureSeedDocuments() {
  const docs = getBuyerDocuments();
  if (docs.length > 0) return docs;
  // seed with placeholder doc for existing orders? leave empty; documents created when orders created in future phases.
  return docs;
}

export function listDocumentsForBuyer(email: string, orderIds?: string[]): BuyerDocument[] {
  const docs = ensureSeedDocuments();
  const filtered = docs.filter((d) => d.buyerEmail === email);
  if (orderIds && orderIds.length > 0) {
    return filtered.filter((d) => orderIds.includes(d.orderId));
  }
  return filtered;
}

export function addDocument(doc: BuyerDocument) {
  const docs = getBuyerDocuments();
  docs.push(doc);
  setBuyerDocuments(docs);
}

export function createOrderDocuments(orderId: string, buyerEmail: string, includeInvoice = false, includeShipping = false) {
  const docs: BuyerDocument[] = [
    {
      documentId: crypto.randomUUID(),
      orderId,
      buyerEmail,
      type: "ORDER_CONFIRMATION",
      name: `Order Confirmation - ${orderId}`,
      createdAt: new Date().toISOString(),
    },
  ];
  if (includeInvoice) {
    docs.push({
      documentId: crypto.randomUUID(),
      orderId,
      buyerEmail,
      type: "INVOICE",
      name: `Invoice - ${orderId}`,
      createdAt: new Date().toISOString(),
    });
  }
  if (includeShipping) {
    docs.push({
      documentId: crypto.randomUUID(),
      orderId,
      buyerEmail,
      type: "SHIPPING",
      name: `Shipping Document - ${orderId}`,
      createdAt: new Date().toISOString(),
    });
  }
  const existing = getBuyerDocuments();
  setBuyerDocuments([...existing, ...docs]);
}

export function getDocumentTypeLabel(type: DocumentType) {
  switch (type) {
    case "ORDER_CONFIRMATION":
      return "Order confirmation";
    case "INVOICE":
      return "Invoice / receipt";
    case "SHIPPING":
      return "Shipping document";
    case "COMPLIANCE":
      return "Compliance certificate";
    default:
      return type;
  }
}
