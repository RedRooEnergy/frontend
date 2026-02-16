import { NextResponse } from "next/server";
import { createPasswordResetCode } from "../../../../../lib/passwordResetStore";

export const runtime = "nodejs";

const EMAIL_TTL_MINUTES = 15;

async function sendResetEmail(email: string, code: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM;
  if (!apiKey || !from) {
    throw new Error("Missing SENDGRID_API_KEY or SENDGRID_FROM.");
  }

  const payload = {
    personalizations: [{ to: [{ email }] }],
    from: { email: from, name: "RedRooEnergy" },
    subject: "Reset your RedRooEnergy password",
    content: [
      {
        type: "text/plain",
        value: `Your password reset code is ${code}. It expires in ${EMAIL_TTL_MINUTES} minutes.`,
      },
    ],
  };

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SendGrid error: ${text}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const { code, expiresAt } = createPasswordResetCode(email);
    const emailReady = Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM);
    const allowDevBypass = process.env.NODE_ENV !== "production";

    if (!emailReady) {
      if (allowDevBypass) {
        return NextResponse.json({ ok: true, expiresAt, devMode: true, code });
      }
      throw new Error("Missing SENDGRID_API_KEY or SENDGRID_FROM.");
    }

    await sendResetEmail(email, code);

    return NextResponse.json({ ok: true, expiresAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to send reset email." }, { status: 500 });
  }
}
