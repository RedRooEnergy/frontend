import { NextResponse, type NextRequest } from "next/server";
import { createContactRequest, findProfileBySlug, isContactChannel } from "../../../../lib/public-sites/store";
import { mapEntityPathToType } from "../../../../lib/public-sites/services/PublicSiteService";
import { sha256Hex } from "../../../../lib/public-sites/services/hash";
import {
  dispatchPublicContactEmail,
  dispatchPublicContactWeChat,
} from "../../../../lib/public-sites/dispatch/publicContactDispatch";
import { updateContactDispatchStatus } from "../../../../lib/public-sites/store";
import { getActorFromRequest } from "../../../../lib/auth/request";

function sanitizeString(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      entityType?: string;
      slug?: string;
      name?: string;
      email?: string;
      message?: string;
      channel?: string;
    };

    const entityType = mapEntityPathToType(String(body.entityType || ""));
    const slug = sanitizeString(body.slug, 120).toLowerCase();
    const name = sanitizeString(body.name, 120);
    const email = sanitizeString(body.email, 180);
    const message = sanitizeString(body.message, 5000);
    const channel = String(body.channel || "EMAIL").toUpperCase();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "name, email, and message are required" }, { status: 400 });
    }

    if (!isContactChannel(channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }

    const profile = findProfileBySlug(entityType, slug);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const actor = getActorFromRequest(request);
    const record = createContactRequest({
      entityId: profile.entityId,
      entityType,
      buyerId: actor?.userId || null,
      name,
      email,
      message,
      channel,
    });

    const dispatchPayload = JSON.stringify({
      v: 1,
      contactRequestId: record.id,
      entityId: profile.entityId,
      entityType,
      channel,
      name,
      email,
      message,
    });
    const dispatchHash = sha256Hex(dispatchPayload);

    try {
      if (channel === "EMAIL") {
        await dispatchPublicContactEmail({ recordId: record.id, dispatchHash });
      } else {
        await dispatchPublicContactWeChat({ recordId: record.id, dispatchHash });
      }
      updateContactDispatchStatus(record.id, "SENT", dispatchHash);
    } catch {
      updateContactDispatchStatus(record.id, "FAILED", dispatchHash);
      return NextResponse.json({ error: "Dispatch failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
