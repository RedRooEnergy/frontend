import { createDispatchEvent } from "../store";

export async function dispatchPublicContactEmail(input: { recordId: string; dispatchHash: string }) {
  return createDispatchEvent({
    eventCode: "PUBLIC_SITE_CONTACT_REQUESTED_EMAIL",
    refType: "PublicContactRequest",
    refId: String(input.recordId),
    dispatchHash: input.dispatchHash,
  });
}

export async function dispatchPublicContactWeChat(input: { recordId: string; dispatchHash: string }) {
  return createDispatchEvent({
    eventCode: "PUBLIC_SITE_CONTACT_REQUESTED_WECHAT",
    refType: "PublicContactRequest",
    refId: String(input.recordId),
    dispatchHash: input.dispatchHash,
  });
}
