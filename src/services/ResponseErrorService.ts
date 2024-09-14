import { Response } from "express";

export class ResponseErrorService {
  private response: Response;

  constructor(response: Response) {
    this.response = response;
  }

  send(error: any) {
    this.response.status(this.getStatus(error)).send(this.getMessage(error));
  }

  private getMessage(error: any) {
    switch (error?.code) {
      case "P2002":
        return `Unique constraint failed on the '${error?.meta?.target}'`;
      case "P1001":
        return `Can't reach database server`;
      case undefined:
        return error?.message.split(/\r?\n/).pop();
      default:
        return error?.code + "::\n\n" + JSON.stringify(error?.meta, null, 2);
    }
  }

  private getStatus(error: any) {
    switch (error?.code) {
      case "P2002":
        return 422;
      case "P1001":
        return 503;
      default:
        return 500;
    }
  }
}
