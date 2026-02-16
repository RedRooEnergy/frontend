import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db/mongo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ ok: true, db: db.databaseName, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Mongo ping failed" },
      { status: 500 }
    );
  }
}
