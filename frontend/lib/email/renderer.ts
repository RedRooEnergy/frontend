import crypto from "crypto";

export type EmailTemplateContent = {
  subjectTemplate: string;
  bodyTemplateHtml: string;
  bodyTemplateText: string;
  allowedVariables: string[];
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function applyTemplate(template: string, variables: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in variables)) {
      throw new Error(`EMAIL_TEMPLATE_VIOLATION: missing variable "${key}"`);
    }
    return String(variables[key]);
  });
}

export function renderTemplate(template: EmailTemplateContent, variables: Record<string, string | number>) {
  Object.keys(variables).forEach((key) => {
    if (!template.allowedVariables.includes(key)) {
      throw new Error(`EMAIL_TEMPLATE_VIOLATION: variable "${key}" not allowed`);
    }
  });

  const subject = applyTemplate(template.subjectTemplate, variables);
  const html = applyTemplate(template.bodyTemplateHtml, variables);
  const text = applyTemplate(template.bodyTemplateText, variables);
  const hash = sha256(`${subject}\n${html}\n${text}`);

  return { subject, html, text, hash };
}
