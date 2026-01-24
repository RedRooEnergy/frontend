import { ActorContext } from "./actor-context";
import { CoreRole } from "./roles";

export function buildSystemActor(): ActorContext {
  return Object.freeze({
    actorId: "system",
    role: CoreRole.SYSTEM,
    source: "SYSTEM",
  });
}

export function buildActorContext(): ActorContext {
  return buildSystemActor();
}
