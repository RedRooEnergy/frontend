import {
  appendPaymentProviderEvent,
  listPaymentProviderEventsByOrder,
  updatePaymentProviderEventStatus,
  type ProviderEventStoreDependencies,
} from "../../lib/payments/providerEventStore";
import type { PaymentProviderEventRecord } from "../../lib/payments/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function matchesQuery(record: Record<string, any>, query: Record<string, unknown>) {
  for (const [key, value] of Object.entries(query)) {
    if (record[key] !== value) return false;
  }
  return true;
}

function createMemoryDependencies() {
  const rows: PaymentProviderEventRecord[] = [];

  const collection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = rows.find((row) => row.provider === doc.provider && row.eventId === doc.eventId);
      if (duplicate) {
        const err: any = new Error("duplicate key");
        err.code = 11000;
        throw err;
      }
      const next = { ...doc, _id: `${rows.length + 1}` };
      rows.push(next);
      return { insertedId: next._id };
    },
    async findOne(query: Record<string, unknown>) {
      return rows.find((row) => matchesQuery(row as any, query)) || null;
    },
    async findOneAndUpdate(query: Record<string, unknown>, update: Record<string, unknown>) {
      const index = rows.findIndex((row) => matchesQuery(row as any, query));
      if (index === -1) return null;
      const setFields = (update as any).$set || {};
      rows[index] = { ...rows[index], ...setFields };
      return rows[index];
    },
    find(query: Record<string, unknown>) {
      let current = rows.filter((row) => matchesQuery(row as any, query));
      return {
        sort(spec: Record<string, 1 | -1>) {
          const [[field, direction]] = Object.entries(spec);
          current = current.sort((a: any, b: any) => {
            const left = String(a[field] || "");
            const right = String(b[field] || "");
            return direction === -1 ? right.localeCompare(left) : left.localeCompare(right);
          });
          return {
            limit(value: number) {
              current = current.slice(0, value);
              return {
                async toArray() {
                  return current;
                },
              };
            },
          };
        },
      };
    },
  };

  const deps: Partial<ProviderEventStoreDependencies> = {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-12T12:00:00.000Z"),
  };

  return { deps };
}

async function testAppendIsIdempotentByProviderAndEventId() {
  const { deps } = createMemoryDependencies();

  const first = await appendPaymentProviderEvent(
    {
      provider: "stripe",
      eventId: "evt_1",
      eventType: "payment_intent.succeeded",
      orderId: "ORD-1",
      payloadHashSha256: "a".repeat(64),
    },
    deps
  );
  assert(first.created === true, "Expected first event creation");

  const second = await appendPaymentProviderEvent(
    {
      provider: "stripe",
      eventId: "evt_1",
      eventType: "payment_intent.succeeded",
      orderId: "ORD-1",
      payloadHashSha256: "a".repeat(64),
    },
    deps
  );
  assert(second.created === false, "Expected duplicate event dedupe");
  assert(second.event._id === first.event._id, "Expected existing event on duplicate append");
}

async function testUpdateAndListByOrder() {
  const { deps } = createMemoryDependencies();

  await appendPaymentProviderEvent(
    {
      provider: "wise",
      eventId: "wise_evt_1",
      eventType: "transfer.created",
      orderId: "ORD-2",
      payloadHashSha256: "b".repeat(64),
    },
    deps
  );

  const updated = await updatePaymentProviderEventStatus(
    {
      provider: "wise",
      eventId: "wise_evt_1",
      status: "PROCESSED",
      metadata: { transferId: "tr_1" },
    },
    deps
  );

  assert(updated.status === "PROCESSED", "Expected event status update");

  const listed = await listPaymentProviderEventsByOrder({ orderId: "ORD-2" }, deps);
  assert(listed.length === 1, "Expected one event for order");
  assert(listed[0].eventId === "wise_evt_1", "Unexpected event returned");
}

async function run() {
  await testAppendIsIdempotentByProviderAndEventId();
  await testUpdateAndListByOrder();
}

run();
