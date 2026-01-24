export interface RequestContext {
  readonly requestId: string;
  readonly actor: {
    readonly actorId: string;
    readonly role: string;
    readonly source: string;
  };
}
