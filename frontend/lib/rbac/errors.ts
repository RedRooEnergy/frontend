export class AccessDeniedError extends Error {
  status = 403;

  constructor(message: string) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

