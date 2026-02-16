import { NextResponse } from "next/server";
import { createMfaChallenge } from "../../../../../lib/mfaStore";

export const runtime = "nodejs";

const EMAIL_TTL_MINUTES = 10;

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("+")) return `+${trimmed.replace(/[^\d]/g, "")}`;
  return trimmed.replace(/[^\d+]/g, "");
}

function validateRole(role: string) {
  return ["buyer", "supplier", "service-partner", "freight", "regulator", "admin"].includes(role);
}

async function sendEmailCode(email: string, code: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM;
  if (!apiKey || !from) {
    throw new Error("Missing SENDGRID_API_KEY or SENDGRID_FROM.");
  }

  const payload = {
    personalizations: [{ to: [{ email }] }],
    from: { email: from, name: "RedRooEnergy" },
    subject: "Your RedRooEnergy verification code",
    content: [
      {
        type: "text/plain",
        value: `Your verification code is ${code}. It expires in ${EMAIL_TTL_MINUTES} minutes.`,
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

async function sendSmsCode(phone: string, code: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!accountSid || !authToken || !from) {
    throw new Error("Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM.");
  }

  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: `Your RedRooEnergy verification code is ${code}. It expires in ${EMAIL_TTL_MINUTES} minutes.`,
  });

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error: ${text}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "").trim();
    const phone = normalizePhone(String(body.phone || ""));

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    if (!validateRole(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (!phone || !/^\+\d{7,15}$/.test(phone)) {
      return NextResponse.json({ error: "Valid phone number required." }, { status: 400 });
    }

    const { emailCode, smsCode, expiresAt } = createMfaChallenge(email, role, phone);

    const emailReady = Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM);
    const smsReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
    const allowDevBypass = process.env.NODE_ENV !== "production";

    if (!emailReady || !smsReady) {
      if (allowDevBypass) {
        return NextResponse.json({ ok: true, expiresAt, devMode: true, emailCode, smsCode });
      }
      if (!emailReady) {
        throw new Error("Missing SENDGRID_API_KEY or SENDGRID_FROM.");
      }
      if (!smsReady) {
        throw new Error("Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM.");
      }
    }

    await Promise.all([sendEmailCode(email, emailCode), sendSmsCode(phone, smsCode)]);

    return NextResponse.json({ ok: true, expiresAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to send verification codes." }, { status: 500 });
  }
}
