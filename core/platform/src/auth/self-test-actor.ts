import { buildSystemActor } from "./build-actor-context";

const actor = buildSystemActor();

try {
  // @ts-expect-error immutability test
  actor.actorId = "tampered";
  console.error("ERROR: actor context should be immutable");
} catch {
  console.log("EXPECTED ERROR: ActorContext is immutable");
}

console.log("ActorContext:", actor);
