import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { getSeedEmailTemplates } from "../../../../../lib/email/seedTemplates";
import { getEmailTemplate, insertEmailTemplate } from "../../../../../lib/email/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templates = getSeedEmailTemplates();
  const summary = { created: 0, skipped: 0 };

  try {
    for (const template of templates) {
      const existing = await getEmailTemplate(template.templateId, template.version);
      if (existing) {
        summary.skipped += 1;
        continue;
      }
      await insertEmailTemplate(template);
      summary.created += 1;
    }

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to seed email templates" },
      { status: 500 }
    );
  }
}
