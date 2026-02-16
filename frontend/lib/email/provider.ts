import "server-only";
import nodemailer from "nodemailer";

export type EmailSendPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailProvider {
  send(payload: EmailSendPayload): Promise<string>;
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

function buildFromAddress() {
  const from = process.env.SMTP_FROM || "";
  const fromName = process.env.SMTP_FROM_NAME || "";
  if (!from) return "";
  if (!fromName) return from;
  return `${fromName} <${from}>`;
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST || "";
  const portRaw = process.env.SMTP_PORT || "";
  const from = buildFromAddress();
  if (!host || !portRaw || !from) return null;
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) return null;
  const secure = (process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  const user = process.env.SMTP_USER || undefined;
  const pass = process.env.SMTP_PASS || undefined;
  return { host, port, secure, user, pass, from };
}

export class DevEmailProvider implements EmailProvider {
  async send(payload: EmailSendPayload): Promise<string> {
    // dev-safe provider: no external send
    // eslint-disable-next-line no-console
    console.log("[email:dev]", {
      to: payload.to,
      subject: payload.subject,
    });
    return `dev-${Date.now()}`;
  }
}

export class SmtpEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(config: SmtpConfig) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  async send(payload: EmailSendPayload): Promise<string> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return info.messageId || `smtp-${Date.now()}`;
  }
}

export function createEmailProvider(): EmailProvider {
  const mode = (process.env.EMAIL_PROVIDER || "auto").toLowerCase();
  const smtpConfig = readSmtpConfig();

  if (mode === "smtp") {
    if (!smtpConfig) {
      throw new Error("EMAIL_PROVIDER=smtp requires SMTP_HOST, SMTP_PORT, SMTP_FROM");
    }
    return new SmtpEmailProvider(smtpConfig);
  }

  if (mode === "dev") {
    return new DevEmailProvider();
  }

  if (smtpConfig) {
    return new SmtpEmailProvider(smtpConfig);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SMTP configuration missing in production.");
  }

  return new DevEmailProvider();
}
