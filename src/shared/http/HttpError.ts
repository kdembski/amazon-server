// An error that ResponseErrorService answers with `status`
export class HttpError extends Error {
  readonly status;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
