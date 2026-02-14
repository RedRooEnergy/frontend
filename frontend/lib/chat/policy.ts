import type { ChatActor, ChatRelatedEntityContext, ChatThreadRecord, ChatThreadType } from "./types";

function isParticipant(actor: ChatActor, thread: ChatThreadRecord) {
  return thread.participants.some((participant) => participant.userId === actor.actorId && participant.role === actor.actorRole);
}

function isEscalatedOrLocked(thread: ChatThreadRecord) {
  return thread.status === "ESCALATED" || thread.status === "LOCKED";
}

export function canCreateThread(actor: ChatActor, threadType: ChatThreadType, relatedEntity: ChatRelatedEntityContext) {
  if (actor.actorRole === "ADMIN") return true;

  if (actor.actorRole === "BUYER") {
    if (!(threadType === "PRODUCT_INQUIRY" || threadType === "ORDER")) return false;

    if (threadType === "ORDER") {
      if (relatedEntity.relatedEntityType !== "ORDER" || !relatedEntity.relatedEntityId) return false;
      const ownerMatch =
        String(relatedEntity.ownerBuyerId || "").trim() === actor.actorId ||
        String(relatedEntity.ownerBuyerEmail || "").trim().toLowerCase() === actor.actorEmail;
      return ownerMatch;
    }

    return relatedEntity.relatedEntityType === "PRODUCT" && Boolean(relatedEntity.relatedEntityId);
  }

  if (actor.actorRole === "SUPPLIER") {
    if (threadType === "PRODUCT_INQUIRY") {
      return (
        relatedEntity.relatedEntityType === "PRODUCT" &&
        Boolean(relatedEntity.relatedEntityId) &&
        String(relatedEntity.supplierId || "").trim() === actor.actorId
      );
    }

    if (threadType === "ORDER") {
      if (relatedEntity.relatedEntityType !== "ORDER" || !relatedEntity.relatedEntityId) return false;
      const inParticipants = (relatedEntity.participantIds || []).some((entry) => entry === actor.actorId);
      return String(relatedEntity.supplierId || "").trim() === actor.actorId || inParticipants;
    }

    return false;
  }

  if (actor.actorRole === "FREIGHT") {
    if (threadType !== "FREIGHT") return false;
    if (!relatedEntity.relatedEntityId) return false;
    if (relatedEntity.relatedEntityType !== "ORDER" && relatedEntity.relatedEntityType !== "CASE") return false;
    return (relatedEntity.participantIds || []).length === 0 || (relatedEntity.participantIds || []).includes(actor.actorId);
  }

  if (actor.actorRole === "SERVICE_PARTNER") {
    if (!(threadType === "COMPLIANCE" || threadType === "WARRANTY")) return false;
    if (!relatedEntity.relatedEntityId) return false;
    if (
      relatedEntity.relatedEntityType !== "CASE" &&
      relatedEntity.relatedEntityType !== "WARRANTY_INCIDENT" &&
      relatedEntity.relatedEntityType !== "ORDER"
    ) {
      return false;
    }
    return (relatedEntity.participantIds || []).length === 0 || (relatedEntity.participantIds || []).includes(actor.actorId);
  }

  return false;
}

export function canReadThread(actor: ChatActor, thread: ChatThreadRecord) {
  if (actor.actorRole === "ADMIN") return true;
  if (actor.actorRole === "REGULATOR") {
    return thread.status === "ESCALATED" || thread.status === "LOCKED";
  }
  return isParticipant(actor, thread);
}

export function canPostMessage(actor: ChatActor, thread: ChatThreadRecord) {
  if (actor.actorRole === "REGULATOR") return false;
  if (!canReadThread(actor, thread)) return false;
  return thread.status !== "LOCKED";
}

export function canLockThread(actor: ChatActor, thread: ChatThreadRecord) {
  if (actor.actorRole !== "ADMIN") return false;
  return thread.status !== "LOCKED" && thread.status !== "ARCHIVED";
}

export function canEscalateThread(actor: ChatActor, thread: ChatThreadRecord) {
  if (actor.actorRole === "ADMIN") return true;
  if (actor.actorRole === "REGULATOR") return false;
  return isParticipant(actor, thread) && !isEscalatedOrLocked(thread);
}

export function canExportThread(actor: ChatActor, thread: ChatThreadRecord) {
  if (actor.actorRole === "ADMIN") return true;
  if (actor.actorRole === "REGULATOR") return thread.status === "ESCALATED" || thread.status === "LOCKED";
  return false;
}
