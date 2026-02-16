import { NextResponse } from "next/server";
import { checkRateLimit } from "../../../../lib/careers/rateLimit";
import { validateApplication } from "../../../../lib/careers/validation";
import { buildApplicationRecord, addApplication, getJobById, getJobBySlug } from "../../../../lib/careers/store";
import type { CareerApplicationInput, CareerAttachment } from "../../../../lib/careers/types";
import { notifyApplicant, notifyAdmin } from "../../../../lib/careers/notifications";
import { queueVirusScan } from "../../../../lib/careers/virusScan";

const MAX_SUPPORTING_FILES = 3;

function getClientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const rate = await checkRateLimit(ip, 10 * 60 * 1000, 8);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await request.json()) as CareerApplicationInput & { captchaToken?: string };

  if (process.env.CAREERS_CAPTCHA_ENABLED === "true" && !body.captchaToken) {
    return NextResponse.json({ error: "Captcha required" }, { status: 400 });
  }

  const requireResume = body.type === "job";
  const errors = validateApplication(body, requireResume);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const supporting = (body.attachments || []).filter((att) => att.kind === "supporting");
  if (supporting.length > MAX_SUPPORTING_FILES) {
    return NextResponse.json({ error: "Too many supporting documents" }, { status: 400 });
  }

  let job = null;
  if (body.type === "job") {
    if (body.jobId) job = await getJobById(body.jobId);
    if (!job && body.jobSlug) job = await getJobBySlug(body.jobSlug);
    if (!job || job.status !== "published") {
      return NextResponse.json({ error: "Job not available" }, { status: 404 });
    }
  }

  const attachments: CareerAttachment[] = (body.attachments || []).map((att) => ({
    ...att,
    fileSize: Number(att.fileSize) || 0,
    uploadedAt: att.uploadedAt || new Date().toISOString(),
  }));

  const record = buildApplicationRecord({
    input: {
      jobId: job?.id || null,
      jobSlug: job?.slug || null,
      jobTitle: job?.title || null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      locationCity: body.locationCity,
      locationCountry: body.locationCountry,
      workRights: body.workRights,
      roleOfInterest: body.roleOfInterest || job?.title || "Talent pool",
      linkedinUrl: body.linkedinUrl,
      portfolioUrl: body.portfolioUrl,
      salaryExpectation: body.salaryExpectation,
      startDate: body.startDate,
      coverLetterText: body.coverLetterText,
      source: body.source,
      consent: body.consent,
      attachments,
    },
    type: body.type,
  });

  await addApplication(record);
  await queueVirusScan(attachments.map((att) => att.storageKey));

  const adminEmail = process.env.CAREERS_ADMIN_EMAIL || "admin@redrooenergy.com";
  await Promise.all([
    notifyApplicant(record.email, record.referenceId),
    notifyAdmin(adminEmail, record.referenceId, record.roleOfInterest),
  ]);

  return NextResponse.json({
    ok: true,
    referenceId: record.referenceId,
    message: "Application received",
    nextSteps: "We will review your application and contact you if there is a match.",
  });
}
