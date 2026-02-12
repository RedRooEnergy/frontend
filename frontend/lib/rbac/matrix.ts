import { DOMAIN_SUBJECTS } from "./defaults";
import { getEffectiveActions, getRoleActions } from "./runtimeStore";
import type { Action, Actor, Subject } from "./types";

export { DOMAIN_SUBJECTS };

export function listRoleActions(role: Actor["role"], subject: Subject): Action[] {
  return getRoleActions(role, subject);
}

export function listActorActions(actor: Actor, subject: Subject): Action[] {
  return getEffectiveActions(actor.userId, subject);
}

