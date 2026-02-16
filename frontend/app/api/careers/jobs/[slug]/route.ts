import { NextResponse } from "next/server";
import { getJobBySlug } from "../../../../../lib/careers/store";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const job = await getJobBySlug(params.slug);
  if (!job || job.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ job });
}
