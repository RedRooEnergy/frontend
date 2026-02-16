import fs from "fs";
import path from "path";
import crypto from "crypto";

const fixturesDir = path.join(process.cwd(), "tests/sandbox/fixtures");
const outDir = path.join(fixturesDir, "seed");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(outDir);

const buyer = {
  buyerId: "buyer-test-1",
  email: "buyer@test.local",
  name: "Test Buyer",
  phone: "0400000000",
  createdAt: new Date().toISOString(),
  password: "test",
};

const supplierOverride = {
  productSlug: "monocrystalline-prod-1",
  supplierId: "supplier-test-1",
  price: 1000,
  originalPrice: 1200,
  wiseProfileId: "wise-profile-test",
  wiseRecipientAccountId: "wise-recipient-test",
  payoutCurrency: "AUD",
};

const pricingSnapshotHash = hash(JSON.stringify({ items: [{ name: "PV Module", qty: 1, price: 1000 }], total: 1000 }));

const order = {
  orderId: "ORDER_TEST",
  createdAt: new Date().toISOString(),
  buyerEmail: buyer.email,
  shippingAddress: { line1: "1 Test St", city: "Sydney", state: "NSW", postcode: "2000" },
  items: [{ productSlug: supplierOverride.productSlug, name: "PV Module", qty: 1, price: 1000, supplierId: "supplier-test-1" }],
  total: 1000,
  status: "PENDING",
  currency: "aud",
  pricingSnapshotHash,
  timeline: [{ status: "PENDING", timestamp: new Date().toISOString() }],
};

const orderReview = { ...order, orderId: "ORDER_REVIEW", pricingSnapshotHash: "HASH_OK" };

ensureDir(outDir);
fs.writeFileSync(path.join(outDir, "buyer.json"), JSON.stringify(buyer, null, 2));
fs.writeFileSync(path.join(outDir, "supplierOverride.json"), JSON.stringify(supplierOverride, null, 2));
fs.writeFileSync(path.join(outDir, "order.json"), JSON.stringify(order, null, 2));
fs.writeFileSync(path.join(outDir, "orderReview.json"), JSON.stringify(orderReview, null, 2));

console.log("Seed fixtures written to tests/sandbox/fixtures/seed");

function hash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
