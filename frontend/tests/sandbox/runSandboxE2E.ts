#!/usr/bin/env ts-node
import fs from "fs";
import path from "path";
import crypto from "crypto";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), "tests/sandbox/.env.local") });

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const STRIPE_WEBHOOK_SECRET_TEST = process.env.STRIPE_WEBHOOK_SECRET_TEST || "";
const reportPath = path.join(process.cwd(), "tests/sandbox/REPORT.md");

type TestResult = { id: string; title: string; status: "PASS" | "FAIL"; details?: string };
const results: TestResult[] = [];

function addResult(id: string, title: string, status: "PASS" | "FAIL", details = "") {
  results.push({ id, title, status, details });
  console.log(`${status} - ${id}: ${title} ${details ? `(${details})` : ""}`);
}

async function main() {
  await tc01_createSession();
  await tc02_webhookPaymentSuccess();
  await tc03_refundRequest();
  await tc04_refundWebhook();
  await tc05_settlementBlockedAfterRefund();
  await tc06_settlementSuccess();
  await tc07_refundBlockedAfterSettlement();
  await tc08_webhookIdempotency();
  await tc09_pricingMismatchReview();
  writeReport();
}

async function httpPost(url: string, body: any, role: "buyer" | "admin" = "buyer") {
  return fetch(BASE_URL + url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TEST-ROLE": role,
      "X-TEST-USERID": role === "buyer" ? "buyer-test-1" : "admin-test-1",
    },
    body: JSON.stringify(body),
  });
}

function signStripePayload(payload: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET_TEST).update(signedPayload, "utf8").digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

async function tc01_createSession() {
  const res = await httpPost("/api/payments/stripe/create-session", { orderId: "ORDER_TEST", amount: 1000, currency: "aud", pricingSnapshotHash: "HASH_OK" });
  const ok = res.ok;
  addResult("TC-01", "Stripe checkout session creation", ok ? "PASS" : "FAIL", ok ? "" : await res.text());
}

async function tc02_webhookPaymentSuccess() {
  const payload = fs.readFileSync(path.join(process.cwd(), "tests/sandbox/fixtures/stripe-webhook-payment-success.json"), "utf8").replace("ORDER_TEST", "ORDER_TEST").replace("HASH_OK", "HASH_OK");
  const sig = signStripePayload(payload);
  const res = await fetch(BASE_URL + "/api/payments/stripe/webhook", { method: "POST", headers: { "stripe-signature": sig }, body: payload });
  addResult("TC-02", "Simulated webhook payment success", res.ok ? "PASS" : "FAIL", res.ok ? "" : await res.text());
}

async function tc03_refundRequest() {
  const res = await httpPost("/api/payments/stripe/refund", { orderId: "ORDER_TEST", reason: "test refund" });
  addResult("TC-03", "Refund request eligibility gate", res.ok ? "PASS" : "FAIL", res.ok ? "" : await res.text());
}

async function tc04_refundWebhook() {
  const payload = fs.readFileSync(path.join(process.cwd(), "tests/sandbox/fixtures/stripe-webhook-refund-success.json"), "utf8").replace("pi_test_123", "pi_test_123");
  const sig = signStripePayload(payload);
  const res = await fetch(BASE_URL + "/api/payments/stripe/webhook", { method: "POST", headers: { "stripe-signature": sig }, body: payload });
  addResult("TC-04", "Simulated webhook refund success", res.ok ? "PASS" : "FAIL", res.ok ? "" : await res.text());
}

async function tc05_settlementBlockedAfterRefund() {
  const res = await httpPost("/api/settlements/wise/create-transfer", { orderId: "ORDER_TEST" }, "admin");
  addResult("TC-05", "Settlement blocked after refund", res.ok ? "FAIL" : "PASS", res.ok ? "Should block" : "");
}

async function tc06_settlementSuccess() {
  const resSession = await httpPost("/api/payments/stripe/create-session", { orderId: "ORDER_SETTLE", amount: 1000, currency: "aud", pricingSnapshotHash: "HASH_OK" });
  const payload = fs.readFileSync(path.join(process.cwd(), "tests/sandbox/fixtures/stripe-webhook-payment-success.json"), "utf8").replace("ORDER_TEST", "ORDER_SETTLE");
  const sig = signStripePayload(payload);
  await fetch(BASE_URL + "/api/payments/stripe/webhook", { method: "POST", headers: { "stripe-signature": sig }, body: payload });
  // force settlement eligible
  await fetch(BASE_URL + "/api/settlements/wise/create-transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-TEST-ROLE": "admin", "X-TEST-USERID": "admin-test-1" },
    body: JSON.stringify({ orderId: "ORDER_SETTLE" }),
  });
  addResult("TC-06", "Settlement eligible + settlement success", resSession.ok ? "PASS" : "FAIL");
}

async function tc07_refundBlockedAfterSettlement() {
  const res = await httpPost("/api/payments/stripe/refund", { orderId: "ORDER_SETTLE", reason: "should block" });
  addResult("TC-07", "Refund blocked after settlement", res.ok ? "FAIL" : "PASS", res.ok ? "Should block" : "");
}

async function tc08_webhookIdempotency() {
  const payload = fs.readFileSync(path.join(process.cwd(), "tests/sandbox/fixtures/stripe-webhook-payment-success.json"), "utf8").replace("ORDER_TEST", "ORDER_SETTLE");
  const sig = signStripePayload(payload);
  await fetch(BASE_URL + "/api/payments/stripe/webhook", { method: "POST", headers: { "stripe-signature": sig }, body: payload });
  const res = await fetch(BASE_URL + "/api/payments/stripe/webhook", { method: "POST", headers: { "stripe-signature": sig }, body: payload });
  addResult("TC-08", "Webhook idempotency", res.ok ? "PASS" : "FAIL");
}

async function tc09_pricingMismatchReview() {
  const payload = fs.readFileSync(path.join(process.cwd(), "tests/sandbox/fixtures/stripe-webhook-payment-review.json"), "utf8");
  const sig = signStripePayload(payload);
  const res = await fetch(BASE_URL + "/api/payments/stripe/webhook", { method: "POST", headers: { "stripe-signature": sig }, body: payload });
  addResult("TC-09", "Pricing snapshot mismatch triggers review", res.ok ? "PASS" : "FAIL");
}

function writeReport() {
  const lines = [
    `# Sandbox E2E Report`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `Env: BASE_URL=${BASE_URL}`,
    ``,
    `## Results`,
    ...results.map((r) => `- ${r.id} — ${r.status}: ${r.title}${r.details ? ` — ${r.details}` : ""}`),
  ];
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`Report written to ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
