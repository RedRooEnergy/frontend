import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import { getEmailTemplate } from "../../../../../lib/email/store";
import { renderTemplate } from "../../../../../lib/email/renderer";

export const runtime = "nodejs";

function buildPreviewVariables(allowed: string[], eventCode: string) {
  const map: Record<string, string> = {};
  for (const key of allowed) {
    if (key === "recipientName") map[key] = "RRE Admin";
    else if (key === "eventCode") map[key] = eventCode;
    else if (key === "referenceId") map[key] = "REF-0001";
    else if (key === "referenceUrl") map[key] = "https://redrooenergy.com";
    else if (key === "actionRequired") map[key] = "No action required";
    else map[key] = `Sample ${key}`;
  }
  return map;
}

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("templateId");
  const version = searchParams.get("version");
  if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });

  const template = await getEmailTemplate(templateId, version ? Number(version) : undefined);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const variables = buildPreviewVariables(template.allowedVariables, template.eventCode);
  const rendered = renderTemplate(
    {
      subjectTemplate: template.subjectTemplate,
      bodyTemplateHtml: template.bodyTemplateHtml,
      bodyTemplateText: template.bodyTemplateText,
      allowedVariables: template.allowedVariables,
    },
    variables
  );

  return NextResponse.json({
    templateId: template.templateId,
    eventCode: template.eventCode,
    roleScope: template.roleScope,
    language: template.language,
    version: template.version,
    variables,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    hash: rendered.hash,
  });
}
