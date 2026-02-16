import assert from "node:assert/strict";
import { renderTemplate } from "../../lib/email/renderer";
import { requirePermittedRecipientRole, requireValidEventCode } from "../../lib/email/guards";
import { EMAIL_EVENTS, EMAIL_EVENT_META } from "../../lib/email/events";

type TestFn = () => void;

function run(name: string, fn: TestFn) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw err;
  }
}

run("renderer is deterministic", () => {
  const template = {
    subjectTemplate: "Order {{referenceId}} confirmed",
    bodyTemplateHtml: "<p>Hello {{recipientName}}</p>",
    bodyTemplateText: "Hello {{recipientName}}",
    allowedVariables: ["referenceId", "recipientName"],
  };
  const vars = { referenceId: "ORDER-1", recipientName: "RRE" };
  const first = renderTemplate(template, vars);
  const second = renderTemplate(template, vars);
  assert.equal(first.hash, second.hash);
  assert.equal(first.subject, second.subject);
});

run("rejects unknown event code", () => {
  assert.throws(() => requireValidEventCode("FAKE_EVENT"), /Unknown eventCode/);
});

run("blocks role leakage", () => {
  assert.throws(() => requirePermittedRecipientRole("ORDER_CREATED", "regulator"), /not permitted/);
});

run("taxonomy meta covers all events", () => {
  const events = Object.values(EMAIL_EVENTS);
  for (const code of events) {
    assert.ok(EMAIL_EVENT_META[code], `Missing meta for ${code}`);
  }
});
