import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db/mongo";

export const runtime = "nodejs";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productType = searchParams.get("productType")?.trim();
  const modelNumber = searchParams.get("modelNumber")?.trim();
  const manufacturerName = searchParams.get("manufacturerName")?.trim();

  if (!productType || !modelNumber) {
    return NextResponse.json({ ok: false, error: "productType and modelNumber are required" }, { status: 400 });
  }

  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ ok: false, error: "CEC cache unavailable" }, { status: 503 });
  }

  try {
    const db = await getDb();
    const modelRegex = new RegExp(`^${escapeRegex(modelNumber)}$`, "i");
    const manufacturerRegex = manufacturerName
      ? new RegExp(`^${escapeRegex(manufacturerName)}$`, "i")
      : null;

    const query: Record<string, unknown> = {
      productType,
      modelNumber: modelRegex,
      approvalStatus: { $ne: "EXPIRED" },
    };

    if (manufacturerRegex) {
      query.$or = [{ manufacturerName: manufacturerRegex }, { brandName: manufacturerRegex }];
    }

    const record = await db.collection("cec_approved_products").findOne(query);
    if (!record) {
      return NextResponse.json({ ok: true, matched: false });
    }

    const approvalStatus = String(record.approvalStatus || "").toUpperCase();
    const blocked = ["EXPIRED", "WITHDRAWN", "SUSPENDED", "REJECTED"].includes(approvalStatus);

    return NextResponse.json({
      ok: true,
      matched: !blocked,
      status: approvalStatus || "UNKNOWN",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "CEC validation failed" }, { status: 500 });
  }
}
