import { CoreRole } from "./roles";

export interface ActorContext {
  readonly actorId: string;
  readonly role: CoreRole;
  readonly source: "SYSTEM" | "REQUEST";
}
