import { getDb } from "../db/mongo";

type ChatRateLimitRecord = {
  _id?: string;
  key: string;
  actorId: string;
  threadId: string;
  windowBucket: number;
  count: number;
  expiresAt: Date;
};

const COLLECTION = "chat_rate_limits";
let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db.collection<ChatRateLimitRecord>(COLLECTION).createIndex({ key: 1 }, { unique: true, name: "chat_rate_key_unique" });
      await db.collection<ChatRateLimitRecord>(COLLECTION).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "chat_rate_ttl" });
      await db.collection<ChatRateLimitRecord>(COLLECTION).createIndex({ actorId: 1, windowBucket: -1 }, { name: "chat_rate_actor_bucket" });
    })();
  }
  await indexesReady;
}

export async function checkChatSendRateLimit(input: {
  actorId: string;
  threadId: string;
  nowMs?: number;
  windowSeconds?: number;
  maxPerWindow?: number;
}) {
  await ensureIndexes();
  const db = await getDb();

  const nowMs = input.nowMs || Date.now();
  const windowSeconds = Math.min(Math.max(Number(input.windowSeconds || 60), 1), 3600);
  const maxPerWindow = Math.min(Math.max(Number(input.maxPerWindow || 20), 1), 500);

  const bucket = Math.floor(nowMs / (windowSeconds * 1000));
  const key = `${input.actorId}:${input.threadId}:${bucket}`;

  const expiresAt = new Date((bucket + 1) * windowSeconds * 1000 + 5_000);

  const result = await db.collection<ChatRateLimitRecord>(COLLECTION).findOneAndUpdate(
    { key },
    {
      $setOnInsert: {
        key,
        actorId: input.actorId,
        threadId: input.threadId,
        windowBucket: bucket,
        expiresAt,
      },
      $inc: { count: 1 },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  const current = Number(result?.count || 0);
  const allowed = current <= maxPerWindow;

  return {
    allowed,
    current,
    maxPerWindow,
    windowSeconds,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(((bucket + 1) * windowSeconds * 1000 - nowMs) / 1000)),
  };
}
