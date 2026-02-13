import {
  createWiseTransferIntent,
  getLatestWiseTransferIntentForOrder,
  transitionWiseTransferIntent,
  type WiseTransferIntentRecord,
  type WiseTransferIntentStoreDependencies,
} from "../../lib/payments/wiseTransferIntentStore";

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
  const rows: WiseTransferIntentRecord[] = [];
  const baseNowMs = Date.parse("2026-02-13T10:00:00.000Z");
  let nowTick = 0;

  const collection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicateByIntent = rows.find((row) => row.intentId === doc.intentId);
      const duplicateByIdempotency = rows.find((row) => row.idempotencyKey === doc.idempotencyKey);
      const duplicateByUuid = rows.find((row) => row.wiseIdempotenceUuid === doc.wiseIdempotenceUuid);
      if (duplicateByIntent || duplicateByIdempotency || duplicateByUuid) {
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

  const deps: Partial<WiseTransferIntentStoreDependencies> = {
    getCollection: async () => collection as any,
    now: () => new Date(baseNowMs + nowTick++),
  };

  return { deps };
}

async function testCreateAndTransitionLifecycle() {
  const { deps } = createMemoryDependencies();

  const created = await createWiseTransferIntent(
    {
      intentId: "intent-1",
      tenantId: "tenant-1",
      orderId: "ORD-1",
      releaseAttemptId: "attempt-1",
      attemptNumber: 1,
      destinationType: "supplier_payout",
      wiseProfileId: "profile-1",
      idempotencyKey: "key-1",
      wiseIdempotenceUuid: "550e8400-e29b-41d4-a716-446655440000",
      transferId: null,
      quoteId: null,
      providerStatus: "intent_created",
      providerStatusAtUtc: "2026-02-13T10:00:00.000Z",
      lastErrorCode: null,
      lastErrorMessage: null,
      maxPollAttempts: 3,
      createdByRole: "admin",
      createdById: "admin-1",
    },
    deps
  );

  assert(created.state === "INTENT_CREATED", "Expected initial Wise transfer state INTENT_CREATED");

  const requested = await transitionWiseTransferIntent(
    {
      intentId: created.intentId,
      toState: "REQUESTED",
      providerStatus: "requested",
    },
    deps
  );
  assert(requested.state === "REQUESTED", "Expected transition to REQUESTED");

  const accepted = await transitionWiseTransferIntent(
    {
      intentId: created.intentId,
      toState: "ACCEPTED",
      transferId: "tr_1",
      providerStatus: "incoming_payment_waiting",
    },
    deps
  );
  assert(accepted.state === "ACCEPTED", "Expected transition to ACCEPTED");
  assert(accepted.transferId === "tr_1", "Expected persisted transfer id");

  const completed = await transitionWiseTransferIntent(
    {
      intentId: created.intentId,
      toState: "COMPLETED",
      providerStatus: "outgoing_payment_sent",
    },
    deps
  );
  assert(completed.state === "COMPLETED", "Expected transition to COMPLETED");
}

async function testTimeoutBlocksAutoRetry() {
  const { deps } = createMemoryDependencies();

  const created = await createWiseTransferIntent(
    {
      intentId: "intent-2",
      tenantId: "tenant-1",
      orderId: "ORD-2",
      releaseAttemptId: "attempt-1",
      attemptNumber: 1,
      destinationType: "supplier_payout",
      wiseProfileId: "profile-1",
      idempotencyKey: "key-2",
      wiseIdempotenceUuid: "550e8400-e29b-41d4-a716-446655440001",
      transferId: null,
      quoteId: null,
      providerStatus: "intent_created",
      providerStatusAtUtc: "2026-02-13T10:00:00.000Z",
      lastErrorCode: null,
      lastErrorMessage: null,
      maxPollAttempts: 3,
      createdByRole: "admin",
      createdById: "admin-1",
    },
    deps
  );

  await transitionWiseTransferIntent(
    {
      intentId: created.intentId,
      toState: "REQUESTED",
      providerStatus: "requested",
    },
    deps
  );

  const timedOut = await transitionWiseTransferIntent(
    {
      intentId: created.intentId,
      toState: "TIMED_OUT",
      providerStatus: "timed_out",
      autoRetryBlocked: true,
    },
    deps
  );

  assert(timedOut.state === "TIMED_OUT", "Expected transition to TIMED_OUT");
  assert(timedOut.autoRetryBlocked === true, "Expected autoRetryBlocked true on TIMED_OUT");
}

