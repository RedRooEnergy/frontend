import { ErrorCode } from "./error-codes";

export class CoreError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly requestId: string;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus: number,
    requestId: string
  ) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.requestId = requestId;
    Object.freeze(this);
  }
}
