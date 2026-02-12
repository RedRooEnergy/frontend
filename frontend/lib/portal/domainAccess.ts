import { DOMAIN_SUBJECTS, listActorActions } from "../rbac/matrix";
import type { Actor, DashboardDomain } from "../rbac/types";

export function canActorReadDomain(actor: Actor, domain: DashboardDomain) {
  return DOMAIN_SUBJECTS[domain].some((subject) => listActorActions(actor, subject).includes("READ"));
}