async function testInvalidTransitionRejected() {
  const { deps } = createMemoryDependencies();

  const created = await createWiseTransferIntent(
    {
      intentId: "intent-3",
      tenantId: "tenant-1",
      orderId: "ORD-3",
      releaseAttemptId: "attempt-1",
      attemptNumber: 1,
      destinationType: "supplier_payout",
      wiseProfileId: "profile-1",
      idempotencyKey: "key-3",
      wiseIdempotenceUuid: "550e8400-e29b-41d4-a716-446655440002",
      transferId: null,
      quoteId: null,
      providerStatus: "intent_created",
      providerStatusAtUtc: "2026-02-13T10:00:00.000Z",
      lastErrorCode: null,
      lastErrorMessage: null,
      maxPollAttempts: 3,
      createdByRole: "admin",
      createdById: "admin-1",
    },
    deps
  );

  let threw = false;
  try {
    await transitionWiseTransferIntent(
      {
        intentId: created.intentId,
        toState: "COMPLETED",
      },
      deps
    );
  } catch (error: any) {
    threw = true;
    assert(String(error?.message || "").includes("WISE_TRANSFER_TRANSITION_INVALID"), "Expected invalid transition error");
  }

  assert(threw, "Expected invalid lifecycle transition to be rejected");
}

async function testLatestByOrder() {
  const { deps } = createMemoryDependencies();

  await createWiseTransferIntent(
    {
      intentId: "intent-4a",
      tenantId: "tenant-1",
      orderId: "ORD-4",
      releaseAttemptId: "attempt-1",
      attemptNumber: 1,
      destinationType: "supplier_payout",
      wiseProfileId: "profile-1",
      idempotencyKey: "key-4a",
      wiseIdempotenceUuid: "550e8400-e29b-41d4-a716-446655440003",
      transferId: null,
      quoteId: null,
      providerStatus: "intent_created",
      providerStatusAtUtc: "2026-02-13T10:00:00.000Z",
      lastErrorCode: null,
      lastErrorMessage: null,
      maxPollAttempts: 3,
      createdByRole: "admin",
      createdById: "admin-1",
    },
    deps
  );

  await createWiseTransferIntent(
    {
      intentId: "intent-4b",
      tenantId: "tenant-1",
      orderId: "ORD-4",
      releaseAttemptId: "attempt-2",
      attemptNumber: 2,
      destinationType: "supplier_payout",
      wiseProfileId: "profile-1",
      idempotencyKey: "key-4b",
      wiseIdempotenceUuid: "550e8400-e29b-41d4-a716-446655440004",
      transferId: null,
      quoteId: null,
      providerStatus: "intent_created",
      providerStatusAtUtc: "2026-02-13T10:01:00.000Z",
      lastErrorCode: null,
      lastErrorMessage: null,
      maxPollAttempts: 3,
      createdByRole: "admin",
      createdById: "admin-1",
    },
    deps
  );

  const latest = await getLatestWiseTransferIntentForOrder("ORD-4", deps);
  assert(latest?.intentId === "intent-4b", "Expected latest intent by createdAt desc");
}

async function run() {
  await testCreateAndTransitionLifecycle();
  await testTimeoutBlocksAutoRetry();
  await testInvalidTransitionRejected();
  await testLatestByOrder();
}

run();
