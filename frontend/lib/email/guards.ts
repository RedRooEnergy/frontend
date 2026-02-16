import crypto from "crypto";
import { EMAIL_EVENT_META, EmailEventCode, EmailRecipientRole, isValidEventCode } from "./events";

export function requireValidEventCode(eventCode: string): asserts eventCode is EmailEventCode {
  if (!isValidEventCode(eventCode)) {
    throw new Error(`EMAIL_GOVERNANCE_VIOLATION: Unknown eventCode "${eventCode}"`);
  }
}

export function requirePermittedRecipientRole(eventCode: EmailEventCode, role: EmailRecipientRole) {
  const meta = EMAIL_EVENT_META[eventCode];
  if (!meta.roles.includes(role)) {
    throw new Error(`EMAIL_GOVERNANCE_VIOLATION: role "${role}" not permitted for ${eventCode}`);
  }
}

export function forbidRegulatorAutoSend(role: EmailRecipientRole) {
  if (role === "regulator") {
    throw new Error("EMAIL_GOVERNANCE_VIOLATION: Regulator auto-send forbidden");
  }
}

export function buildIdempotencyKey(input: {
  eventCode: EmailEventCode;
  recipientUserId: string;
  stableEntityKey: string;
}) {
  const { eventCode, recipientUserId, stableEntityKey } = input;
  if (!recipientUserId || !stableEntityKey) {
    throw new Error("EMAIL_GOVERNANCE_VIOLATION: Missing idempotency inputs");
  }
  return crypto
    .createHash("sha256")
    .update(`${eventCode}::${recipientUserId}::${stableEntityKey}`, "utf8")
    .digest("hex");
}

export type ScopeResolvers = {
  isBuyerSelf: (args: {
    recipientUserId: string;
    recipientEmail?: string;
    entityRefs: Record<string, string>;
  }) => Promise<boolean>;
  isSupplierUserForSupplier: (args: {
    recipientUserId: string;
    recipientEmail?: string;
    entityRefs: Record<string, string>;
  }) => Promise<boolean>;
  isPartnerUserForPartner: (args: {
    recipientUserId: string;
    recipientEmail?: string;
    entityRefs: Record<string, string>;
  }) => Promise<boolean>;
  isAdminUser: (args: { recipientUserId: string; recipientEmail?: string }) => Promise<boolean>;
};

export async function requireRecipientScope(input: {
  role: EmailRecipientRole;
  recipientUserId: string;
  recipientEmail?: string;
  entityRefs: Record<string, string>;
  scopeResolvers: ScopeResolvers;
}) {
  const { role, recipientUserId, recipientEmail, entityRefs, scopeResolvers } = input;
  if (!scopeResolvers) throw new Error("EMAIL_GOVERNANCE_VIOLATION: scopeResolvers missing");

  if (role === "buyer") {
    const ok = await scopeResolvers.isBuyerSelf({ recipientUserId, recipientEmail, entityRefs });
    if (!ok) throw new Error("EMAIL_GOVERNANCE_VIOLATION: buyer scope mismatch");
    return;
  }
  if (role === "supplier") {
    const ok = await scopeResolvers.isSupplierUserForSupplier({ recipientUserId, recipientEmail, entityRefs });
    if (!ok) throw new Error("EMAIL_GOVERNANCE_VIOLATION: supplier scope mismatch");
    return;
  }
  if (role === "service-partner") {
    const ok = await scopeResolvers.isPartnerUserForPartner({ recipientUserId, recipientEmail, entityRefs });
    if (!ok) throw new Error("EMAIL_GOVERNANCE_VIOLATION: service partner scope mismatch");
    return;
  }
  if (role === "admin") {
    const ok = await scopeResolvers.isAdminUser({ recipientUserId, recipientEmail });
    if (!ok) throw new Error("EMAIL_GOVERNANCE_VIOLATION: admin scope mismatch");
    return;
  }
  throw new Error("EMAIL_GOVERNANCE_VIOLATION: unsupported recipient role");
}
