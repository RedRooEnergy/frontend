import { Db, MongoClient } from "mongodb";
import { env } from "../config/env";

let clientPromise: Promise<MongoClient> | null = null;
let dbPromise: Promise<Db> | null = null;

async function getClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const client = new MongoClient(env.mongoUri, {
      maxPoolSize: 20,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = client.connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export async function connectDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const client = await getClient();
      const db = client.db(env.mongoDbName);
      await db.command({ ping: 1 });
      return db;
    })().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function getDb(): Promise<Db> {
  return connectDb();
}

export async function disconnectDb(): Promise<void> {
  if (!clientPromise) return;

  const client = await clientPromise;
  await client.close();
  clientPromise = null;
  dbPromise = null;
}
